// Spotify DOM hooks for the shortcut buttons. One place to update after a Spotify change.
import type { SpotifyAddSurface } from '../types'

/** Track lists (playlists, albums, search, artist top songs, Liked Songs) live here. */
export const MAIN_VIEW = '#main-view'
/** One song row; Spotify virtualises the list and reuses rows for other songs while scrolling. */
export const TRACK_ROW = '[data-testid="tracklist-row"]'
/** The row's last cell: Spotify's own add/heart button, the duration and ⋯ (verified on Spotify 1.3.4). */
export const ROW_ACTIONS_CELL = ':scope > [role="gridcell"]:last-child'
/** A track list's grid: Spotify sizes its last column (✓, duration, ⋯) from --last-min-width, 120px on 1.3.4. */
export const TRACK_GRID = `${MAIN_VIEW} [role="grid"]`
export const LAST_COLUMN_MIN_PX = 120
/** Spotify's spacing between the items in that column. */
export const LAST_COLUMN_GAP_PX = 12

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

/** The top bar's search form; it stays mounted while its suggestions dropdown opens and closes inside it. */
export const SEARCH_FORM = '[data-testid="global-nav-bar"] form[role="search"]'
/** A suggestion row (songs, playlists, artists, search terms); only song rows carry a song. */
export const SEARCH_ROW = '[data-testid="search-dropdown"] [role="row"]'
/** A song suggestion: the only kind that links to /track/ (its title). */
const SEARCH_SONG_ROW = `${SEARCH_ROW}:has(a[href^="/track/"])`

/**
 * Spotify's own add button (+ / ✓ for Liked Songs and playlists): the row's or the player bar's only toggle button
 * (aria-checked). Queue rows have none.
 */
export const SPOTIFY_ADD: Record<SpotifyAddSurface, string> = {
  rows: `${MAIN_VIEW} ${TRACK_ROW} > [role="gridcell"]:last-child button[aria-checked]`,
  playerBar: `${PLAYER_WIDGET} button[aria-checked]`,
  // Playlist and album suggestions have one too (save to library); only songs' is ours to hide.
  search: `${SEARCH_SONG_ROW} button[aria-checked]`,
}

export const ALBUM_LINK = 'a[href^="/album/"]'
export const ARTIST_LINK = 'a[href^="/artist/"]'
