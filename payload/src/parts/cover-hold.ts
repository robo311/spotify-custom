// The cover behind the blurred-cover lyrics background (--sc-cover-url). Spotify's player-bar cover, which it is read
// from, briefly disappears and then shows a still-loading image when a song changes; following it directly painted the
// window-wide background empty (black) for a moment. The hold keeps the last cover until the next one has loaded.

export interface CoverHold {
  /** Spotify's cover right now (null while it has none); returns the cover to paint. */
  offer(url: string | null): string | null
  current(): string | null
}

/** Resolves once the image is loaded and decoded. */
export const decodeImage = (url: string): Promise<void> => {
  const img = new Image()
  img.src = url
  return img.decode()
}

/** changed: called when a newly loaded cover takes over. */
export function createCoverHold(changed: () => void, load: (url: string) => Promise<void> = decodeImage): CoverHold {
  let shown: string | null = null
  let wanted: string | null = null
  return {
    offer(url) {
      if (url && url !== shown && url !== wanted) {
        wanted = url
        // A cover that fails to load still takes over (as before the hold), so the background never sticks.
        const take = () => {
          if (wanted !== url) return // a later song's cover took over
          wanted = null
          shown = url
          changed()
        }
        load(url).then(take, take)
      }
      return shown
    },
    current: () => shown,
  }
}
