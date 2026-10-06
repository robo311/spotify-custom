// Every Spotify selector the builder relies on, in one place (see CONVENTIONS.md: data-testid only).

/** Top bar; the entry button lives inside it. */
export const NAV_BAR = '[data-testid="global-nav-bar"]'

/** The entry button is inserted before the first of these that exists (they sit in the top-right button group). */
export const ENTRY_ANCHORS = ['[data-testid="whats-new-feed-button"]', '[data-testid="friend-activity-button"]', '[data-testid="user-widget-link"]'] as const

/** Player bar: the drawer stops above it so playback controls stay usable. */
export const NOW_PLAYING_BAR = '[data-testid="now-playing-bar"]'

/** Current cover art in the player bar (for "From album art"). */
export const NOW_PLAYING_COVER = '[data-testid="now-playing-widget"] [data-testid="cover-art-image"], [data-testid="now-playing-widget"] img'

export const HOME_BUTTON = '[data-testid="home-button"]'

/** Player bar button that opens the lyrics page. */
export const LYRICS_BUTTON = '[data-testid="lyrics-button"]'

/** Spotify's own icons, shown as the preview of the "Spotify" icon pack. */
export const SPOTIFY_ICON_SAMPLES = [
  '[data-testid="control-button-skip-back"] svg',
  '[data-testid="control-button-playpause"] svg',
  '[data-testid="control-button-skip-forward"] svg',
  '[data-testid="control-button-repeat"] svg',
  '[data-testid="home-button"] svg',
  '[data-testid="control-button-queue"] svg',
] as const

/** The open page's track list, and the title column's header: right-clicking it opens Spotify's own column chooser. */
export const TRACK_LIST = '#main-view :is([data-testid="track-list"], [data-testid="playlist-tracklist"])'
export const COLUMN_MENU_TARGET = `${TRACK_LIST} [role="columnheader"][aria-colindex="2"] [data-testid="column-header-context-menu"]`
