// An open menu: a stack of panels (the menu, then submenus) in one shadow-DOM host, with hover, click and keyboard
// handling. It never takes focus away from Spotify (its menu must stay open behind ours until an item has run):
// keys are read on window in the capture phase, and presses inside our panels are kept from reaching Spotify's
// outside-click handling. Owners fill the levels (see model.ts) and decide what an item does.
import { h, render } from 'preact'
import type { Entry, Level } from './model'
import { edge, jump, step, type Targets } from './nav'
import { Panel } from './Panel'
import { PANEL_CSS } from './styles'

export type DismissReason = 'escape' | 'outside'

export interface MenuStack {
  /**
   * Shows `level` at `depth`, closing anything deeper. A submenu (depth > 0) is only shown while the parent row it
   * came from (`from`, an entry id) is still the open one, so slow submenus can't land under another row.
   */
  set(depth: number, level: Level, from?: string): boolean
  update(depth: number, patch: Partial<Pick<Level, 'rows' | 'status' | 'search'>>): void
  /** Closes the levels from `depth` on. */
  truncate(depth: number): void
  dispose(): void
}

interface State {
  level: Level
  active: number
  /** The row whose submenu is open, -1 = none. */
  open: number
  query: string
  /** Remounts the panel (and replays its entrance) when a level is replaced. */
  id: number
}

const HOVER_OPEN_MS = 150
const HOVER_CLOSE_MS = 300
/** Events from inside our panels that Spotify must not see (its shortcuts and outside-click handlers listen on document). */
const CONTAINED = ['keydown', 'keyup', 'keypress', 'click', 'dblclick', 'contextmenu', 'pointerup', 'mouseup', 'input', 'wheel'] as const
const PRESSES = ['pointerdown', 'mousedown', 'touchstart'] as const

const entryAt = (s: State, i: number): Entry | null => {
  const row = s.level.rows.at(i)
  return row?.kind === 'item' ? row.entry : null
}

const targetsOf = (s: State): Targets =>
  s.level.status ? [] : s.level.rows.map(r => (r.kind === 'item' && !r.entry.disabled ? r.entry.label : null))

export function openStack(hostId: string, onDismiss: (reason: DismissReason) => void): MenuStack {
  document.getElementById(hostId)?.remove() // left behind by a hot reload
  const host = document.createElement('div')
  host.id = hostId
  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = PANEL_CSS
  const mount = document.createElement('div')
  shadow.append(style, mount)
  document.body.append(host)

  const levels: State[] = []
  let focus = 0
  let keyboard = false
  let pendingFocus: number | null = null
  let timer = 0
  let nextId = 0
  let disposed = false

  const rowEl = (d: number, i: number) => shadow.querySelector<HTMLElement>(`.panel[data-depth="${d}"] [data-i="${i}"]`)

  const draw = () => {
    if (disposed) return
    render(
      h(
        'div',
        { class: 'layer' },
        levels.map((s, d) =>
          h(Panel, {
            key: s.id,
            depth: d,
            rows: s.level.rows,
            label: s.level.label,
            anchor: s.level.anchor,
            active: s.active,
            open: s.open,
            keyboard: keyboard && d === focus,
            search: s.level.search ? s.query : undefined,
            status: s.level.status,
            onHover: (i: number) => hover(d, i),
            onPick: (i: number) => pick(d, i, false),
            onQuery: (text: string) => setQuery(d, text),
          }),
        ),
      ),
      mount,
    )
  }

  const truncate = (depth: number) => {
    if (levels.length <= depth) return
    for (const s of levels.splice(depth).reverse()) s.level.closed?.()
    const parent = depth > 0 ? levels.at(depth - 1) : undefined
    if (parent) parent.open = -1
    focus = Math.min(focus, Math.max(depth - 1, 0))
    draw()
  }

  const openSub = (d: number, i: number, viaKeyboard: boolean) => {
    const s = levels.at(d)
    const entry = s && entryAt(s, i)
    const row = rowEl(d, i)
    if (!s || !entry || !row) return
    pendingFocus = viaKeyboard ? d + 1 : null
    const sub = levels.at(d + 1)
    if (s.open === i && sub) {
      if (viaKeyboard) {
        focus = d + 1
        sub.active = edge(targetsOf(sub), 'first')
      }
      draw()
      return
    }
    truncate(d + 1)
    s.open = i
    s.active = i
    draw()
    const r = row.getBoundingClientRect()
    s.level.open?.(entry, { left: r.left, top: r.top, right: r.right, bottom: r.bottom })
  }

  const pick = (d: number, i: number, viaKeyboard: boolean) => {
    const s = levels.at(d)
    const entry = s && entryAt(s, i)
    if (!s || !entry || entry.disabled) return
    if (entry.submenu) openSub(d, i, viaKeyboard)
    else s.level.activate(entry)
  }

  const hover = (d: number, i: number) => {
    const s = levels.at(d)
    if (!s || (s.active === i && focus === d && !keyboard)) return
    clearTimeout(timer)
    s.active = i
    focus = d
    keyboard = false
    draw()
    const entry = entryAt(s, i)
    if (entry?.submenu && !entry.disabled && s.open !== i) timer = window.setTimeout(() => openSub(d, i, false), HOVER_OPEN_MS)
    else if (s.open >= 0 && s.open !== i) timer = window.setTimeout(() => truncate(d + 1), HOVER_CLOSE_MS)
  }

  const setQuery = (d: number, text: string) => {
    const s = levels.at(d)
    if (!s) return
    s.query = text
    truncate(d + 1)
    s.level.query?.(text)
  }

  const onKey = (e: KeyboardEvent) => {
    const s = levels.at(focus)
    if (!e.isTrusted || !s) return
    const inInput = e.composedPath().some(t => t instanceof HTMLInputElement)
    const targets = targetsOf(s)
    const move = (to: number) => {
      s.active = to
    }
    let handled = true
    switch (e.key) {
      case 'ArrowDown':
        move(step(targets, s.active, 1))
        break
      case 'ArrowUp':
        move(step(targets, s.active, -1))
        break
      case 'Home':
      case 'End':
        if (inInput) handled = false
        else move(edge(targets, e.key === 'Home' ? 'first' : 'last'))
        break
      case 'Enter':
        if (s.active >= 0) pick(focus, s.active, true)
        break
      case 'ArrowRight':
        if (inInput) handled = false
        else if (s.active >= 0 && entryAt(s, s.active)?.submenu) openSub(focus, s.active, true)
        break
      case 'ArrowLeft':
        if (inInput) handled = false
        else if (focus > 0) truncate(focus)
        break
      case 'Escape':
        stop(e)
        onDismiss('escape')
        return
      case 'Tab':
        break
      case 'Backspace':
        if (inInput) handled = false
        else if (s.level.search) setQuery(focus, s.query.slice(0, -1))
        break
      default:
        if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey || inInput) handled = false
        else if (s.level.search) setQuery(focus, s.query + e.key)
        else if (e.key === ' ') {
          if (s.active >= 0) pick(focus, s.active, true)
        } else move(jump(targets, s.active, e.key))
    }
    if (!handled) return
    keyboard = true
    stop(e)
    draw()
  }

  const stop = (e: Event) => {
    e.preventDefault()
    e.stopImmediatePropagation()
  }

  const onPress = (e: Event) => {
    const path = e.composedPath()
    if (path.includes(host)) {
      // Spotify's menu closes on presses outside it; ours count as inside. Inputs still take focus on press.
      e.stopPropagation()
      if (!(path[0] instanceof HTMLInputElement)) e.preventDefault()
    } else if (e.type === 'pointerdown') onDismiss('outside')
  }
  const onResize = () => onDismiss('outside')
  const contain = (e: Event) => {
    e.stopPropagation()
    if (e.type === 'contextmenu') e.preventDefault()
  }

  window.addEventListener('keydown', onKey, true)
  for (const type of PRESSES) window.addEventListener(type, onPress, { capture: true, passive: false })
  window.addEventListener('resize', onResize)
  for (const type of CONTAINED) host.addEventListener(type, contain)

  return {
    set(depth, level, from) {
      if (disposed || depth > levels.length) return false
      const parent = depth > 0 ? levels.at(depth - 1) : undefined
      if (parent && (parent.open < 0 || entryAt(parent, parent.open)?.id !== from)) return false
      const parentOpen = parent?.open ?? -1
      truncate(depth)
      if (parent) parent.open = parentOpen
      const s: State = { level, active: -1, open: -1, query: '', id: nextId++ }
      if (pendingFocus === depth) {
        focus = depth
        s.active = edge(targetsOf(s), 'first')
        if (s.active >= 0) pendingFocus = null // else: still loading, update() lands on the first row
      }
      levels[depth] = s
      draw()
      return true
    },
    update(depth, patch) {
      const s = levels.at(depth)
      if (!s) return
      s.level = { ...s.level, ...patch }
      const targets = targetsOf(s)
      if (s.query || (pendingFocus === depth && focus === depth)) {
        s.active = edge(targets, 'first')
        if (s.active >= 0) pendingFocus = null
      } else if (targets[s.active] == null) s.active = -1
      draw()
    },
    truncate,
    dispose() {
      if (disposed) return
      clearTimeout(timer)
      for (const s of levels.splice(0).reverse()) s.level.closed?.()
      disposed = true
      window.removeEventListener('keydown', onKey, true)
      for (const type of PRESSES) window.removeEventListener(type, onPress, { capture: true })
      window.removeEventListener('resize', onResize)
      render(null, mount)
      host.remove()
    },
  }
}
