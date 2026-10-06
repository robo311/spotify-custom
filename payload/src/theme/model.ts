// Theme and settings data model: validation of untrusted input (files, share codes, helper), schema migration,
// defaults, and identity helpers (slug ids, forking presets).
import type {
  Effects,
  ArtworkStyle,
  FontId,
  HomeStyle,
  IconChoice,
  LayoutConfig,
  LyricsBackground,
  LyricsStyle,
  NowPlayingLayout,
  PageStyle,
  Palette,
  PartStyle,
  ProgressStyle,
  ReactiveLook,
  ReactiveSettings,
  Settings,
  Theme,
} from '../types'
import { ICON_NAMES } from '../icons'
import { isColor, normalizeHex } from './color'
import { FONT_IDS } from './fonts'

export const THEME_SCHEMA = 1
export const PALETTE_KEYS: (keyof Palette)[] = [
  'background',
  'surface',
  'elevated',
  'text',
  'textSubdued',
  'accent',
  'onAccent',
  'border',
]
const PART_STYLE_KEYS: (keyof PartStyle)[] = ['background', 'text', 'accent', 'radius', 'size']
export const RADIUS_MIN = 0
export const RADIUS_MAX = 24
export const PART_SIZE_MIN = 28
export const PART_SIZE_MAX = 72
const PROGRESS_STYLES: ProgressStyle[] = ['spotify', 'glow', 'flow', 'wave', 'segments', 'stripes']
const LYRICS_BACKGROUNDS: LyricsBackground[] = ['spotify', 'theme', 'accent', 'cover-blur']
export const LYRICS_SCALE_MIN = 0.75
export const LYRICS_SCALE_MAX = 1.5

export class ThemeValidationError extends Error {}

/** Migrations from schema N to N+1, keyed by N. Add an entry when the schema changes. */
const MIGRATIONS: Partial<Record<number, (raw: Record<string, unknown>) => Record<string, unknown>>> = {}

function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  let current = raw
  let version = typeof raw.schema === 'number' ? raw.schema : THEME_SCHEMA
  if (version > THEME_SCHEMA) throw new ThemeValidationError('This theme was made with a newer version of Spotify Custom.')
  while (version < THEME_SCHEMA) {
    const step = MIGRATIONS[version]
    if (!step) throw new ThemeValidationError(`Unsupported theme version ${version}.`)
    current = step(current)
    version++
  }
  return current
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string')

export function defaultLayout(): LayoutConfig {
  return {
    hidden: [],
    compactPlayer: false,
    librarySide: 'left',
    searchPosition: 'centre',
    nowPlaying: defaultNowPlaying(),
    lyricsKeepLibrary: false,
    lyricsImmersive: false,
    lyricsNowPlaying: false,
  }
}

export const NPV_TITLE_SCALE_MIN = 0.8
export const NPV_TITLE_SCALE_MAX = 1.5
export const NPV_CARD_GAP_MAX = 32
export const SPOTIFY_NPV_CARD_GAP = 16

export function defaultNowPlaying(): NowPlayingLayout {
  return {
    hidden: [],
    order: [],
    compactCover: false,
    coverHeight: 'spotify',
    coverShade: 'spotify',
    titleScale: 1,
    hideVideoSwitch: false,
    hideLikeButton: false,
    cardGap: SPOTIFY_NPV_CARD_GAP,
  }
}

/** Themes made before lyrics styling existed keep Spotify's own lyrics look. */
export function defaultLyrics(): LyricsStyle {
  return { background: 'spotify', fontScale: 1, font: 'theme', align: 'left' }
}

export function defaultHomeStyle(): HomeStyle {
  return { shortcutSize: 'spotify', shortcutColumns: 0, statsLayout: 'hero', statsCount: 5, statsRanks: true, statsGlow: true }
}

export const PAGE_TITLE_SCALE_MIN = 0.6
export const PAGE_TITLE_SCALE_MAX = 1.4
export const COVER_SIZE_MIN = 96
export const COVER_SIZE_MAX = 320
/** Spotify's own cover size in the page header. */
export const SPOTIFY_COVER_SIZE = 232
export const PLAYING_STRENGTH_MIN = 5
export const PLAYING_STRENGTH_MAX = 40
const PLAYING_STRENGTH_DEFAULT = 16

export function defaultPageStyle(): PageStyle {
  return {
    backdrop: 'spotify',
    backdropColor: null,
    backdropStrength: 100,
    headerHeight: 'spotify',
    headerLayout: 'spotify',
    coverSize: null,
    coverRadius: null,
    coverShadow: 'spotify',
    titleScale: 1,
    titleWeight: 'spotify',
    titleSpacing: 'spotify',
    titleUppercase: false,
    playSize: 'spotify',
    playShape: 'spotify',
    rows: 'spotify',
    playingRow: false,
    playingStyle: 'bar',
    playingColor: null,
    playingStrength: PLAYING_STRENGTH_DEFAULT,
    playingTitle: false,
    equaliserColor: null,
    thumbnails: 'spotify',
    playingSpin: false,
    indexStyle: 'spotify',
    hideColumnHeader: false,
    artistBanner: 'spotify',
    artistBannerHeight: 'spotify',
    artistNameScale: 1,
  }
}

export const REACTIVE_SENSITIVITY_MIN = 0.5
export const REACTIVE_SENSITIVITY_MAX = 2
export const REACTIVE_SYNC_MIN = -300
export const REACTIVE_SYNC_MAX = 300

/** Every music-reactive effect off: nothing moves until the user picks one (and switches capture on). */
export function defaultReactiveLook(): ReactiveLook {
  return {
    sensitivity: 1,
    spectrum: { on: false, intensity: 60, shape: 'bars', color: 'accent' },
    pulse: { on: false, intensity: 60, cover: true, play: true, entry: true },
    background: { on: false, intensity: 60, color: 'cover', customColor: null },
    lyrics: { on: false, intensity: 60 },
  }
}

export function defaultEffects(): Effects {
  return { albumMode: false, ambientGlow: false, canvasAlbum: false, canvasPlayerBar: false, progressBar: 'spotify', reactive: defaultReactiveLook() }
}

/** Turns any input into a valid Theme, filling optional fields with defaults. Throws ThemeValidationError. */
export function validateTheme(input: unknown): Theme {
  if (!isRecord(input)) throw new ThemeValidationError('A theme must be an object.')
  const raw = migrate(input)

  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 60) : null
  if (!name) throw new ThemeValidationError('The theme needs a name.')
  const id = typeof raw.id === 'string' && isSlug(raw.id) ? raw.id : slugify(name)

  if (!isRecord(raw.palette)) throw new ThemeValidationError(`"${name}" has no colours.`)
  const paletteInput = raw.palette
  const color = (key: keyof Palette) => {
    const value = paletteInput[key]
    if (!isColor(value)) throw new ThemeValidationError(`"${name}": colour "${key}" is missing or not a valid colour.`)
    return normalizeHex(value)
  }
  const palette: Palette = {
    background: color('background'),
    surface: color('surface'),
    elevated: color('elevated'),
    text: color('text'),
    textSubdued: color('textSubdued'),
    accent: color('accent'),
    onAccent: color('onAccent'),
    border: color('border'),
  }

  const effectsInput = isRecord(raw.effects) ? raw.effects : {}

  return {
    schema: THEME_SCHEMA,
    id,
    name,
    basedOn: typeof raw.basedOn === 'string' ? raw.basedOn : null,
    palette,
    font: FONT_IDS.includes(raw.font as FontId) ? (raw.font as FontId) : 'inter',
    radius: clampRadius(raw.radius),
    parts: validateParts(raw.parts),
    layout: validateLayout(raw.layout),
    icons: typeof raw.icons === 'string' && raw.icons ? raw.icons : 'spotify',
    iconOverrides: validateIconOverrides(raw.iconOverrides),
    homeStyle: validateHomeStyle(raw.homeStyle),
    pageStyle: validatePageStyle(raw.pageStyle),
    effects: {
      albumMode: effectsInput.albumMode === true,
      ambientGlow: effectsInput.ambientGlow === true,
      // Both from the single switch they replaced.
      canvasAlbum: effectsInput.canvasAlbum === true || effectsInput.canvasCover === true,
      canvasPlayerBar: effectsInput.canvasPlayerBar === true || effectsInput.canvasCover === true,
      progressBar: PROGRESS_STYLES.includes(effectsInput.progressBar as ProgressStyle)
        ? (effectsInput.progressBar as ProgressStyle)
        : 'spotify',
      reactive: validateReactiveLook(effectsInput.reactive),
    },
    lyrics: validateLyrics(raw.lyrics),
    css: typeof raw.css === 'string' ? raw.css : '',
  }
}

const uniqueStrings = (v: unknown): string[] => (isStringArray(v) ? [...new Set(v)] : [])

function validateLayout(input: unknown): LayoutConfig {
  const raw = isRecord(input) ? input : {}
  const nowPlaying: Record<string, unknown> = isRecord(raw.nowPlaying) ? raw.nowPlaying : {}
  const d = defaultNowPlaying()
  const num = (v: unknown, min: number, max: number, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v * 100) / 100)) : fallback
  const panel: NowPlayingLayout = {
    hidden: uniqueStrings(nowPlaying.hidden),
    order: uniqueStrings(nowPlaying.order),
    compactCover: nowPlaying.compactCover === true,
    coverHeight: oneOf(['spotify', 'short', 'tall'] as const, nowPlaying.coverHeight, d.coverHeight),
    coverShade: oneOf(['none', 'soft', 'spotify', 'strong'] as const, nowPlaying.coverShade, d.coverShade),
    titleScale: num(nowPlaying.titleScale, NPV_TITLE_SCALE_MIN, NPV_TITLE_SCALE_MAX, d.titleScale),
    hideVideoSwitch: nowPlaying.hideVideoSwitch === true,
    hideLikeButton: nowPlaying.hideLikeButton === true,
    cardGap: Math.round(num(nowPlaying.cardGap, 0, NPV_CARD_GAP_MAX, d.cardGap)),
  }
  return {
    hidden: uniqueStrings(raw.hidden),
    compactPlayer: raw.compactPlayer === true,
    librarySide: raw.librarySide === 'right' ? 'right' : 'left',
    searchPosition: oneOf(['left', 'centre', 'right'] as const, raw.searchPosition, 'centre'),
    nowPlaying: panel,
    lyricsKeepLibrary: raw.lyricsKeepLibrary === true,
    lyricsImmersive: raw.lyricsImmersive === true,
    lyricsNowPlaying: raw.lyricsNowPlaying === true,
  }
}

function validateLyrics(input: unknown): LyricsStyle {
  const d = defaultLyrics()
  if (!isRecord(input)) return d
  const lyrics: LyricsStyle = {
    background: LYRICS_BACKGROUNDS.includes(input.background as LyricsBackground)
      ? (input.background as LyricsBackground)
      : d.background,
    fontScale:
      typeof input.fontScale === 'number' && Number.isFinite(input.fontScale)
        ? Math.min(LYRICS_SCALE_MAX, Math.max(LYRICS_SCALE_MIN, Math.round(input.fontScale * 100) / 100))
        : d.fontScale,
    font: input.font === 'theme' || FONT_IDS.includes(input.font as FontId) ? (input.font as FontId | 'theme') : d.font,
    align: input.align === 'center' ? 'center' : 'left',
  }
  // Optional colours: omitted (not undefined-valued) when absent, so themes round-trip through JSON unchanged.
  for (const key of ['activeLine', 'inactiveLine', 'pastLine'] as const) {
    const value = input[key]
    if (isColor(value)) lyrics[key] = normalizeHex(value)
  }
  return lyrics
}

const oneOf = <T>(options: readonly T[], value: unknown, fallback: T): T => (options.includes(value as T) ? (value as T) : fallback)

function validateHomeStyle(input: unknown): HomeStyle {
  const d = defaultHomeStyle()
  const raw = isRecord(input) ? input : {}
  return {
    shortcutSize: oneOf(['spotify', 'small', 'medium', 'large'] as const, raw.shortcutSize, d.shortcutSize),
    shortcutColumns: oneOf([0, 2, 3, 4] as const, raw.shortcutColumns, d.shortcutColumns),
    statsLayout: oneOf(['hero', 'grid', 'list'] as const, raw.statsLayout, d.statsLayout),
    statsCount: oneOf([5, 10] as const, raw.statsCount, d.statsCount),
    statsRanks: typeof raw.statsRanks === 'boolean' ? raw.statsRanks : d.statsRanks,
    statsGlow: typeof raw.statsGlow === 'boolean' ? raw.statsGlow : d.statsGlow,
  }
}

/** Pixels; themes made before the slider had Small (160) and Large (300). */
function coverSize(v: unknown): number | null {
  if (v === 'small') return 160
  if (v === 'large') return 300
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(COVER_SIZE_MAX, Math.max(COVER_SIZE_MIN, Math.round(v))) : null
}

function validatePageStyle(input: unknown): PageStyle {
  const d = defaultPageStyle()
  const raw = isRecord(input) ? input : {}
  const scale = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(PAGE_TITLE_SCALE_MAX, Math.max(PAGE_TITLE_SCALE_MIN, Math.round(v * 100) / 100)) : fallback
  const backdropColor = isColor(raw.backdropColor) ? normalizeHex(raw.backdropColor) : null
  const backdrop = oneOf(['spotify', 'accent', 'theme', 'cover-blur', 'custom', 'none'] as const, raw.backdrop, d.backdrop)
  return {
    // A custom backdrop without a colour would have nothing to paint; the accent wash is the closest look.
    backdrop: backdrop === 'custom' && !backdropColor ? 'accent' : backdrop,
    backdropColor,
    backdropStrength:
      typeof raw.backdropStrength === 'number' && Number.isFinite(raw.backdropStrength)
        ? Math.min(100, Math.max(0, Math.round(raw.backdropStrength)))
        : d.backdropStrength,
    headerHeight: oneOf(['compact', 'spotify', 'tall'] as const, raw.headerHeight, d.headerHeight),
    // Themes made before the layout choice had a centred on/off switch.
    headerLayout: oneOf(['spotify', 'centred', 'banner'] as const, raw.headerLayout ?? (raw.centred === true ? 'centred' : undefined), d.headerLayout),
    coverSize: coverSize(raw.coverSize),
    coverRadius: typeof raw.coverRadius === 'number' && Number.isFinite(raw.coverRadius) ? clampRadius(raw.coverRadius) : null,
    coverShadow: oneOf(['spotify', 'none', 'lifted', 'glow'] as const, raw.coverShadow, d.coverShadow),
    titleScale: scale(raw.titleScale, d.titleScale),
    titleWeight: oneOf(['spotify', 'light', 'regular', 'black'] as const, raw.titleWeight, d.titleWeight),
    titleSpacing: oneOf(['spotify', 'tight', 'wide'] as const, raw.titleSpacing, d.titleSpacing),
    titleUppercase: raw.titleUppercase === true,
    playSize: oneOf(['small', 'spotify', 'large'] as const, raw.playSize, d.playSize),
    playShape: oneOf(['spotify', 'rounded', 'pill'] as const, raw.playShape, d.playShape),
    rows: oneOf(['spotify', 'striped', 'cards', 'lines', 'outlined', 'glow'] as const, raw.rows, d.rows),
    playingRow: raw.playingRow === true,
    playingStyle: oneOf(['bar', 'wash', 'fade', 'outline'] as const, raw.playingStyle, d.playingStyle),
    playingColor: isColor(raw.playingColor) ? normalizeHex(raw.playingColor) : null,
    playingStrength:
      typeof raw.playingStrength === 'number' && Number.isFinite(raw.playingStrength)
        ? Math.min(PLAYING_STRENGTH_MAX, Math.max(PLAYING_STRENGTH_MIN, Math.round(raw.playingStrength)))
        : d.playingStrength,
    playingTitle: raw.playingTitle === true,
    equaliserColor: isColor(raw.equaliserColor) ? normalizeHex(raw.equaliserColor) : null,
    thumbnails: oneOf(['spotify', 'square', 'round', 'circle', 'cd', 'hidden'] as const, raw.thumbnails, d.thumbnails),
    playingSpin: raw.playingSpin === true,
    indexStyle: oneOf(['spotify', 'accent', 'hidden'] as const, raw.indexStyle, d.indexStyle),
    hideColumnHeader: raw.hideColumnHeader === true,
    artistBanner: oneOf(['spotify', 'dim', 'blur', 'tint', 'none'] as const, raw.artistBanner, d.artistBanner),
    artistBannerHeight: oneOf(['compact', 'spotify', 'tall'] as const, raw.artistBannerHeight, d.artistBannerHeight),
    artistNameScale: scale(raw.artistNameScale, d.artistNameScale),
  }
}

const clampNumber = (v: unknown, min: number, max: number, fallback: number, round = 1) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v * round) / round)) : fallback

function validateReactiveLook(input: unknown): ReactiveLook {
  const d = defaultReactiveLook()
  const raw = isRecord(input) ? input : {}
  const effect = (v: unknown): Record<string, unknown> => (isRecord(v) ? v : {})
  const flag = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)
  const intensity = (v: unknown, fallback: number) => clampNumber(v, 0, 100, fallback)
  const spectrum = effect(raw.spectrum)
  const pulse = effect(raw.pulse)
  const background = effect(raw.background)
  const lyrics = effect(raw.lyrics)
  return {
    sensitivity: clampNumber(raw.sensitivity, REACTIVE_SENSITIVITY_MIN, REACTIVE_SENSITIVITY_MAX, d.sensitivity, 100),
    spectrum: {
      on: flag(spectrum.on, d.spectrum.on),
      intensity: intensity(spectrum.intensity, d.spectrum.intensity),
      shape: oneOf(['bars', 'mirror', 'line', 'blocks', 'peaks'] as const, spectrum.shape, d.spectrum.shape),
      color: oneOf(['accent', 'cover'] as const, spectrum.color, d.spectrum.color),
    },
    pulse: {
      on: flag(pulse.on, d.pulse.on),
      intensity: intensity(pulse.intensity, d.pulse.intensity),
      cover: flag(pulse.cover, d.pulse.cover),
      play: flag(pulse.play, d.pulse.play),
      entry: flag(pulse.entry, d.pulse.entry),
    },
    background: {
      on: flag(background.on, d.background.on),
      intensity: intensity(background.intensity, d.background.intensity),
      color: oneOf(['cover', 'accent', 'custom'] as const, background.color, d.background.color),
      customColor: isColor(background.customColor) ? normalizeHex(background.customColor) : null,
    },
    lyrics: { on: flag(lyrics.on, d.lyrics.on), intensity: intensity(lyrics.intensity, d.lyrics.intensity) },
  }
}

export const ICON_SVG_MAX_CHARS = 16 * 1024

/**
 * Hand-made button icons come from share codes too. They're only ever drawn as CSS mask images (never inserted as
 * markup), which can't run script; still, only plain, self-contained SVG is kept.
 */
export function isPlainSvg(svg: string): boolean {
  return (
    svg.length <= ICON_SVG_MAX_CHARS &&
    /^\s*<svg[\s>]/i.test(svg) &&
    /<\/svg>\s*$/i.test(svg) &&
    !/<(script|foreignObject|image|use|iframe)\b|\son\w+\s*=|(?:href|src)\s*=|url\s*\(|javascript:/i.test(svg)
  )
}

function validateIconChoice(input: unknown): IconChoice | null {
  if (!isRecord(input)) return null
  if (typeof input.gallery === 'string' && isSlug(input.gallery)) return { gallery: input.gallery }
  if (typeof input.svg === 'string' && isPlainSvg(input.svg)) return { svg: input.svg.trim() }
  return null
}

function validateIconOverrides(input: unknown): Record<string, IconChoice> {
  if (!isRecord(input)) return {}
  const out: Record<string, IconChoice> = {}
  for (const name of ICON_NAMES) {
    const choice = validateIconChoice(input[name])
    if (choice) out[name] = choice
  }
  return out
}

function clampRadius(v: unknown): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : 8
  return Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, n))
}

/** Parts may carry colours or CSS gradients (`background`); anything else is dropped. */
function validateParts(input: unknown): Record<string, PartStyle> {
  if (!isRecord(input)) return {}
  const out: Record<string, PartStyle> = {}
  for (const [partId, styleInput] of Object.entries(input)) {
    if (!isRecord(styleInput)) continue
    const style: PartStyle = {}
    for (const key of PART_STYLE_KEYS) {
      const value = styleInput[key]
      if (key === 'radius') {
        if (typeof value === 'number') style.radius = clampRadius(value)
      } else if (key === 'size') {
        if (typeof value === 'number' && Number.isFinite(value)) style.size = Math.min(PART_SIZE_MAX, Math.max(PART_SIZE_MIN, Math.round(value)))
      } else if (key === 'background') {
        if (isPaint(value)) style.background = value
      } else if (isColor(value)) {
        style[key] = value
      }
    }
    if (Object.keys(style).length > 0) out[partId] = style
  }
  return out
}

function isGradient(v: string): boolean {
  // No url() or expressions: share codes come from other people.
  return /^(repeating-)?(linear|radial|conic)-gradient\([^;{}]*\)$/.test(v.trim()) && !/url\s*\(/i.test(v)
}

/** A colour or a url()-free gradient. */
function isPaint(v: unknown): v is string {
  return typeof v === 'string' && (isColor(v) || isGradient(v))
}

/**
 * Library items that can carry custom artwork: folders, and Liked Songs under the URI Spotify itself uses for it
 * (`spotify:collection:tracks`; its sidebar row has a per-user playlist URI instead, so library/ keys it by cover).
 */
const ARTWORK_URI = /^(?:spotify:user:[^:\s]+:folder:[A-Za-z0-9]+|spotify:collection:tracks)$/
const FOLDER_IMAGE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/
/** Folder art is downscaled to ≤ 256 px before saving; anything bigger is not ours and would bloat settings.json. */
export const FOLDER_IMAGE_MAX_CHARS = 200 * 1024

function validateArtworkStyle(input: unknown): ArtworkStyle | null {
  if (!isRecord(input)) return null
  const style: ArtworkStyle = {}
  const { image, icon, color, background } = input
  if (typeof image === 'string' && image.length <= FOLDER_IMAGE_MAX_CHARS && FOLDER_IMAGE.test(image)) style.image = image
  if (typeof icon === 'string' && isSlug(icon)) style.icon = icon
  if (isColor(color)) style.color = normalizeHex(color)
  if (isPaint(background)) style.background = background
  return Object.keys(style).length > 0 ? style : null
}

function validateArtworkStyles(input: unknown): Record<string, ArtworkStyle> {
  if (!isRecord(input)) return {}
  const out: Record<string, ArtworkStyle> = {}
  for (const [uri, value] of Object.entries(input)) {
    const style = ARTWORK_URI.test(uri) ? validateArtworkStyle(value) : null
    if (style) out[uri] = style
  }
  return out
}

export function defaultReactiveSettings(): ReactiveSettings {
  return { enabled: false, syncMs: 0 }
}

export function defaultSettings(activeTheme: string): Settings {
  return {
    schema: 1,
    activeTheme,
    home: { hidden: [], order: [] },
    extensions: {},
    extensionData: {},
    artworkStyles: {},
    reactive: defaultReactiveSettings(),
  }
}

/** Settings from the helper are trusted structurally but filled in defensively (older files, hand edits). */
export function normalizeSettings(input: unknown, fallbackTheme: string): Settings {
  const d = defaultSettings(fallbackTheme)
  if (!isRecord(input)) return d
  const home = isRecord(input.home) ? input.home : {}
  return {
    schema: 1,
    activeTheme: typeof input.activeTheme === 'string' ? input.activeTheme : d.activeTheme,
    home: {
      hidden: isStringArray(home.hidden) ? home.hidden : [],
      order: isStringArray(home.order) ? home.order : [],
    },
    extensions: isRecord(input.extensions)
      ? Object.fromEntries(Object.entries(input.extensions).filter((e): e is [string, boolean] => typeof e[1] === 'boolean'))
      : {},
    extensionData: isRecord(input.extensionData)
      ? Object.fromEntries(Object.entries(input.extensionData).filter((e): e is [string, Record<string, unknown>] => isRecord(e[1])))
      : {},
    // `folderStyles` was the key's name during the first day of live testing.
    artworkStyles: validateArtworkStyles(isRecord(input.artworkStyles) ? input.artworkStyles : input.folderStyles),
    reactive: normalizeReactiveSettings(input.reactive),
  }
}

function normalizeReactiveSettings(input: unknown): ReactiveSettings {
  const d = defaultReactiveSettings()
  if (!isRecord(input)) return d
  return {
    enabled: input.enabled === true,
    syncMs: Math.round(clampNumber(input.syncMs, REACTIVE_SYNC_MIN, REACTIVE_SYNC_MAX, d.syncMs)),
  }
}

// ---------- identity ----------

/** Theme ids double as folder names in the helper, so they are restricted to safe path segments. */
export function isSlug(s: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 48
}

export function slugify(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '')
  return slug || 'theme'
}

export function uniqueId(base: string, taken: Iterable<string>): string {
  const used = new Set(taken)
  const root = slugify(base)
  if (!used.has(root)) return root
  for (let i = 2; ; i++) {
    const candidate = `${root}-${i}`
    if (!used.has(candidate)) return candidate
  }
}

export function uniqueName(base: string, taken: Iterable<string>): string {
  const used = new Set(taken)
  if (!used.has(base)) return base
  for (let i = 2; ; i++) {
    const candidate = `${base} ${i}`
    if (!used.has(candidate)) return candidate
  }
}

/** A user-owned copy of a preset: "<name> (my version)". */
export function forkTheme(preset: Theme, takenIds: Iterable<string>, takenNames: Iterable<string> = []): Theme {
  const name = uniqueName(`${preset.name} (my version)`, takenNames)
  return { ...structuredClone(preset), id: uniqueId(name, takenIds), name, basedOn: preset.id }
}
