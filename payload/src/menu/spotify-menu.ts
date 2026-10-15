// Spotify's side of our menu: notices its context menus as they open (body childList only), hides them with CSS
// while keeping them mounted and working, opens and closes their submenus, and closes them. Hiding happens in the
// observer callback (a microtask, before paint), so Spotify's menu never flashes; the owner hears about it a frame later.
import { readMenu, type CapturedItem, type CapturedMenu } from './capture'
import { CONTEXT_MENU, MENU_LIST, POPOVER_ROOT } from './selectors'

export interface SpotifyMenu {
  /** The top-level ul[role=menu]. */
  readonly list: HTMLElement
  read(): CapturedMenu
  /** Items changed while open (e.g. a label that loads late). */
  onChange(fn: () => void): void
  onClosed(fn: () => void): void
  /** A submenu Spotify closed by itself. */
  onSubClosed(fn: (depth: number) => void): void
  /** Opens one of Spotify's (hidden) submenus; null when none appeared. */
  openSub(item: CapturedItem, depth: number): Promise<HTMLElement | null>
  closeSub(item: CapturedItem): void
  /** Closes Spotify's menu (after our menu closed). */
  close(): void
  /** Gives up on this menu: Spotify's own is shown again, submenus included. */
  release(): void
}

const HIDDEN = 'data-sc-menu-hidden'
const STYLE_ID = 'sc-menu-hide'
const HIDE_CSS = `${POPOVER_ROOT}[${HIDDEN}] { opacity: 0 !important; pointer-events: none !important; }`
const SUB_TIMEOUT_MS = 1000

interface Sub {
  root: HTMLElement
  list: HTMLElement
}

interface Session extends SpotifyMenu {
  root: HTMLElement
  ended: boolean
  released: boolean
  subs: Map<number, Sub>
  addSub(depth: number, sub: Sub): void
  removed(root: HTMLElement): void
  end(): void
}

let warnedClose = false

function createSession(root: HTMLElement, list: HTMLElement): Session {
  const changed: (() => void)[] = []
  const closed: (() => void)[] = []
  const subClosed: ((depth: number) => void)[] = []
  const waiters = new Map<number, (list: HTMLElement | null) => void>()
  let frame = 0
  // Spotify 1.3.4 mounts submenus inside the parent's row (li > [data-tippy-root]), not on <body>.
  const syncNested = () => {
    for (const sub of root.querySelectorAll<HTMLElement>(`${POPOVER_ROOT} ${MENU_LIST}`)) {
      const depth = Number(sub.getAttribute('data-depth') ?? '0')
      const subRoot = sub.closest<HTMLElement>(POPOVER_ROOT)
      if (depth > 0 && subRoot && subRoot !== root && s.subs.get(depth)?.root !== subRoot) s.addSub(depth, { root: subRoot, list: sub })
    }
    for (const sub of [...s.subs.values()]) if (!sub.root.isConnected) s.removed(sub.root)
  }
  const content = new MutationObserver(() => {
    if (!s.ended) syncNested()
    if (frame === 0)
      frame = requestAnimationFrame(() => {
        frame = 0
        if (!s.ended) for (const fn of changed) fn()
      })
  })
  content.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-disabled', 'aria-checked'] })

  const escape = (target: HTMLElement) => {
    for (const type of ['keydown', 'keyup'])
      target.dispatchEvent(new KeyboardEvent(type, { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true }))
  }

  const s: Session = {
    root,
    list,
    ended: false,
    released: false,
    subs: new Map(),
    read: () => readMenu(list),
    onChange: fn => changed.push(fn),
    onClosed: fn => closed.push(fn),
    onSubClosed: fn => subClosed.push(fn),
    openSub(item, depth) {
      if (item.setOpen) item.setOpen(true)
      else item.element.click()
      waiters.get(depth)?.(null)
      return new Promise(resolve => {
        const timeout = window.setTimeout(() => done(null), SUB_TIMEOUT_MS)
        const done = (found: HTMLElement | null) => {
          clearTimeout(timeout)
          if (waiters.get(depth) === done) waiters.delete(depth)
          resolve(found)
        }
        waiters.set(depth, done)
      })
    },
    closeSub(item) {
      item.setOpen?.(false)
    },
    close() {
      if (s.ended || !root.isConnected) return
      escape(list)
      // Fallback: a press outside, which Spotify's menu also closes on; if even that fails, show it again.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (s.ended || !root.isConnected) return
          for (const type of ['pointerdown', 'mousedown']) document.body.dispatchEvent(new MouseEvent(type, { bubbles: true }))
          requestAnimationFrame(() => {
            if (s.ended || !root.isConnected) return
            if (!warnedClose) console.warn("[spotify-custom] couldn't close Spotify's menu; showing it instead")
            warnedClose = true
            s.release()
          })
        }),
      )
    },
    release() {
      s.released = true
      root.removeAttribute(HIDDEN)
      for (const sub of s.subs.values()) sub.root.removeAttribute(HIDDEN)
    },
    addSub(depth, sub) {
      if (!s.released) sub.root.setAttribute(HIDDEN, '')
      s.subs.set(depth, sub)
      waiters.get(depth)?.(sub.list)
    },
    removed(r) {
      for (const [depth, sub] of s.subs) {
        if (sub.root !== r) continue
        s.subs.delete(depth)
        for (const fn of subClosed) fn(depth)
      }
    },
    end() {
      if (s.ended) return
      s.ended = true
      cancelAnimationFrame(frame)
      content.disconnect()
      for (const done of [...waiters.values()]) done(null)
      for (const fn of closed) fn()
    },
  }
  root.setAttribute(HIDDEN, '')
  return s
}

/** Calls `opened` for every context menu Spotify opens until the returned stop function runs. */
export function watchMenus(opened: (menu: SpotifyMenu) => void): () => void {
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = HIDE_CSS
  document.getElementById(STYLE_ID)?.remove()
  document.head.append(style)

  let current: Session | null = null
  let frame = 0
  /** Popover roots whose content hasn't rendered yet (also tooltips, which never get a menu). */
  const pending = new Set<HTMLElement>()

  const classify = (root: HTMLElement): boolean => {
    const list = root.querySelector<HTMLElement>(MENU_LIST)
    if (!list) return false
    const depth = Number(list.getAttribute('data-depth') ?? '0')
    if (depth === 0) {
      if (!root.querySelector(CONTEXT_MENU)) return true // a dropdown, not a context menu: leave it alone
      current?.end()
      const session = createSession(root, list)
      current = session
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (!session.ended) opened(session)
      })
    } else if (current && !current.ended) current.addSub(depth, { root, list })
    return true
  }

  const watchPending = () => {
    pendingObserver.disconnect()
    for (const root of pending) pendingObserver.observe(root, { childList: true, subtree: true })
  }
  const pendingObserver = new MutationObserver(() => {
    let changed = false
    for (const root of pending) {
      if (classify(root)) {
        pending.delete(root)
        changed = true
      }
    }
    if (changed) watchPending()
  })

  const bodyObserver = new MutationObserver(records => {
    let changed = false
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof HTMLElement && node.matches(POPOVER_ROOT) && !classify(node)) {
          pending.add(node)
          changed = true
        }
      }
      for (const node of record.removedNodes) {
        if (!(node instanceof HTMLElement)) continue
        if (pending.delete(node)) changed = true
        if (current?.root === node) {
          current.end()
          current = null
        } else current?.removed(node)
      }
    }
    if (changed) watchPending()
  })
  bodyObserver.observe(document.body, { childList: true })

  return () => {
    cancelAnimationFrame(frame)
    bodyObserver.disconnect()
    pendingObserver.disconnect()
    if (current) {
      current.release()
      current.end()
    }
    current = null
    style.remove()
  }
}
