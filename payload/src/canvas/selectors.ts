// Every Spotify selector the Canvas-as-cover feature relies on, in one place.

/** Spotify's Canvas video in the right panel's Now playing view (a looping, muted <video> it decodes itself). */
export const PANEL_CANVAS_VIDEO = '[data-testid="NPV_Panel_OpenDiv"] video'

/** The small cover in the player bar. */
export const PLAYER_COVER = '[data-testid="now-playing-widget"] [data-testid="CoverSlotCollapsed__container"]'

const ALBUM_HEADER = '#main-view [data-testid="album-page"] > [data-testid="entity-header"]'
/** The album page's cover (the header content's child holding an image that isn't the text block). */
export const ALBUM_COVER = `${ALBUM_HEADER} > :last-child > :has(img):not(:last-child)`
/** The header's painted backdrop, which the banner layout fills with the cover. */
export const ALBUM_BANNER = `${ALBUM_HEADER} > :first-child`
