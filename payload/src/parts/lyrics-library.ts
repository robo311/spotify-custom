// Keeps the library usable next to the lyrics. While the lyrics view is open Spotify marks the library sidebar
// `inert` (it expects it to be slid away), which blocks clicks, scrolling and its resize handle. With
// layout.lyricsKeepLibrary the library stays on screen, so we lift that flag, and give it back when the option
// goes off. CSS can't do this: inert removes the element from hit testing whatever its styles say.
import { APP_ROOT, LEFT_SIDEBAR, LYRICS_VIEW_OPEN } from './selectors'

export interface LyricsLibraryController {
  /** Re-check after the layout changed. */
  refresh(): void
  dispose(): void
}

export function startLyricsLibrary(keepLibrary: () => boolean): LyricsLibraryController {
  /** The sidebar we lifted inert from (React may replace the element, so keep the one we touched). */
  let released: HTMLElement | null = null

  const lyricsOpen = () => document.documentElement.matches(LYRICS_VIEW_OPEN)

  const giveBack = () => {
    if (released?.isConnected && lyricsOpen()) released.inert = true
    released = null
  }

  const update = () => {
    if (!keepLibrary()) {
      giveBack()
      return
    }
    const sidebar = document.querySelector<HTMLElement>(LEFT_SIDEBAR)
    if (sidebar?.inert && lyricsOpen()) {
      sidebar.inert = false
      released = sidebar
    }
  }

  let frame = 0
  const schedule = () => {
    if (frame === 0) {
      frame = requestAnimationFrame(() => {
        frame = 0
        update()
      })
    }
  }
  // Spotify flips the cinema attributes on <html> and `inert` on the sidebar in either order.
  const observer = new MutationObserver(schedule)
  observer.observe(document.documentElement, { attributes: true })
  observer.observe(document.querySelector(APP_ROOT) ?? document.body, { attributes: true, attributeFilter: ['inert'], subtree: true })
  update()

  return {
    refresh: update,
    dispose() {
      observer.disconnect()
      if (frame !== 0) cancelAnimationFrame(frame)
      giveBack()
    },
  }
}
