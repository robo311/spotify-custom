// Spotify DOM hooks for library artwork (verified on 1.3.3). One place to update after a Spotify change.
//
// Folders are keyed by the folder URI inside aria-labelledby, which is an id reference rather than localised text:
//   list / collapsed sidebar: [data-encore-id="listRow"][aria-labelledby="listrow-title-spotify:user:<u>:folder:<f> …"]
//   expanded library grid:    [data-encore-id="card"][aria-labelledby="card-title-spotify:user:<u>:folder:<f> …"]
// The first aria-labelledby token is the id of the element holding the item's display name.
// A folder's own view (inside the library) shows only a text breadcrumb, so there is no tile to style there.
//
// Liked Songs has no stable key in the markup (the sidebar row is a per-user playlist URI, Home cards use
// spotify:collection:tracks), but every place that shows its cover (sidebar row/card, Home shortcut and cards, its
// page header) draws the same fixed asset as an <img>, so the asset URL is the anchor.

export const SIDEBAR = '#Desktop_LeftSidebar_Id'

/** Rows and cards that can represent a library item. */
export const LIBRARY_ENTRY = '[data-encore-id="listRow"][aria-labelledby], [data-encore-id="card"][aria-labelledby]'

/** Per view: the entry element and the stock folder glyph (its direct parent is the tile). */
export const FOLDER_VIEWS = [
  { entry: '[data-encore-id="listRow"]', glyph: '[data-testid="folder"]', clipsItself: true },
  { entry: '[data-encore-id="card"]', glyph: '[data-testid="card-image-fallback"]', clipsItself: false },
] as const

/** Spotify's Liked Songs cover, wherever it is drawn (liked-songs-300.png, liked-songs-640.jpg, …). */
export const LIKED_COVER = 'img[src*="//misc.scdn.co/liked-songs/"]'
