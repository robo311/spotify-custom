// Holds Spotify's search suggestions open while a studio section that changes them is in use, so you see your edits
// as you make them. Spotify opens the dropdown when its input gets focus and closes it when focus moves to another
// element; while held, focus moving from the input into the studio is kept from reaching Spotify. Letting go moves
// focus out of the input for real, which closes it.
import { SEARCH_DROPDOWN, SEARCH_INPUT } from '../selectors'

export interface SearchPeek {
  /** Opens the suggestions (again, if Spotify closed them meanwhile) and holds them open. */
  open(): void
  /** Lets go and closes them, unless you're typing in the search box. */
  close(): void
}

export function peekSearch(studio: ShadowRoot): SearchPeek {
  let input: HTMLInputElement | null = null
  /** Somewhere in the studio to put focus when no studio control has it. */
  let spare: HTMLElement | null = null
  /** Moving focus fires focus events in the studio, which may ask to open again; Spotify can render a moment later. */
  let bouncing = false

  const keep = (e: Event) => {
    // Browsers report the studio's host as where focus went; happy-dom reports the control inside it.
    const to = (e as FocusEvent).relatedTarget
    if (e.target === input && to instanceof Node && (to === studio.host || studio.contains(to))) e.stopImmediatePropagation()
  }
  const studioFocus = (): HTMLElement => {
    const active = studio.activeElement
    if (active instanceof HTMLElement && active !== spare) return active
    if (!spare) {
      spare = document.createElement('span')
      spare.tabIndex = -1
      studio.append(spare)
    }
    return spare
  }
  /** Focus into the input and straight back to the studio. */
  const bounce = (target: HTMLInputElement) => {
    const back = studioFocus()
    bouncing = true
    target.focus({ preventScroll: true })
    back.focus({ preventScroll: true })
    bouncing = false
  }
  const isOpen = () => document.querySelector(SEARCH_DROPDOWN) !== null

  return {
    open() {
      if (bouncing) return
      const found = document.querySelector<HTMLInputElement>(SEARCH_INPUT)
      if (!found) return
      if (!input) window.addEventListener('focusout', keep, true)
      input = found
      if (!isOpen()) bounce(found)
    },
    close() {
      const held = input
      if (!held) return
      window.removeEventListener('focusout', keep, true)
      input = null
      if (held.isConnected && isOpen() && document.activeElement !== held) {
        if (studio.host.isConnected) bounce(held)
        else {
          // The studio has already gone (it was closed): focus can't come back to it, so a stand-in takes it for a
          // moment and then leaves it to the page.
          const stand = document.createElement('span')
          stand.className = 'sc-search-peek'
          stand.tabIndex = -1
          document.body.append(stand)
          held.focus({ preventScroll: true })
          stand.focus({ preventScroll: true })
          stand.remove()
        }
      }
      spare?.remove()
      spare = null
    },
  }
}
