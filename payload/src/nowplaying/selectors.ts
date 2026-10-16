// Spotify hooks the lyrics Now playing column relies on (grid slot and lyrics state come from parts' LYRICS_COLUMN_SLOT).

/** Spotify's Queue button in the player bar: opens its full queue panel, which our column then yields to. */
export const QUEUE_BUTTON = '[data-testid="now-playing-bar"] [data-testid="control-button-queue"]'

/** Where the layout grid lives; watched so the column is re-attached if Spotify replaces the grid. */
export const APP_ROOT = '[data-testid="root"]'

/** Spotify's resize bars (one on the library's edge, one on the right panel's); each sits in its sidebar's grid item. */
export const RESIZE_BAR = '[data-testid="LayoutResizer__resize-bar"]'
/** The resize bar's range input: its min is the narrowest width Spotify lets the panel take. */
export const RESIZE_INPUT = 'input[type="range"]'
/**
 * The Now playing panel's "Hide Now Playing view" button, the first in its header (top left). Only labelled in the
 * user's language, so found by place. data-npv-root is the 1.3.4+ panel; queue and friend activity don't have it.
 */
export const NPV_HIDE_BUTTON = '#Desktop_PanelContainer_Id [data-npv-root] button'
/**
 * The right panel. "Show Now Playing view", on the strip a hidden panel leaves, is the one button in the panel's grid
 * item outside it (the panel stays rendered, inert, while hidden); it too is only labelled in the user's language.
 */
export const PANEL_CONTAINER = '#Desktop_PanelContainer_Id'
/** Our column's fold button (top left, in its shadow root; the folded strip has none). */
export const COLUMN_FOLD_BUTTON = 'button.fold'
/** The folded strip's button that opens the column again. */
export const COLUMN_UNFOLD_BUTTON = 'button.unfold'
