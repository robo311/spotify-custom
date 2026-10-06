// Spotify selectors the Home module relies on (see CONVENTIONS.md: test ids and semantic tags only).

export const HOME_PAGE = '[data-testid="home-page"]'
export const SHELF = '[data-testid="component-shelf"]'
export const SEE_ALL_LINK = '[data-testid="see-all-link"]'
export const SHELF_TITLE = 'h2'
export const ANY_LINK = 'a[href]'

/**
 * Scope for the observer. The app root, not #main-view: Spotify can replace the main view (e.g. when the lyrics
 * view closes), which would leave an observer on it watching a detached node.
 */
export const OBSERVE_SCOPE = '[data-testid="root"]'

/**
 * Home's first filter chip ("All"). It is checked exactly when Home is unfiltered; the Music/Podcasts filters don't
 * change the URL (Spotify uses an in-memory history), so this is the only language-independent signal.
 * Relative to MAIN_VIEW (used inside `MAIN_VIEW:has(…)`); the library's chips live outside it.
 */
export const MAIN_VIEW = '#main-view'
export const ALL_FILTER_CHIP = '[data-carousel-item]:first-child > button[role="checkbox"][data-encore-id="chip"]'

/** Attribute we put on every shelf (native and ours) so CSS can hide/order it by key. */
export const SHELF_KEY_ATTR = 'data-sc-shelf-key'
