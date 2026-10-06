// Shared contracts between payload modules and the Go helper.
// Changing anything here affects other modules — keep it in sync with helper/internal/store and helper/internal/inject.

export type Color = string // CSS colour: #rgb, #rrggbb, #rrggbbaa
export type Paint = string // Color or CSS gradient (linear-/radial-/conic-gradient(...))

export interface Palette {
  background: Color // content panels: main view, library sidebar, right panel (Spotify's #121212)
  surface: Color // app frame around the panels: window background, top bar, player bar (Spotify's #000)
  elevated: Color // cards, menus, popovers, hover surfaces
  text: Color
  textSubdued: Color
  accent: Color // replaces Spotify green
  onAccent: Color // text/icons drawn on top of accent
  border: Color
}

export type FontId = 'inter' | 'outfit' | 'space-grotesk' | 'nunito' | 'fraunces' | 'jetbrains-mono' | 'spotify' | 'system'

export interface PartStyle {
  background?: Paint
  text?: Color
  accent?: Color
  radius?: number // px
  size?: number // px, for round buttons (e.g. the Home button); the icon scales with it
}

export interface NowPlayingLayout {
  hidden: string[] // PanelSectionInfo keys
  order: string[] // PanelSectionInfo keys in desired order; unknown sections keep their natural position after ordered ones
  compactCover: boolean // smaller canvas/cover at the top of the panel
  coverHeight: 'spotify' | 'short' | 'tall' // height of the big cover / Canvas
  coverShade: 'none' | 'soft' | 'spotify' | 'strong' // the dark gradient over it
  titleScale: number // song title size, 0.8–1.5, 1 = Spotify's
  hideVideoSwitch: boolean // the "Switch to video" button over the cover
  hideLikeButton: boolean // the Liked tick next to the title
  cardGap: number // px between the cards below the header (Spotify: 16)
}

export interface LayoutConfig {
  hidden: string[] // ids from LAYOUT_OPTIONS / hideable PARTS
  compactPlayer: boolean
  librarySide: 'left' | 'right'
  searchPosition: 'left' | 'centre' | 'right' // Home + search in the top bar; centre = Spotify's
  nowPlaying: NowPlayingLayout // the right "Now playing" panel
  lyricsKeepLibrary: boolean // keep the library sidebar visible on the lyrics page (Spotify hides it)
  lyricsImmersive: boolean // on the lyrics page, top bar + player bar fade out and reappear on hover
  /**
   * On the lyrics page, show our own "Now playing" column (cover, title, artists, up next). Spotify unmounts its real
   * Now playing panel while lyrics are open, so this is drawn by us. Yields to Spotify's Queue/Friends panel when open.
   */
  lyricsNowPlaying: boolean
}

/** Where the lyrics background comes from. Applies to the lyrics page and the lyrics preview card in the Now playing panel. */
export type LyricsBackground = 'spotify' | 'theme' | 'accent' | 'cover-blur'

export interface LyricsStyle {
  background: LyricsBackground
  activeLine?: Color // line being sung; undefined = derived from background
  inactiveLine?: Color // upcoming lines
  pastLine?: Color // already sung lines
  fontScale: number // 0.75–1.5, 1 = Spotify's size
  font: FontId | 'theme' // 'theme' = the theme's font
  align: 'left' | 'center'
}

/**
 * Song progress bar look. Animations run only while music plays.
 * spotify = untouched · glow = accent glow + springy playhead · flow = gradient fill with a moving sheen ·
 * wave = played part is an animated wave that flattens when paused.
 */
export type ProgressStyle = 'spotify' | 'glow' | 'flow' | 'wave' | 'segments' | 'stripes'

export interface Effects {
  albumMode: boolean // palette accent/background tint follow the current cover art
  ambientGlow: boolean // soft cover-coloured bloom behind the top of the main view
  // The playing song's Canvas video in place of its cover: on its album's page, and in the player bar.
  canvasAlbum: boolean
  canvasPlayerBar: boolean
  progressBar: ProgressStyle
  reactive: ReactiveLook
}

/**
 * How the music-reactive effects look. Part of the theme (shared with it); whether capture runs at all is the
 * personal Settings.reactive.enabled switch. Intensities are 0–100.
 */
export interface ReactiveLook {
  sensitivity: number // 0.5–2, 1 = default; scales the incoming levels before every effect
  // live spectrum rising from the progress bar · blocks = LED-meter segments · peaks = bars with falling peak caps
  spectrum: { on: boolean; intensity: number; shape: 'bars' | 'mirror' | 'line' | 'blocks' | 'peaks'; color: 'accent' | 'cover' }
  pulse: { on: boolean; intensity: number; cover: boolean; play: boolean; entry: boolean } // kick on beats
  // a light that breathes with loudness; customColor (hex) is used for color 'custom', accent while it's null
  background: { on: boolean; intensity: number; color: 'cover' | 'accent' | 'custom'; customColor: Color | null }
  lyrics: { on: boolean; intensity: number } // the sung line swells and brightens with the voice
}

/** Look of Home's shortcut cards (the quick-pick grid at the top) and of the "Your listening" stats shelf. */
export interface HomeStyle {
  shortcutSize: 'spotify' | 'small' | 'medium' | 'large' // card height; spotify = Spotify's responsive choice
  shortcutColumns: 0 | 2 | 3 | 4 // 0 = Spotify's responsive choice
  statsLayout: 'hero' | 'grid' | 'list' // big #1 + chart · cards · compact list
  statsCount: 5 | 10
  statsRanks: boolean // rank numerals
  statsGlow: boolean // cover-coloured glow behind #1
}

/** Look of album, playlist and song pages (anything with Spotify's entity header and track list). */
export interface PageStyle {
  backdrop: 'spotify' | 'accent' | 'theme' | 'cover-blur' | 'custom' | 'none' // colour behind the header
  backdropColor: string | null // hex, for backdrop 'custom'
  backdropStrength: number // 0–100 %, 100 = full
  headerHeight: 'compact' | 'spotify' | 'tall'
  // centred = cover above a centred title; banner = the cover as a wide banner behind the title, like artist pages
  // (albums and songs; playlist covers are often text or mosaics, so playlists keep Spotify's layout).
  headerLayout: 'spotify' | 'centred' | 'banner'
  coverSize: number | null // px; null = Spotify's (232)
  coverRadius: number | null // px; null = Spotify's
  coverShadow: 'spotify' | 'none' | 'lifted' | 'glow' // glow = soft light in the cover's colour
  titleScale: number // 0.6–1.4, 1 = Spotify's
  // Title typography: page titles and artist names.
  titleWeight: 'spotify' | 'light' | 'regular' | 'black'
  titleSpacing: 'spotify' | 'tight' | 'wide'
  titleUppercase: boolean
  playSize: 'small' | 'spotify' | 'large' // the big play button under the header
  playShape: 'spotify' | 'rounded' | 'pill'
  rows: 'spotify' | 'striped' | 'cards' | 'lines' | 'outlined' | 'glow' // glow = accent bar + wash on hover
  playingRow: boolean // highlight the row of the song that's playing
  playingStyle: 'bar' | 'wash' | 'fade' | 'outline' // bar = accent bar on the left + a wash
  playingColor: string | null // hex; null = the accent
  playingStrength: number // 5–40 %: how strongly the row is tinted
  playingTitle: boolean // the playing song's title in the same colour
  equaliserColor: string | null // hex for Spotify's playing equaliser; null = the playing-row colour (itself the accent by default)
  thumbnails: 'spotify' | 'square' | 'round' | 'circle' | 'cd' | 'hidden' // small covers in playlist rows; cd = circle with a hole
  playingSpin: boolean // the playing song's cover turns (where lists show covers: playlists, artists' top songs)
  indexStyle: 'spotify' | 'accent' | 'hidden' // track numbers
  hideColumnHeader: boolean
  artistBanner: 'spotify' | 'dim' | 'blur' | 'tint' | 'none' // tint = greyscale photo in the accent colour
  artistBannerHeight: 'compact' | 'spotify' | 'tall'
  artistNameScale: number // 0.6–1.4, 1 = Spotify's
}

/** A replacement icon for one button (key = IconName). Beats the icon pack. svg = markup, drawn only as a CSS mask. */
export type IconChoice = { gallery: string } | { svg: string }

export interface Theme {
  schema: 1
  id: string
  name: string
  basedOn: string | null // preset id this was forked from; null for presets
  palette: Palette
  font: FontId
  radius: number // px, 0–24, global corner roundness
  parts: Record<string, PartStyle> // key = PartDef.id
  layout: LayoutConfig
  icons: string // icon pack id: 'spotify' | 'line' | 'duotone' | 'offset' | 'bold' | 'soft' | 'pixel' | user pack id
  iconOverrides: Record<string, IconChoice> // IconName -> per-button icon
  homeStyle: HomeStyle
  pageStyle: PageStyle
  effects: Effects
  lyrics: LyricsStyle
  css: string // custom CSS, applied last
}

/** A theme loaded from the user's data folder. fileCss = contents of themes/<id>/theme.css (read-only, hand-written). */
export interface UserTheme extends Theme {
  fileCss?: string
}

export interface HomeConfig {
  hidden: string[] // shelf keys (see home/shelves.ts)
  order: string[] // shelf keys in desired order; unknown shelves keep their natural position after ordered ones
}

/**
 * Custom artwork for a library item Spotify doesn't let you customise: folders and Liked Songs.
 * Personal: lives in Settings (keyed by item URI), not in the Theme, so share codes never carry it.
 */
export interface ArtworkStyle {
  image?: string // data:image/… URL, downscaled to ≤ 256 px; takes precedence over icon
  icon?: string // id from the built-in folder icon set (library/icons.ts)
  color?: Color // icon colour
  background?: Paint // tile behind the icon
}

/** A customisable item currently listed in the library sidebar. */
export interface LibraryItemInfo {
  kind: 'folder' | 'liked'
  uri: string // folder: spotify:user:<id>:folder:<id> · liked: spotify:collection:tracks (LIKED_SONGS_URI) — stable, language-independent
  name: string // display name (user-chosen folder name, or Spotify's localised "Liked Songs")
}

export interface Settings {
  schema: 1
  activeTheme: string // preset id or user theme id
  home: HomeConfig
  extensions: Record<string, boolean> // extension id -> enabled
  extensionData: Record<string, Record<string, unknown>> // extension id -> its saved settings
  artworkStyles: Record<string, ArtworkStyle> // library item URI -> custom artwork
  reactive: ReactiveSettings
}

/** Personal (never in share codes): turning capture on is a permission decision, and sync depends on the speakers. */
export interface ReactiveSettings {
  enabled: boolean // master switch; off = the helper never opens an audio tap
  syncMs: number // −300…300, added to the helper's measured output latency (AudioStatus.latencyMs); 0 = automatic
}

/**
 * Music-reactive audio, helper side. The helper taps only Spotify's own output, analyses it in memory and sends
 * 35-byte frames ~30×/s: window.__sc?.audio?.frame(base64). Nothing is recorded, stored or sent anywhere else.
 * Frame bytes: [0] version (1) · [1] level 0–255 · [2] beat onset strength 0–255 (0 = none) ·
 * [3..34] 32 log-spaced bands, 30 Hz–16 kHz, 0–255, auto-gained so loud music sits around 200.
 * Status changes arrive as window.__sc?.audio?.status(AudioStatus) and as the result of the `audio` op.
 */
export interface AudioStatus {
  // off = not capturing · starting · listening · no-signal = tap open but only digital silence for a few seconds while
  // playing (usually permission denied) · needs-permission = the OS refused · unsupported = OS too old / not available ·
  // error = anything else (message says what)
  state: 'off' | 'starting' | 'listening' | 'no-signal' | 'needs-permission' | 'unsupported' | 'error'
  latencyMs: number // output device latency the helper measured (0 = unknown); the auto sync delay
  message?: string
}

export interface IconPack {
  id: string
  name: string
  icons: Record<string, string> // IconName -> SVG markup (24x24 viewBox, stroke/fill = currentColor)
}

export interface UserExtensionFile {
  file: string // file name in extensions/
  source: string // JS source
}

/**
 * Helper self-update. The helper checks GitHub Releases on start and every few hours. Changes arrive as
 * window.__sc?.update?.(UpdateStatus) and in HelperState.update.
 */
export interface UpdateStatus {
  // none = up to date (or not checked yet) · available = `latest` can be installed · installing = downloading and
  // installing; the helper (and the theme, briefly) restarts when done · failed = last install failed (message says why)
  state: 'none' | 'available' | 'installing' | 'failed'
  current: string // running helper version ("dev" for local builds, which never update)
  latest?: string // newer version, when state is available / installing / failed
  message?: string
}

/** Returned by the helper's getState op. */
export interface HelperState {
  settings: Settings | null // null on first run
  userThemes: UserTheme[]
  iconPacks: IconPack[] // user packs from icons/<pack>/*.svg; name = folder name
  extensions: UserExtensionFile[]
  dataDir: string
  version: string
  platform: 'darwin' | 'windows' | 'mock'
  update: UpdateStatus
}

/**
 * Bridge protocol (page -> helper):
 *   window.__scHelper(JSON.stringify({ id: number, op: BridgeOp, args: unknown }))
 * Helper -> page reply:
 *   window.__sc.bridge.reply(id: number, ok: boolean, result: unknown)   // result = error message string when ok is false
 */
export interface BridgeOps {
  getState: { args: null; result: HelperState }
  saveSettings: { args: Settings; result: null }
  saveTheme: { args: Theme; result: null } // writes themes/<id>/theme.json (never fileCss)
  deleteTheme: { args: { id: string }; result: null }
  openFolder: { args: { sub: '' | 'themes' | 'icons' | 'extensions' }; result: null }
  restartSpotify: { args: null; result: null }
  /** Start (on) or stop music capture. The page sends its wish on boot and whenever it changes. */
  audio: { args: { on: boolean }; result: AudioStatus }
  /**
   * Download, verify and install UpdateStatus.latest, then restart the helper. Where the helper can't replace itself
   * (e.g. a Mac app run from Downloads), it opens the release page instead. Progress arrives via window.__sc.update.
   */
  installUpdate: { args: null; result: null }
}
export type BridgeOp = keyof BridgeOps

// ---------- Parts / layout / icons (owned by src/parts, src/icons) ----------

export interface PartDef {
  id: string
  label: string // shown in builder, e.g. "Player bar"
  description: string // one line, friendly
  selectors: string[] // ONLY [data-testid=..], [data-encore-id=..], semantic tags/roles. Never hashed classes, never aria-label.
  props: (keyof PartStyle)[] // which properties the builder offers
  hideable: boolean // if true, the builder shows "Hide" which toggles `id` in layout.hidden
  /** Only present on some pages; 'missing' means not on this page, not broken. */
  pageSpecific?: boolean
  /** false when the background can only be a solid colour (it lands in a colour variable). */
  gradient: boolean
  /** Size slider range when props includes 'size'. */
  size?: { min: number; max: number; default: number }
  /** Spotify's own corner radius (px) when it differs from the theme's, e.g. round buttons; shown when unset. */
  radius?: number
  compile(style: PartStyle, theme: Theme): string // CSS for this part's overrides
}

export interface LayoutOption {
  id: string // stored in layout.hidden
  label: string
  css: string // CSS applied when the option is in layout.hidden
}

export type PartStatus = Record<string, 'ok' | 'missing'> // PartDef.id -> presence in current DOM

// ---------- Home shelves (owned by src/home) ----------

/** A section of the right "Now playing" panel (canvas, track info, lyrics preview, related videos, about the artist, …). */
export interface PanelSectionInfo {
  key: string // stable, language-independent
  title: string // localised display title
}

export interface ShelfInfo {
  key: string // stable, language-independent (section URI from see-all link, else fallback)
  title: string // localised display title
  stable: boolean // false if the key is a daily-generated id (hiding may not persist)
}

// ---------- Playback (owned by src/spotify) ----------

export interface PlaybackTrack {
  uri: string
  name: string
  artists: { name: string; uri: string }[]
  album: { name: string; uri: string }
  image: string | null // https URL of the largest cover
  thumb: string | null // https URL of the smallest cover
}

export interface PlaybackState {
  track: PlaybackTrack | null
  next: PlaybackTrack[] // up next: queued tracks first, then the context / autoplay
}

// ---------- App state exposed to the builder (owned by src/core/store) ----------

export interface AppState {
  ready: boolean
  settings: Settings
  presets: Theme[]
  userThemes: UserTheme[]
  active: Theme // the currently applied theme (working copy)
  activeIsPreset: boolean
  iconPacks: IconPack[] // built-in + user
  extensions: ExtensionInfo[]
  partStatus: PartStatus
  shelves: ShelfInfo[]
  panelSections: PanelSectionInfo[] // sections currently in the Now playing panel (empty when it's closed)
  libraryItems: LibraryItemInfo[] // folders + Liked Songs currently listed in the library sidebar
  canUndo: boolean
  canRedo: boolean
  /**
   * Persistence feedback for the UI. pending = a change is waiting to be written; saved = everything is on disk;
   * local = saved only in this Spotify session's storage because the helper isn't connected; error = last write failed.
   */
  saveStatus: 'saved' | 'pending' | 'local' | 'error'
  helper: { connected: boolean; dataDir: string; platform: HelperState['platform']; version: string }
  update: UpdateStatus
}

export interface ExtensionInfo {
  id: string
  name: string
  description?: string
  builtIn: boolean
  enabled: boolean
  error?: string
}

export interface ThemeEditOptions {
  /** Edits with the same key within 600 ms collapse into one undo step (e.g. dragging a colour picker). */
  coalesceKey?: string
}

export interface Store {
  get(): AppState
  subscribe(fn: (s: AppState) => void): () => void

  /** Edit the active theme. If the active theme is a preset, it is forked to "<name> (my version)" first. */
  edit(mutate: (draft: Theme) => void, opts?: ThemeEditOptions): void
  /** Temporarily apply a theme without changing state (hover-to-preview, import preview). null = back to active. */
  preview(theme: Theme | null): void
  /** Switch theme. origin = viewport point for the circular-reveal transition. */
  selectTheme(id: string, origin?: { x: number; y: number }): void
  undo(): void
  redo(): void
  resetToPreset(): void
  saveAs(name: string): void
  renameTheme(id: string, name: string): void
  deleteTheme(id: string): void

  editSettings(mutate: (draft: Settings) => void): void
  setExtensionEnabled(id: string, enabled: boolean): void

  exportShareCode(): string
  /** Parses a share code into a theme preview (throws a user-friendly Error on invalid input). */
  parseShareCode(code: string): Theme
  /** Adds an imported theme as a user theme and activates it. */
  importTheme(theme: Theme, origin?: { x: number; y: number }): void

  /** Re-attempts every failed write and writes anything still queued, now (AppState.saveStatus 'error'). */
  retrySave(): void

  openFolder(sub: '' | 'themes' | 'icons' | 'extensions'): void
  restartSpotify(): void
  /** Applies a pushed UpdateStatus (window.__sc.update). */
  setUpdate(s: UpdateStatus): void
  installUpdate(): void
}

// ---------- Extension API (owned by src/ext) ----------

export interface ShelfDef {
  id: string
  title: string
  /**
   * el lives inside an open shadow root: Spotify's styles don't reach it, inherited CSS custom properties
   * (palette vars, --sc-*) and the "SC Inter"/"SC Mono" fonts do. Bring your own <style>. Return optional cleanup.
   */
  render(el: HTMLElement): void | (() => void)
}

export interface ExtensionContext {
  addHomeShelf(def: ShelfDef): void
  onNavigate(fn: (path: string) => void): () => void
  navigate(path: string): void
  spotify: { query(operation: string, variables: object): Promise<unknown> } // narrow the result at the call site
  settings: { get(key: string): unknown; set(key: string, value: unknown): void }
  theme: { get(): Theme; subscribe(fn: (t: Theme) => void): () => void }
}

export interface ExtensionDef {
  id: string
  name: string
  description?: string
  start(ctx: ExtensionContext): void | (() => void)
}

// ---------- Global ----------

export interface ScGlobal {
  version: string // build id; boot is a no-op if equal, otherwise old instance is disposed first
  dispose(): void
  bridge: { reply(id: number, ok: boolean, result: unknown): void }
  store: Store
  registerExtension(def: ExtensionDef): void
  /** Helper → page audio channel (see AudioStatus). */
  audio: { frame(base64: string): void; status(s: AudioStatus): void }
  /** Helper → page update status (see UpdateStatus). */
  update(s: UpdateStatus): void
}

declare global {
  interface Window {
    __sc?: ScGlobal
    __scHelper?: (msg: string) => void
    SC?: { registerExtension(def: ExtensionDef): void }
  }
}
