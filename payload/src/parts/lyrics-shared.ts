// Names and hooks shared by the lyrics CSS (lyrics.ts: colours and text · lyrics-layout.ts: the page layout ·
// lyrics-motion.ts: opening and closing) and by the modules that draw into the lyrics page.
import type { Theme } from '../types'
import * as S from './selectors'

/** Runtime variables (set by startPartsRuntime). */
export const COVER_URL_VAR = '--sc-cover-url'
export const PAST_LINE_VAR = '--sc-lyrics-past'
export const PAST_LINE_OPACITY_VAR = '--sc-lyrics-past-opacity'

/**
 * Slot for our own "Now playing" column beside the lyrics (layout.lyricsNowPlaying; drawn by src/nowplaying).
 * The column is a host element appended to the layout grid; readyAttr on <html> says it has something to show,
 * so the lyrics view only makes room for it then.
 */
export const LYRICS_COLUMN_SLOT = {
  hostId: 'sc-lyrics-npv',
  readyAttr: 'data-sc-lyrics-npv',
  grid: S.LAYOUT_GRID,
} as const
export const COLUMN_HOST = `#${LYRICS_COLUMN_SLOT.hostId}`

/**
 * Hooks for our animated lyrics (theme.lyrics.animated; drawn by src/lyrics-view): its host goes inside the lyrics
 * view (above Spotify's scroll area, below the view's header row); ownAttr on <html> says it is showing, which hides
 * Spotify's lines. Typography and line colours are read from Spotify's (hidden) lines and colour host.
 */
export const LYRICS_VIEW_SLOT = {
  hostId: 'sc-lyrics-view',
  ownAttr: 'data-sc-lyrics-own',
  viewHost: S.LYRICS_CINEMA_HOST,
  grid: S.LAYOUT_GRID,
  open: S.LYRICS_VIEW_OPEN,
  line: `${S.LYRICS_CINEMA_BG} ${S.LYRICS_LINE}`,
  colorHost: S.LYRICS_COLOR_HOSTS,
} as const
export const OWN_VIEW = `#${LYRICS_VIEW_SLOT.hostId}`

export const VIEW_LINES = `${S.LYRICS_CINEMA_BG} ${S.LYRICS_LINE}`
/** Spotify's right-panel slot in the layout grid (not the lyrics view, which is also a scroll host there). */
export const PANEL_SLOT = `${S.RIGHT_SIDEBAR}:not(:has(> [data-overlayscrollbars]))`

/** True when the theme changes anything about the lyrics view (Spotify Original, for one, doesn't). */
export function customisesLyricsView(theme: Pick<Theme, 'lyrics' | 'layout'>): boolean {
  const l = theme.lyrics
  return (
    l.background !== 'spotify' ||
    l.fontScale !== 1 ||
    l.font !== 'theme' ||
    l.align !== 'left' ||
    l.activeLine !== undefined ||
    l.inactiveLine !== undefined ||
    l.pastLine !== undefined ||
    l.animated.on ||
    theme.layout.lyricsKeepLibrary ||
    theme.layout.lyricsImmersive ||
    theme.layout.lyricsNowPlaying
  )
}
