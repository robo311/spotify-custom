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
export const ENTRY = '#sc-entry'
export const LYRICS_LINE = '[data-testid="lyrics-line"]'
