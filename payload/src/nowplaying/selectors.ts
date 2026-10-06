// Spotify hooks the lyrics Now playing column relies on (grid slot and lyrics state come from parts' LYRICS_COLUMN_SLOT).

/** Spotify's Queue button in the player bar: opens its full queue panel, which our column then yields to. */
export const QUEUE_BUTTON = '[data-testid="now-playing-bar"] [data-testid="control-button-queue"]'

/** Where the layout grid lives; watched so the column is re-attached if Spotify replaces the grid. */
export const APP_ROOT = '[data-testid="root"]'
