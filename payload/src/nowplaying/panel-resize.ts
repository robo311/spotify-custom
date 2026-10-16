// Dragging the Now playing panel's edge well past its narrowest width hides the panel, as its header's hide button
// does: the same give the library has on its edge (where Spotify folds it to icons). Pulling back within the same drag
// shows it again; once the button is let go, a hidden panel opens with a click. Beside the lyrics the same edge sizes
// our own column, which folds to its strip instead. Spotify still runs the resize; this only watches the drag.
import { COLUMN_SHOWN, LYRICS_COLUMN_SLOT } from '../parts'
import { COLUMN_FOLD_BUTTON, COLUMN_UNFOLD_BUTTON, NPV_HIDE_BUTTON, PANEL_CONTAINER, RESIZE_BAR, RESIZE_INPUT } from './selectors'

/** How far under the narrowest width the drag must ask for before the panel goes. */
const OVERSHOOT_PX = 100
/** How far back over that line it must come to show the panel again (no flicker on the line itself). */
const RETURN_PX = 24

interface Drag {
  edge: number
  leftEdge: boolean
  min: number
  /** Clicks the hide (true) or show (false) button; looked up then, as Spotify re-renders them. */
  press: (hide: boolean) => void
  hidden: boolean
}

export function startPanelDragToHide(): () => void {
  let drag: Drag | null = null

  const onDown = (e: PointerEvent) => {
    const bar = e.button === 0 && e.target instanceof Element ? e.target.closest(RESIZE_BAR) : null
    const item = bar?.parentElement
    const min = Number(bar?.querySelector<HTMLInputElement>(RESIZE_INPUT)?.min)
    if (!item || !min) return
    let hide: HTMLElement | null | undefined
    let press: Drag['press']
    if (document.documentElement.matches(COLUMN_SHOWN)) {
      const column = () => document.getElementById(LYRICS_COLUMN_SLOT.hostId)?.shadowRoot
      hide = column()?.querySelector<HTMLElement>(COLUMN_FOLD_BUTTON)
      press = h => column()?.querySelector<HTMLElement>(h ? COLUMN_FOLD_BUTTON : COLUMN_UNFOLD_BUTTON)?.click()
    } else {
      hide = item.querySelector<HTMLElement>(NPV_HIDE_BUTTON)
      if (hide?.closest('[inert]')) hide = null // already hidden: it opens with a click
      const show = () => [...item.querySelectorAll('button')].find(b => !b.closest(PANEL_CONTAINER))
      press = h => (h ? item.querySelector<HTMLElement>(NPV_HIDE_BUTTON) : show())?.click()
    }
    if (!hide) return
    const box = item.getBoundingClientRect()
    // The bar on the panel's left edge (panel on the right) widens the panel leftwards, and the other way round.
    const leftEdge = e.clientX < box.left + box.width / 2
    drag = { edge: leftEdge ? box.right : box.left, leftEdge, min, press, hidden: false }
  }
  const onMove = (e: PointerEvent) => {
    if (!drag) return
    const width = drag.leftEdge ? drag.edge - e.clientX : e.clientX - drag.edge
    const line = drag.min - OVERSHOOT_PX
    if (!drag.hidden && width < line) {
      drag.hidden = true
      drag.press(true)
    } else if (drag.hidden && width >= line + RETURN_PX) {
      drag.hidden = false
      drag.press(false)
    }
    // While hidden, the drag is kept from Spotify, or it resizes on against the changed layout.
    if (drag.hidden) e.stopImmediatePropagation()
  }
  const onUp = () => {
    drag = null
  }

  // Capture on window: ahead of Spotify's resizer (on document and its app root), which may also capture the pointer.
  window.addEventListener('pointerdown', onDown, true)
  window.addEventListener('pointermove', onMove, true)
  window.addEventListener('pointerup', onUp, true)
  window.addEventListener('pointercancel', onUp, true)
  return () => {
    window.removeEventListener('pointerdown', onDown, true)
    window.removeEventListener('pointermove', onMove, true)
    window.removeEventListener('pointerup', onUp, true)
    window.removeEventListener('pointercancel', onUp, true)
  }
}
