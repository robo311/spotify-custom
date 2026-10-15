// Spotify DOM hooks for the shortcut buttons. One place to update after a Spotify change.

/** Track lists (playlists, albums, search, artist top songs, Liked Songs) live here. */
export const MAIN_VIEW = '#main-view'
/** One song row; Spotify virtualises the list and reuses rows for other songs while scrolling. */
export const TRACK_ROW = '[data-testid="tracklist-row"]'
/** The row's last cell: Spotify's own add/heart button, the duration and ⋯ (verified on Spotify 1.3.4). */
export const ROW_ACTIONS_CELL = ':scope > [role="gridcell"]:last-child'

/** The right panel (Queue / Recently played tabs). */
export const PANEL = '#Desktop_PanelContainer_Id'
export const PANEL_ROW = 'li[role="row"]'
/** The Recently played tab: its rows are history, never queued. */
export const HISTORY_PANEL = '#history-panel'
/** A panel row's title; its id carries the song's URI (a fallback when the React props don't say). */
export const PANEL_ROW_TITLE = '[data-encore-id="listRowTitle"][id*="spotify:track:"]'
export const MORE_BUTTON = '[data-testid="more-button"]'

/** The playing song in the player bar. */
export const PLAYER_WIDGET = '[data-testid="now-playing-widget"]'
export const PLAYER_TITLE = '[data-testid="context-item-info-title"]'

export const ALBUM_LINK = 'a[href^="/album/"]'
export const ARTIST_LINK = 'a[href^="/artist/"]'
