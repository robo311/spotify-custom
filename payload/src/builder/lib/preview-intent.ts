// Hover-to-preview intent for the theme gallery. Rules:
// - the first preview needs a short pause on a card (people moving past shouldn't recolour Spotify);
// - once previewing, gliding to another card switches quickly and never shows the active theme in between;
// - the active theme comes back only when the pointer leaves the whole gallery (or the gallery goes away);
// - clicking commits whatever is shown, with no revert flash.
import type { Theme } from '../../types'

export interface PreviewIntentOptions {
  apply: (theme: Theme | null) => void // store.preview
  firstDelay?: number
  glideDelay?: number
}

export interface PreviewIntent {
  enter(theme: Theme): void
  /** Pointer left one card (may be on its way to another): only cancels a pending preview. */
  leaveCard(): void
  /** Pointer left the gallery, the drawer closed, or the tab unmounted: back to the active theme. */
  leaveGallery(): void
  /** About to select a theme: forget the preview without reverting, so the commit is seamless. */
  commit(): void
}

export const FIRST_DELAY_MS = 250
export const GLIDE_DELAY_MS = 60

export function createPreviewIntent({ apply, firstDelay = FIRST_DELAY_MS, glideDelay = GLIDE_DELAY_MS }: PreviewIntentOptions): PreviewIntent {
  let shown: Theme | null = null
  let timer: ReturnType<typeof setTimeout> | undefined

  const cancel = () => {
    clearTimeout(timer)
    timer = undefined
  }

  return {
    enter(theme) {
      cancel()
      if (shown?.id === theme.id) return
      timer = setTimeout(
        () => {
          shown = theme
          apply(theme)
        },
        shown ? glideDelay : firstDelay,
      )
    },
    leaveCard: cancel,
    leaveGallery() {
      cancel()
      if (!shown) return
      shown = null
      apply(null)
    },
    commit() {
      cancel()
      shown = null
    },
  }
}
