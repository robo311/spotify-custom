// One song's shortcut buttons: a shadow-DOM host we add beside Spotify's own buttons. It shows on row hover, focus
// or selection like Spotify's row buttons (always in the player bar), runs the action on click without letting the
// click reach the row (which would select or play it), and confirms with a brief check or explains a failure.
import { Check } from 'lucide-static'
import type { ShortcutAction } from '../types'
import { ACTIONS } from './actions'
import type { Likes } from './likes'
import type { Song } from './song'
import type { ShortcutSource } from './source'
import { showToast } from './toast'

export const HOST_CLASS = 'sc-shortcuts'
const CONFIRM_MS = 1200

const STYLE = `
  :host { display: inline-flex; flex-shrink: 0; align-items: center; margin-inline-end: 8px; opacity: 0; pointer-events: none; }
  :host([hidden]) { display: none; }
  :host([data-always]), :host(:focus-within),
  :host-context([role="row"]:hover), :host-context([role="row"]:focus-within), :host-context([role="row"][aria-selected="true"]) {
    opacity: 1; pointer-events: auto;
  }
  button {
    all: unset; box-sizing: border-box; width: 28px; height: 28px; display: grid; place-items: center;
    border-radius: 6px; color: var(--sc-text-subdued); cursor: pointer;
    transition: color 160ms cubic-bezier(.2, .8, .2, 1);
  }
  button[hidden] { display: none; }
  button:hover { color: var(--sc-text); }
  button:focus-visible { outline: 2px solid var(--sc-accent); outline-offset: -2px; }
  button.on, button.ok { color: var(--sc-accent); }
  button.on svg { fill: currentColor; }
  svg { width: 16px; height: 16px; display: block; }
  @media (prefers-reduced-motion: reduce) { button { transition: none; } }
`

/** Events the row acts on (select, play, keyboard play); they stop at our host. */
const ISOLATED = ['click', 'dblclick', 'keydown'] as const

export interface GroupOptions {
  actions: readonly ShortcutAction[]
  source: ShortcutSource
  likes: Likes
  /** Always visible (the player bar); otherwise only while the row is hovered, focused or selected. */
  always: boolean
  /** In the tab order (the player bar). Row buttons stay out of it like Spotify's own row buttons (tabindex -1). */
  tabbable: boolean
  onError(action: ShortcutAction, error: unknown): void
}

export interface Group {
  host: HTMLElement
  /** Shows the buttons for a song (null hides them); queued = the row is an entry in the queue. */
  show(song: Song | null, queued: boolean): void
  dispose(): void
}

export function createGroup(options: GroupOptions): Group {
  const { actions, source, likes } = options
  const host = document.createElement('span')
  host.className = HOST_CLASS
  host.hidden = true
  host.toggleAttribute('data-always', options.always)
  const root = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = STYLE
  root.append(style)

  let song: Song | null = null
  let queued = false
  const confirmed = new Map<ShortcutAction, number>()
  const busy = new Set<ShortcutAction>()

  const buttons = actions.map(action => {
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.action = action
    if (!options.tabbable) button.tabIndex = -1
    button.addEventListener('click', () => void run(action, button))
    root.append(button)
    return { action, button }
  })

  const paint = () => {
    host.hidden = song === null
    for (const { action, button } of buttons) {
      const def = ACTIONS[action]
      button.hidden = song === null || !def.applies(song, queued, source)
      const ok = confirmed.has(action)
      const on = action === 'add-to-liked-songs' && song !== null && likes.get(song.uri) === true
      const label = on && def.onLabel ? def.onLabel : def.label
      button.classList.toggle('ok', ok)
      button.classList.toggle('on', on && !ok)
      if (action === 'add-to-liked-songs') button.setAttribute('aria-pressed', String(on))
      button.setAttribute('aria-label', label)
      button.title = label
      const icon = ok ? Check : def.icon
      if (button.dataset.icon !== icon) {
        button.innerHTML = icon // a lucide-static SVG string (our own asset)
        button.dataset.icon = icon
      }
    }
  }

  const unconfirm = () => {
    for (const timer of confirmed.values()) window.clearTimeout(timer)
    confirmed.clear()
  }

  const run = async (action: ShortcutAction, button: HTMLButtonElement) => {
    const current = song
    if (!current || busy.has(action)) return
    busy.add(action)
    try {
      const outcome = await ACTIONS[action].run({ source, likes, song: current, button: button.getBoundingClientRect() })
      if (outcome === 'done' && song === current) {
        window.clearTimeout(confirmed.get(action))
        confirmed.set(action, window.setTimeout(() => {
          confirmed.delete(action)
          paint()
        }, CONFIRM_MS))
      }
    } catch (error) {
      options.onError(action, error)
      if (host.isConnected) showToast(ACTIONS[action].failure, button.getBoundingClientRect())
    } finally {
      busy.delete(action)
      paint()
    }
  }

  const stop = (e: Event) => e.stopPropagation()
  for (const type of ISOLATED) host.addEventListener(type, stop)
  // Re-check right before a likely click: the user may have used Spotify's own heart meanwhile.
  const recheck = () => {
    if (song && actions.includes('add-to-liked-songs')) likes.request(song.uri, true)
  }
  host.addEventListener('pointerenter', recheck)
  const unsubscribe = likes.subscribe(paint)

  return {
    host,
    show(next, nextQueued) {
      const changed = next?.uri !== song?.uri || next?.uid !== song?.uid
      if (!changed && nextQueued === queued && next?.albumUri === song?.albumUri && next?.artistUri === song?.artistUri) return
      if (changed) unconfirm()
      song = next
      queued = nextQueued
      if (song && actions.includes('add-to-liked-songs')) likes.request(song.uri)
      paint()
    },
    dispose() {
      unconfirm()
      unsubscribe()
      host.remove()
    },
  }
}
