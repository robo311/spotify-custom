// Every Spotify selector the parts/layout code relies on, in one place.
// Allowed hooks: data-testid, data-encore-id, semantic tags/roles, Encore set classes, and three readable layout ids
// (Desktop_LeftSidebar_Id, main-view, Desktop_PanelContainer_Id) that Spotify uses as landmarks — never hashed classes.

/** The CSS grid that lays out top bar, sidebars, main view and player bar (grid-template with named areas). */
export const LAYOUT_GRID = '[data-testid="root"] > div:has(> #Desktop_LeftSidebar_Id)'

export const LEFT_SIDEBAR = '#Desktop_LeftSidebar_Id'
export const MAIN_VIEW = '#main-view'
/** Grid item that hosts the right panel (Now Playing / queue). The landmark id sits deeper, so match the item by :has. */
export const RIGHT_SIDEBAR = `${LAYOUT_GRID} > :has(#Desktop_PanelContainer_Id)`
export const TOP_BAR = '[data-testid="global-nav-bar"]'
export const PLAYER_BAR = '[data-testid="now-playing-bar"]'
export const RESIZE_BAR = '[data-testid="LayoutResizer__resize-bar"]'

export const NOW_PLAYING_TITLE = '[data-testid="context-item-info-title"]'
export const NOW_PLAYING_LINK = '[data-testid="context-item-link"]'
export const NOW_PLAYING_COVER_SLOT = '[data-testid="now-playing-widget"] [data-testid="CoverSlotCollapsed__container"]'
export const NOW_PLAYING_COVER_IMAGE = `${NOW_PLAYING_COVER_SLOT} [data-testid="cover-art-image"]`
export const PLAYER_CONTROLS = '[data-testid="player-controls"]'

export const CARD = '[data-encore-id="card"]'
export const CARD_IMAGE = '[data-testid="card-image"]'
export const CARD_PLAY_BUTTON = '[data-testid="play-button"][data-encore-id="buttonPrimary"]'
export const PLAYER_PLAY_PAUSE = '[data-testid="control-button-playpause"]'
export const BUTTONS = [
  '[data-encore-id="buttonPrimary"]:not([data-testid="play-button"], [data-testid="control-button-playpause"])',
  '[data-encore-id="buttonSecondary"]',
  '[data-encore-id="chip"]',
]
/** Encore colour-set wrapper inside a button (holds the button's own --background-* vars). */
export const BUTTON_FILL = '> span'
export const ACCENT_SET = '.encore-bright-accent-set'

export const PLAYBACK_PROGRESS = '[data-testid="playback-progressbar"]'
export const VOLUME_BAR = '[data-testid="volume-bar"]'
export const PROGRESS_BAR = '[data-testid="progress-bar"]'
export const SEARCH_FORM = `${TOP_BAR} form[role="search"]`
export const SEARCH_INPUT = '[data-testid="search-input"]'

export const HOME_BUTTON = `${TOP_BAR} [data-testid="home-button"]`
/** Holds Home + search. Spotify centres it as an absolute full-width layer over the bar's left and right groups. */
export const TOP_BAR_CENTRE = `${TOP_BAR} > div:has(form[role="search"])`
/** The box around the back/forward pair (it keeps its width when only the buttons are hidden). */
export const TOP_BAR_HISTORY = `${TOP_BAR} div:has(> [data-testid="top-bar-back-button"])`
/**
 * The empty box Spotify keeps under the Mac window buttons (close, minimise, zoom: 52px), first in the group that
 * holds back/forward. Spotify keeps it in full screen too, where the buttons are gone.
 */
export const WINDOW_BUTTONS_SPACER = `${TOP_BAR} div:has(> div > [data-testid="top-bar-back-button"]) > :first-child:not(:has(button))`
/** On <html> on macOS (set by the parts runtime, runtime.ts): only there do the window buttons sit on the left. */
export const MAC_ATTR = 'data-sc-mac'

/** Home's shortcut cards (the quick-pick grid at the top): each card holds its own invisible full-card link layer. */
export const SHORTCUT_CARD = '[data-testid="home-page"] div:has(> div > [data-testid="shortcut-background"])'
/** The grid laying the cards out; Spotify sizes the cards through --item-height on it. */
export const SHORTCUT_GRID = '[data-testid="home-page"] div:has(> div > div > [data-testid="shortcut-background"])'
export const SHORTCUT_TEXT = '[data-encore-id="text"]'

// ---------- Album, playlist and song pages ----------

/**
 * Spotify's big header on album, playlist and song pages (the page itself: whatever *-page holds it). Artist pages use
 * the same test id for a different layout (banner photo, no cover), styled separately below.
 */
export const ENTITY_HEADER = '#main-view :not([data-testid="artist-page"] *) > [data-testid="entity-header"]'
/** Painted layers behind the header (one or two, cover-coloured, set inline); the content is its last child. */
export const HEADER_BACKDROP = `${ENTITY_HEADER} > :not(:last-child)`
export const HEADER_CONTENT = `${ENTITY_HEADER} > :last-child`
/** The cover: the content's child holding an image that isn't the text block (which holds the creator avatar). */
export const HEADER_COVER = `${HEADER_CONTENT} > :has(img):not(:last-child)`
export const HEADER_TEXT = `${HEADER_CONTENT} > :last-child`
export const HEADER_TITLE = `${ENTITY_HEADER} [data-testid="entityTitle"] h1`
/** The cover-coloured fade right under the header, behind the play button row. */
export const ACTION_BACKDROP = `${ENTITY_HEADER} + div`
/** The header on pages that may show the cover as a banner: albums and songs, not playlists or artists. */
export const BANNER_HEADER = '#main-view :not(:is([data-testid="artist-page"], [data-testid="playlist-page"]) *) > [data-testid="entity-header"]'
/** The page title on every kind of page: albums, playlists and songs (h1), artists (a title Spotify fits to the width). */
export const PAGE_TITLES = `${HEADER_TITLE}, #main-view [data-testid="entity-header"] [data-encore-id="adaptiveTitle"]`
/** The big play button in the row under the header (on artist pages too). */
export const PAGE_PLAY_BUTTON = '#main-view [data-testid="action-bar-row"] [data-testid="play-button"]'
/** The play button in the bar that sticks to the top of the page once the header scrolls away. */
export const TOP_BAR_PLAY_BUTTON = '#main-view [data-testid="topbar-content"] [data-testid="play-button"]'
/**
 * That bar's painted layer (Spotify fades it in on scroll and colours it from --background-base set inline). The bar
 * is shared by every page, so it's scoped to a main view showing an album, song or playlist header.
 */
export const PAGE_TOP_BAR_FILL = '#main-view:has(:not([data-testid="artist-page"] *) > [data-testid="entity-header"]) [data-testid="topbar"] > :first-child'
/** Albums and artists' Popular list use "track-list"; playlists their own. */
export const TRACK_LIST = '#main-view :is([data-testid="track-list"], [data-testid="playlist-tracklist"])'
/** Row wrappers carry aria-rowindex (1 = the column header row); the styled row is inside. */
export const TRACK_ROW = `${TRACK_LIST} [data-testid="tracklist-row"]`
/** The list's first child is a sticky box holding the column header row (and, on playlists, the view button). */
export const TRACK_LIST_HEADER = `${TRACK_LIST} > :first-child:has([role="row"][aria-rowindex="1"])`
/** A playlist row's small cover sits directly in the title cell. */
export const ROW_THUMBNAIL = `${TRACK_ROW} [aria-colindex="2"] > img`
/** Spotify's playing equaliser in the number cell: an animated GIF while playing, a still SVG while paused. */
export const ROW_EQUALISER_IMAGES = ['/images/equaliser-animated-green.gif', '/images/equaliser-green.svg'] as const
export const rowEqualiser = (src: string) => `${TRACK_ROW} [aria-colindex="1"] img[src$="${src}"]`
/** The track number (Spotify swaps in a play button on hover and an equaliser on the playing row). */
export const ROW_INDEX = `${TRACK_ROW} [aria-colindex="1"] [data-encore-id="text"]`

export const ARTIST_HEADER = '#main-view [data-testid="artist-page"] [data-testid="entity-header"]'
export const ARTIST_NAME = `${ARTIST_HEADER} [data-testid="adaptiveEntityTitle"]`
/**
 * The banner box (photo + Spotify's dark gradient). It sits beside the page, not in it, so it's found from an ancestor
 * holding the artist page (playlists have a "background-image" too). Spotify sizes it apart from the header.
 */
export const ARTIST_BANNER = '#main-view div:has(main > [data-testid="artist-page"]) div:has(> [data-testid="background-image"])'
export const ARTIST_BANNER_IMAGE = `${ARTIST_BANNER} > [data-testid="background-image"]`
export const ARTIST_BANNER_SHADE = `${ARTIST_BANNER} > :not([data-testid="background-image"])`
/** The artist-coloured fade under the banner, behind the play button row. */
export const ARTIST_ACTION_BACKDROP = `${ARTIST_HEADER} + div > :first-child`

/** Our own stats shelf host (home module marks extension shelves with data-sc-shelf-key="ext:<id>"). */
export const STATS_SHELF = '[data-sc-shelf-key="ext:stats"]'

export const SHELF_TITLE = '[data-testid="component-shelf"] h2'
export const SHELF_SEE_ALL = '[data-testid="component-shelf"] [data-testid="see-all-link"]'

export const WHATS_NEW_BUTTON = '[data-testid="whats-new-feed-button"]'
export const FRIEND_ACTIVITY_BUTTON = '[data-testid="friend-activity-button"]'
export const PIP_BUTTON = '[data-testid="pip-toggle-button"]'
export const LYRICS_BUTTON = '[data-testid="lyrics-button"]'
export const FULLSCREEN_BUTTON = '[data-testid="fullscreen-mode-button"]'
export const QUALITY_BADGE = '[data-testid="context-item-info-quality"]'

/** Where part-status observation is scoped (falls back to document.body before Spotify renders). */
export const APP_ROOT = '[data-testid="root"]'

// ---------- Now playing panel ----------

/** Flex column holding the panel's sections (track, lyrics preview, videos, artist, credits, tour, merch, queue). */
export const NPV_SECTIONS = '[data-testid="NPV_Panel_OpenDiv"]'
/** The panel's scroll viewport: its box is the visible part of the sections. */
export const NPV_SCROLL_VIEWPORT = `[data-overlayscrollbars-viewport]:has(${NPV_SECTIONS})`
export const NPV_BIG_VISUAL = `${NPV_SECTIONS} div:has(> [data-testid="track-visual-enhancement"])`
export const NPV_TRACK_SECTION = `${NPV_SECTIONS} > :has([data-testid="track-visual-enhancement"])`
/** Height of the panel's floating header (title + buttons), which overlays the top of the sections. */
export const NPV_HEADER_HEIGHT = '64px'
export const NPV_MINI_VISUAL = `${NPV_SECTIONS} [data-testid="minimized-track-visual-enhancement"]`
export const NPV_LYRICS_CARD = '[data-testid="lyrics-npv-section"]'
/** The cover / Canvas layer; Spotify paints its dark gradients on its ::before and ::after. */
export const NPV_VISUAL = `${NPV_SECTIONS} [data-testid="track-visual-enhancement"]`
/** "Switch to video": the only button without an Encore id in the row right under the big cover. */
export const NPV_VIDEO_SWITCH = `${NPV_BIG_VISUAL} + div button:not([data-encore-id]):not([data-testid])`
/** The Liked tick next to the title (a toggle, so it carries aria-checked). */
export const NPV_LIKE_BUTTON = `${NPV_TRACK_SECTION} button[aria-checked]`
export const NPV_TITLE = `${NPV_TRACK_SECTION} [data-testid="context-item-info-title"]`
/**
 * The cards below the header (about the artist, credits, tour, queue…), by the section keys parts/panel.ts marks.
 * The lyrics preview is left out: its look comes from the Lyrics settings.
 */
export const NPV_CARDS = `${NPV_SECTIONS} > [data-sc-panel-key]:not([data-sc-panel-key="track"], [data-sc-panel-key="lyrics"])`

// ---------- Lyrics (Spotify 1.3.3 opens lyrics as a full-window "cinema" view of the Now playing panel) ----------

/**
 * <html> carries data-cinema-npv-* through the lyrics view's life: preenter → duringenter → postenter → preexit →
 * duringexit → postexit. It counts as open from duringenter up to and including preexit: preexit is when Spotify's
 * close transition snapshots the "before" picture, so the open layout must still hold then.
 */
export const LYRICS_VIEW_OPEN =
  ':root:is([data-cinema-npv-duringenter], [data-cinema-npv-postenter], [data-cinema-npv-preexit], ' +
  '[data-cinema-library-npv-duringenter], [data-cinema-library-npv-postenter], [data-cinema-library-npv-preexit])'
/** The close animation itself (after preexit's "before" snapshot); the Now playing panel is mounted again by then. */
export const LYRICS_VIEW_CLOSING = ':root:is([data-cinema-npv-duringexit], [data-cinema-library-npv-duringexit])'
/**
 * Attribute states on <html> while Spotify's right panel (queue, friend activity, …) is open. Spotify then narrows
 * the lyrics view to the left so the panel gets the right column. Combine with LYRICS_VIEW_OPEN (both on :root).
 */
export const RIGHT_PANEL_OPEN = ':is([data-right-sidebar-open-duringenter], [data-right-sidebar-open-postenter], [data-right-sidebar-open-preexit])'
export const LYRICS_LINE = '[data-testid="lyrics-line"]'
/** Elements on which Spotify sets the cover-derived lyrics colours inline (cinema view and preview card). */
export const LYRICS_COLOR_HOSTS = '[style*="--lyrics-color-background"]'
/** Lyrics view background: Spotify sets a cover-derived gradient inline here. */
export const LYRICS_CINEMA_BG = '[style*="--cinema-mode-bg-color-from"]'
/**
 * Grid item hosting the lyrics view (it spans the whole window while open): the only grid item whose direct child
 * is a scroll host. Never find it through LYRICS_CINEMA_BG: Spotify rewrites inline styles every frame while the
 * view opens and closes, and a :has() on style attributes re-runs on each rewrite (measured ~9 ms each: the lag).
 */
export const LYRICS_CINEMA_HOST = `${LAYOUT_GRID} > :has(> [data-overlayscrollbars])`
/** The view's own header row (title + action buttons), floating over the top of the lyrics. */
export const LYRICS_VIEW_HEADER = `${LYRICS_CINEMA_HOST} > :has(button):not(:has([data-overlayscrollbars]))`
/** Scroll viewport of the lyrics (OverlayScrollbars library attribute); its box stays put while lyrics scroll. */
export const LYRICS_SCROLL_VIEWPORT = `${LYRICS_CINEMA_HOST} [data-overlayscrollbars-viewport]`

// ---------- Song progress bar ----------

export const PB_ROOT = '[data-testid="playback-progressbar"]'
// Below: relative to PB_ROOT (so they can follow state selectors like PB_ROOT:hover).
/** The hit area (12px tall); carries --progress-bar-transform (played %) and the bar's colour variables. */
export const PB_BAR = '[data-testid="progress-bar"]'
export const PB_TRACK = `${PB_BAR} > [data-testid="progress-bar-background"]`
/** Clip box of the played fill; Spotify translates the full-width fill inside it. */
export const PB_FILL_CLIP = `${PB_TRACK} > div:has(+ [data-testid="progress-bar-handle"])`
export const PB_FILL = `${PB_FILL_CLIP} > div`
export const PB_KNOB = `${PB_TRACK} > [data-testid="progress-bar-handle"]`
