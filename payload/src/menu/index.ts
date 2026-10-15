// Our right-click menu: Spotify still builds its menu (kept open but invisible); we draw the panel in the user's
// layout and every row runs Spotify's own item. The "Add to playlist" submenu is ours (Spotify's library services).
// Public surface used by main.ts, the studio and src/shortcuts.

export { MENU_ITEMS, OURS, STOCK, presetLayout, type MenuItemDef } from './catalog'
export { arrange, type LiveItem, type Row } from './layout'

/** Takes over Spotify's right-click menus while settings.enabled. */
export { startMenu, type MenuController } from './controller'

/**
 * Opens our playlist picker at a point (used by the "Add to playlist" shortcut): picking a playlist adds `uris` to it.
 * Closes on Escape, outside click or after adding.
 */
export { openPlaylistPicker } from './picker'

/** A static picture of the panel for the studio's preview; brings its own styles (renders in a shadow root). */
export { MenuPreview } from './MenuPreview'
