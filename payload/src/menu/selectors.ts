// Spotify's context menu DOM (verified on 1.3.4): every menu is a tippy root appended to <body>; the top level holds
// #context-menu[data-testid="context-menu"] > ul[role="menu"][data-depth="0"]. Submenus are further roots with a
// ul[role="menu"] of a higher data-depth, mounted inside their parent's row (li > [data-tippy-root]). Rows are li[role="presentation"] around a button or link with role menuitem.

/** A popover root (tippy): on <body> for a menu, inside the parent row for a submenu. */
export const POPOVER_ROOT = '[data-tippy-root]'

/**
 * Marks the root of a top-level context menu (not dropdowns such as the library's sort menu). The + button's
 * add-to-playlist sheet (1.3.5) carries it too, with its ul[role=menu] inside a form rather than a direct child.
 */
export const CONTEXT_MENU = '[data-testid="context-menu"]'

export const MENU_LIST = 'ul[role="menu"]'

export const MENU_ITEM = ':scope > li > :is(button, a)[role="menuitem"]'
