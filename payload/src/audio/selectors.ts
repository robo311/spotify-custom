// Every Spotify selector the music-reactive effects rely on. The active lyric line has no stable hook; its class is
// found at runtime in Spotify's own stylesheet (see effects/lyrics.ts).

/** The song progress bar (12px hit area, position: relative); the spectrum canvas sits right before it. */
export const PROGRESS = '[data-testid="playback-progressbar"]'
/** Carries Spotify's played share inline as --progress-bar-transform (e.g. "42.5%"). */
export const PROGRESS_BAR = '[data-testid="progress-bar"]'
export const PROGRESS_SLOT = `div:has(> ${PROGRESS})`
export const NOW_PLAYING_COVER = '[data-testid="now-playing-widget"] [data-testid="CoverSlotCollapsed__container"]'
export const NOW_PLAYING_COVER_IMAGE = `${NOW_PLAYING_COVER} [data-testid="cover-art-image"]`
export const PLAY_PAUSE = '[data-testid="control-button-playpause"]'
/** Our own theme studio button host (builder/entry). */
export const LYRICS_LINE = '[data-testid="lyrics-line"]'
/** Attributes Spotify sets on <html> through the lyrics view's life (opening, open, closing). */
export const LYRICS_VIEW_STATE_ATTRS = ['preenter', 'duringenter', 'postenter', 'preexit', 'duringexit', 'postexit'].flatMap(s => [
  `data-cinema-npv-${s}`,
  `data-cinema-library-npv-${s}`,
])
/**
 * The lyrics view's scroll host: it paints the view's background and doesn't scroll (its viewport inside does). Found
 * from a line under the element carrying the view's inline background variables, so the Now playing panel's lyrics
 * preview never matches. Query it once at a time (closest()), never inside :has(): style attributes change every frame.
 */
export const LYRICS_VIEW_LINE = '[style*="--cinema-mode-bg-color-from"] [data-testid="lyrics-line"]'
export const SCROLL_HOST = '[data-overlayscrollbars]'
