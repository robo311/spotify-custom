// Spotify endpoints, origins and DOM hooks used by the internals adapter. One place to update after a Spotify change.

/** Internal GraphQL endpoint (persisted queries). Spotify's own client POSTs here through window.fetch. */
export const PATHFINDER_QUERY_URL = 'https://api-partner.spotify.com/pathfinder/v2/query'
export const PATHFINDER_URL_PREFIX = 'https://api-partner.spotify.com/pathfinder/'

/** Origin the xpui web app (and its lazily loaded JS chunks) is served from inside the desktop client. */
export const XPUI_ORIGIN = 'https://xpui.app.spotify.com'

/** Request headers worth replaying on our own pathfinder calls. Values are copied from Spotify's latest request. */
export const FORWARDED_HEADERS = ['authorization', 'app-platform', 'spotify-app-version', 'accept-language'] as const

/** React root container. The router's history object is found by walking the fiber tree from here. */
export const REACT_ROOT_SELECTORS = ['#main', '[data-testid="root"]'] as const
