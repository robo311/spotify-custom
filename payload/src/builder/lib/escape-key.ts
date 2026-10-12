// Esc for builder layers that own it wherever focus is (pick mode, popovers). Esc pressed inside our UI is taken as it
// bubbles out of our shadow root, so a nested control that handles Esc itself (and stops propagation) wins. Esc
// pressed anywhere else (focus in Spotify, or on the page body) is taken in the capture phase, before Spotify sees it.
// Either way it stops there, so the drawer's own Esc (close) doesn't also fire.

export function listenEscape(root: ShadowRoot, handle: (e: KeyboardEvent) => void): () => void {
  const host = root.host
  const isEscape = (e: Event): e is KeyboardEvent => e instanceof KeyboardEvent && e.key === 'Escape' && !e.defaultPrevented
  const take = (e: KeyboardEvent) => {
    e.stopPropagation()
    handle(e)
  }
  const fromInside = (e: Event) => {
    if (isEscape(e)) take(e)
  }
  const fromOutside = (e: KeyboardEvent) => {
    if (isEscape(e) && !e.composedPath().includes(host)) take(e)
  }
  host.addEventListener('keydown', fromInside)
  window.addEventListener('keydown', fromOutside, true)
  return () => {
    host.removeEventListener('keydown', fromInside)
    window.removeEventListener('keydown', fromOutside, true)
  }
}
