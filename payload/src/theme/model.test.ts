import type { PartStyle } from '../types'
import { describe, expect, it } from 'vitest'
import { BAR_LAYER_BLUR_MAX, BAR_LAYER_MAX_CHARS, BAR_LAYER_SIZE, BAR_LAYER_X, BAR_LAYER_Y, BAR_LAYERS_MAX, FOLDER_IMAGE_MAX_CHARS, PART_SIZE_MAX, defaultBarLayer, ThemeValidationError, defaultHomeStyle, defaultLayout, defaultNowPlaying, defaultSearchDropdown, defaultPageStyle, defaultLyrics, defaultLyricsAnimation, defaultMenuSettings, defaultReactiveLook, forkTheme, isSlug, normalizeSettings, slugify, uniqueId, validateTheme } from './model'
import { PRESETS } from './presets'

const [darcula] = PRESETS.filter(p => p.id === 'darcula')

describe('validateTheme', () => {
  it('fills optional fields with defaults', () => {
    const t = validateTheme({ name: 'Bare', palette: darcula.palette })
    expect(t).toMatchObject({
      schema: 1,
      id: 'bare',
      basedOn: null,
      font: 'inter',
      radius: 8,
      parts: {},
      layout: defaultLayout(),
      lyrics: defaultLyrics(),
      icons: 'spotify',
      effects: { albumMode: false, ambientGlow: false, progressBar: 'spotify' },
      css: '',
    })
  })

  it('normalises colours and clamps the radius', () => {
    const t = validateTheme({ ...darcula, palette: { ...darcula.palette, accent: '#ABC' }, radius: 99 })
    expect(t.palette.accent).toBe('#aabbcc')
    expect(t.radius).toBe(24)
  })

  it.each([
    [null, 'must be an object'],
    [{ palette: darcula.palette }, 'needs a name'],
    [{ name: 'X' }, 'has no colours'],
    [{ name: 'X', palette: { ...darcula.palette, text: 'nope' } }, 'colour "text"'],
    [{ ...darcula, schema: 99 }, 'newer version'],
  ])('rejects %j with a friendly message', (input, message) => {
    expect(() => validateTheme(input)).toThrow(ThemeValidationError)
    expect(() => validateTheme(input)).toThrow(message)
  })

  it('keeps colour and gradient part styles but drops unsafe or unknown values', () => {
    const t = validateTheme({
      ...darcula,
      parts: {
        playerBar: { background: 'linear-gradient(#000, #111)', text: '#fff', bogus: 1 },
        sidebar: { background: 'url(https://evil.example/x.png)' },
        cards: { background: 'linear-gradient(url(x), #000)' },
        topBar: { radius: 400 },
      },
    })
    expect(t.parts).toEqual({ playerBar: { background: 'linear-gradient(#000, #111)', text: '#fff' }, topBar: { radius: 24 } })
  })

  const partsWith = (background: string) => validateTheme({ ...darcula, parts: { playerBar: { background } } }).parts

  it.each([
    'linear-gradient(135deg, #ff6b6b 0%, #ff8f5a 45%, #ffc24b 100%)',
    'radial-gradient(circle at 20% 30%, rgb(10 20 30 / 0.5), transparent 70%)',
    'repeating-conic-gradient(from 0deg, #000 0 10deg, #fff 10deg 20deg)',
    'linear-gradient(red, blue), radial-gradient(circle, #f00, transparent)',
    'linear-gradient(calc(90deg * 2), var(--sc-accent), color-mix(in oklab, red 50%, blue))',
  ])('keeps the gradient %s', paint => {
    expect(partsWith(paint)).toEqual({ playerBar: { background: paint } })
  })

  it.each([
    'linear-gradient(red,blue), image-set("https://evil/p.png" 1x)',
    'linear-gradient(red,blue), \\75rl(https://evil)',
    'linear-gradient(red,blue)/*)',
    'linear-gradient(red,(blue)',
    'linear-gradient(red, blue))',
    'linear-gradient(red, blue) x (y)',
    'linear-gradient(red, blue),',
    'linear-gradient(red, blue), url(x)',
    "linear-gradient(red, blue), image('x')",
    'linear-gradient(red, blue), element(#x)',
    'linear-gradient(red, blue), cross-fade(red, blue)',
    'linear-gradient(red, blue) */',
    'linear-gradient(red, blue)@import',
  ])('drops the unsafe background %s', paint => {
    expect(partsWith(paint)).toEqual({})
  })

  it('replaces unsafe ids (they become folder names) with a slug of the name', () => {
    expect(validateTheme({ ...darcula, id: '../../etc' }).id).toBe('darcula')
    expect(validateTheme({ ...darcula, id: 'a..b' }).id).toBe('darcula')
    expect(validateTheme({ ...darcula, id: `a${'b'.repeat(100)}` }).id).toBe('darcula')
  })

  it("keeps any id the helper accepts as a folder name, so edits save back to the theme's own folder", () => {
    expect(validateTheme({ ...darcula, id: 'My_Theme.v2' }).id).toBe('My_Theme.v2')
  })
})

describe('bar layers', () => {
  const PNG = 'data:image/png;base64,iVBORw0KGgo='
  const layersOf = (layers: unknown, part = 'topBar') =>
    (validateTheme({ ...darcula, parts: { [part]: { layers } } }).parts as Partial<Record<string, PartStyle>>)[part]?.layers

  it('fills every setting with a default when only the picture is given', () => {
    expect(layersOf([{ src: { data: PNG } }])).toEqual([{ ...defaultBarLayer('layer-1'), src: { data: PNG } }])
    expect(defaultBarLayer('a')).toEqual({
      id: 'a', name: 'Picture', fit: 'fill', x: 50, y: 50, size: 100,
      opacity: 100, blur: 0, brightness: 100, fade: 'none', hidden: false,
    })
  })

  it('keeps ids and names, and clamps free placement to the overflow ranges', () => {
    const [layer] = layersOf([{ id: 'moon', name: 'moon.png', src: { builtin: 'planet' }, fit: 'free', x: 400, y: -900, size: 5, blur: 99, brightness: 10, opacity: 55.4, fade: 'left', hidden: true }]) ?? []
    expect(layer).toEqual({
      id: 'moon', name: 'moon.png', src: { builtin: 'planet' }, fit: 'free',
      x: BAR_LAYER_X.max, y: BAR_LAYER_Y.min, size: BAR_LAYER_SIZE.free.min,
      opacity: 55, blur: BAR_LAYER_BLUR_MAX, brightness: 50, fade: 'left', hidden: true,
    })
    expect(BAR_LAYER_X).toEqual({ min: -50, max: 150 })
    expect(BAR_LAYER_Y).toEqual({ min: -150, max: 250 })
  })

  it('keeps fill focus inside the picture and its zoom at 100–400 %', () => {
    const [layer] = layersOf([{ src: { data: PNG }, fit: 'fill', x: 140, y: -3, size: 20 }]) ?? []
    expect(layer).toMatchObject({ x: 100, y: 0, size: 100 })
    expect(layersOf([{ src: { data: PNG }, fit: 'fill', size: 900 }])?.[0]?.size).toBe(400)
  })

  it('keeps at most five layers and gives clashing or missing ids fresh ones', () => {
    const layers = layersOf(Array.from({ length: 7 }, () => ({ id: 'same', src: { data: PNG } }))) ?? []
    expect(layers).toHaveLength(BAR_LAYERS_MAX)
    expect(BAR_LAYERS_MAX).toBe(5)
    expect(new Set(layers.map(l => l.id)).size).toBe(5)
    expect(layers[0]?.id).toBe('same')
  })

  it('trims long names and replaces empty ones', () => {
    expect(layersOf([{ src: { data: PNG }, name: 'x'.repeat(80) }])?.[0]?.name).toHaveLength(40)
    expect(layersOf([{ src: { data: PNG }, name: '  ' }])?.[0]?.name).toBe('Picture')
  })

  it('falls back to defaults for unknown choices', () => {
    expect(layersOf([{ src: { data: PNG }, fit: 'stretch', fade: 'top', x: 'left' }])?.[0]).toMatchObject({ fit: 'fill', fade: 'none', x: 50 })
  })

  it.each([
    ['no picture', {}],
    ['a remote url', { src: { data: 'https://evil.example/x.png' } }],
    ['an svg upload', { src: { data: 'data:image/svg+xml;base64,PHN2Zz4=' } }],
    ['css in the data', { src: { data: `${PNG}"); background: red` } }],
    ['an oversized picture', { src: { data: 'data:image/webp;base64,' + 'A'.repeat(BAR_LAYER_MAX_CHARS) } }],
    ['a built-in id that is not a slug', { src: { builtin: '../x' } }],
    ['both kinds at once', { src: { builtin: 'planet', data: PNG } }],
  ])('drops a layer with %s and keeps the others', (_, bad) => {
    expect(layersOf([bad, { id: 'ok', src: { data: PNG } }])?.map(l => l.id)).toEqual(['ok'])
  })

  it('drops the list when nothing valid is left, keeping the rest of the part', () => {
    expect(validateTheme({ ...darcula, parts: { topBar: { text: '#ffffff', layers: [{ src: {} }] } } }).parts).toEqual({ topBar: { text: '#ffffff' } })
    expect(validateTheme({ ...darcula, parts: { topBar: { layers: 'nope' } } }).parts).toEqual({})
  })

  it('turns a picture from the single-image version into one layer', () => {
    const image = { src: { data: PNG }, fit: 'contain', x: 100, y: 50, opacity: 40, blur: 2, brightness: 120, fade: 'left' }
    expect(validateTheme({ ...darcula, parts: { topBar: { image } } }).parts.topBar.layers).toEqual([
      { ...defaultBarLayer('layer-1'), src: { data: PNG }, fit: 'free', x: 100, y: 50, size: 100, opacity: 40, blur: 2, brightness: 120, fade: 'left' },
    ])
    expect(validateTheme({ ...darcula, parts: { topBar: { image: { ...image, fit: 'cover', x: 80 } } } }).parts.topBar.layers?.[0]).toMatchObject({ fit: 'fill', x: 80, size: 100 })
    expect(validateTheme({ ...darcula, parts: { topBar: { image: { ...image, fit: 'tile' } } } }).parts.topBar.layers?.[0]).toMatchObject({ fit: 'tile', size: 100 })
  })
})

describe('identity helpers', () => {
  it('slugifies names into safe path segments', () => {
    expect(slugify('Môj Tmavý Štýl!!')).toBe('moj-tmavy-styl')
    expect(slugify('   ')).toBe('theme')
    expect(isSlug(slugify('A'.repeat(100)))).toBe(true)
  })

  it('makes ids unique', () => {
    expect(uniqueId('Nord', ['nord', 'nord-2'])).toBe('nord-3')
  })

  it('forks a preset into "<name> (my version)"', () => {
    const fork = forkTheme(darcula, ['darcula'], ['Darcula (my version)'])
    expect(fork).toMatchObject({ name: 'Darcula (my version) 2', id: 'darcula-my-version-2', basedOn: 'darcula' })
    expect(fork.palette).toEqual(darcula.palette)
    expect(fork.palette).not.toBe(darcula.palette)
  })
})

describe('normalizeSettings', () => {
  it('fills defaults and drops malformed entries', () => {
    expect(normalizeSettings({ activeTheme: 'nord', extensions: { stats: true, bad: 'yes' }, home: { hidden: 'x' } }, 'darcula')).toEqual({
      schema: 1,
      activeTheme: 'nord',
      home: { hidden: [], order: [] },
      extensions: { stats: true },
      extensionData: {},
      artworkStyles: {},
      reactive: { enabled: false, syncMs: 0 },
      lyricsColumnCollapsed: false,
      menu: defaultMenuSettings(),
    })
    expect(normalizeSettings(null, 'darcula').activeTheme).toBe('darcula')
    expect(normalizeSettings(null, 'darcula').lyricsColumnCollapsed).toBe(false)
    expect(normalizeSettings({ lyricsColumnCollapsed: true }, 'darcula').lyricsColumnCollapsed).toBe(true)
    expect(normalizeSettings({ lyricsColumnCollapsed: 'yes' }, 'darcula').lyricsColumnCollapsed).toBe(false)
  })

  it('keeps music-reactive off unless explicitly on, and clamps the sync offset', () => {
    expect(normalizeSettings({ reactive: { enabled: 'yes', syncMs: 999 } }, 'darcula').reactive).toEqual({ enabled: false, syncMs: 300 })
    expect(normalizeSettings({ reactive: { enabled: true, syncMs: -42.4 } }, 'darcula').reactive).toEqual({ enabled: true, syncMs: -42 })
    expect(normalizeSettings({ reactive: { enabled: true, syncMs: 'x' } }, 'darcula').reactive).toEqual({ enabled: true, syncMs: 0 })
  })
})

describe('menu settings', () => {
  const menu = (input: unknown) => normalizeSettings({ menu: input }, 'darcula').menu

  it('starts with our menu and Add to queue on song rows', () => {
    expect(menu(undefined)).toEqual({
      enabled: true,
      preset: 'ours',
      custom: [],
      playlists: { sort: 'library', order: [], pinned: [], covers: true, folders: true },
      shortcuts: { rows: ['add-to-queue'], queue: [], playerBar: [], search: [] },
      hideSpotifyAdd: [],
    })
  })

  it('keeps a valid custom layout and drops malformed rows', () => {
    const custom = [
      { kind: 'group', label: 'Mine' },
      { kind: 'item', key: 'add-to-queue' },
      { kind: 'item', key: 'show-credits', hidden: true },
      { kind: 'separator' },
      { kind: 'item', key: 'add-to-queue' }, // duplicate
      { kind: 'item', key: '' },
      { kind: 'group', label: 'x'.repeat(80) },
      { kind: 'bogus' },
      'separator',
    ]
    expect(menu({ enabled: false, preset: 'custom', custom }).custom).toEqual([
      { kind: 'group', label: 'Mine' },
      { kind: 'item', key: 'add-to-queue' },
      { kind: 'item', key: 'show-credits', hidden: true },
      { kind: 'separator' },
      { kind: 'group', label: 'x'.repeat(40) },
    ])
    expect(menu({ enabled: false, preset: 'nope' })).toMatchObject({ enabled: false, preset: 'ours' })
  })

  it('validates the playlist submenu and shortcuts', () => {
    const m = menu({
      playlists: { sort: 'name', order: ['spotify:playlist:a', 3], pinned: 'x', covers: false, folders: 'no' },
      shortcuts: { rows: ['go-to-album', 'nope', 'go-to-album', 'share', 'add-to-queue', 'go-to-radio'], queue: 'x', playerBar: ['add-to-liked-songs'], search: ['share', 7] },
    })
    expect(m.playlists).toEqual({ sort: 'name', order: ['spotify:playlist:a'], pinned: [], covers: false, folders: true })
    expect(m.shortcuts).toEqual({ rows: ['go-to-album', 'share', 'add-to-queue'], queue: [], playerBar: ['add-to-liked-songs'], search: ['share'] })
  })

  it("keeps Spotify's own add button hidden only where it exists (song rows, player bar, search)", () => {
    expect(menu({ hideSpotifyAdd: ['search', 'playerBar', 'queue', 'rows', 'rows', 7] }).hideSpotifyAdd).toEqual(['rows', 'playerBar', 'search'])
    expect(menu({ hideSpotifyAdd: 'rows' }).hideSpotifyAdd).toEqual([])
  })
})

describe('music-reactive look', () => {
  const look = (reactive: unknown) => validateTheme({ ...darcula, effects: { ...darcula.effects, reactive } }).effects.reactive

  it('gives themes made before it every effect off', () => {
    const { reactive: _omitted, ...oldEffects } = darcula.effects
    const old = validateTheme({ ...darcula, effects: oldEffects }).effects.reactive
    expect(old).toEqual(defaultReactiveLook())
    expect([old.spectrum.on, old.pulse.on, old.background.on, old.lyrics.on]).toEqual([false, false, false, false])
  })

  it('clamps numbers and falls back on unknown choices', () => {
    const v = look({
      sensitivity: 9,
      spectrum: { on: true, intensity: 140, shape: 'spiral', color: 'cover' },
      pulse: { on: 1, intensity: -5, cover: false },
      background: 'loud',
      lyrics: { on: true, intensity: 33.3 },
    })
    expect(v.sensitivity).toBe(2)
    expect(v.spectrum).toEqual({ on: true, intensity: 100, shape: 'bars', color: 'cover' })
    expect(v.pulse).toEqual({ on: false, intensity: 0, cover: false, play: true })
    expect(v.background).toEqual(defaultReactiveLook().background)
    expect(v.lyrics).toEqual({ on: true, intensity: 33 })
  })

  it('round-trips a valid look unchanged', () => {
    const valid = { ...defaultReactiveLook(), sensitivity: 1.25 }
    valid.spectrum = { on: true, intensity: 80, shape: 'line', color: 'accent' }
    valid.background = { on: true, intensity: 40, color: 'custom', customColor: '#ff8800' }
    expect(look(valid)).toEqual(valid)
  })

  it('knows the blocks and peaks spectrum shapes', () => {
    expect(look({ spectrum: { shape: 'blocks' } }).spectrum.shape).toBe('blocks')
    expect(look({ spectrum: { shape: 'peaks' } }).spectrum.shape).toBe('peaks')
  })

  it('lights the background in the cover colour by default and keeps only valid custom colours', () => {
    expect(defaultReactiveLook().background).toMatchObject({ color: 'cover', customColor: null })
    expect(look({ background: { color: 'custom', customColor: '#ABC' } }).background).toMatchObject({ color: 'custom', customColor: '#aabbcc' })
    expect(look({ background: { color: 'custom', customColor: 'url(x)' } }).background).toMatchObject({ color: 'custom', customColor: null })
    expect(look({ background: { color: 'neon' } }).background.color).toBe('cover')
  })
})

describe('themes saved before lyrics and Now playing layout existed', () => {
  // A theme.json / share code payload exactly as an early version wrote it.
  const legacy = {
    schema: 1,
    id: 'old-favourite',
    name: 'Old favourite',
    basedOn: 'darcula',
    palette: darcula.palette,
    font: 'inter',
    radius: 6,
    parts: {},
    layout: { hidden: ['friendActivity'], compactPlayer: true, librarySide: 'left' },
    icons: 'line',
    effects: { albumMode: false, ambientGlow: false },
    css: '',
  }

  it('fills the new fields with defaults and keeps everything else', () => {
    const t = validateTheme(legacy)
    expect(t.layout).toEqual({
      hidden: ['friendActivity'],
      compactPlayer: true,
      librarySide: 'left',
      searchPosition: 'centre',
      nowPlaying: defaultNowPlaying(),
      lyricsKeepLibrary: false,
      lyricsImmersive: false,
      lyricsNowPlaying: false,
      lyricsNowPlayingVideo: true,
      lyricsNowPlayingQueue: true,
      lyricsLibraryFloating: false,
      lyricsPanelFloating: false,
      searchDropdown: defaultSearchDropdown(),
    })
    expect(t.lyrics).toEqual({ background: 'spotify', fontScale: 1, font: 'theme', align: 'left', animated: defaultLyricsAnimation() })
    expect(t.lyrics.animated.on).toBe(true)
    expect(validateTheme(t)).toEqual(t)
  })
})

describe('lyrics and Now playing validation', () => {
  it('keeps valid values, clamps the scale and drops junk', () => {
    const t = validateTheme({
      ...darcula,
      lyrics: { background: 'cover-blur', fontScale: 9, font: 'jetbrains-mono', align: 'center', activeLine: '#FFF', pastLine: 'nope' },
      layout: { nowPlaying: { hidden: ['credits', 'credits', 3], order: ['lyrics'], compactCover: true }, lyricsImmersive: true },
    })
    expect(t.lyrics).toEqual({
      background: 'cover-blur',
      fontScale: 1.5,
      font: 'jetbrains-mono',
      align: 'center',
      activeLine: '#ffffff',
      animated: defaultLyricsAnimation(),
    })
    expect(t.layout.nowPlaying).toEqual({ ...defaultNowPlaying(), order: ['lyrics'], compactCover: true })
    expect(t.layout.lyricsImmersive).toBe(true)
  })

  it('falls back to defaults for unknown lyrics backgrounds and fonts', () => {
    const t = validateTheme({ ...darcula, lyrics: { background: 'rainbow', font: 'comic-sans', fontScale: 0.1 } })
    expect(t.lyrics).toMatchObject({ background: 'spotify', font: 'theme', fontScale: 0.75 })
  })

  it('keeps animated lyrics options and fills the rest with defaults', () => {
    const t = validateTheme({ ...darcula, lyrics: { animated: { on: true, glow: false, gradient: true, layout: 'cover-left', words: 'yes' } } })
    expect(t.lyrics.animated).toEqual({ ...defaultLyricsAnimation(), on: true, glow: false, gradient: true, layout: 'cover-left' })
    expect(validateTheme({ ...darcula, lyrics: { animated: { layout: 'sideways' } } }).lyrics.animated.layout).toBe('lyrics')
  })
})

describe('folder styles', () => {
  const uri = 'spotify:user:217gf5ymk5swgavqoqjayh5mi:folder:7a1b2c3d4e5f'
  const png = 'data:image/png;base64,iVBORw0KGgo='
  const styles = (artworkStyles: unknown) => normalizeSettings({ artworkStyles }, 'darcula').artworkStyles

  it('keeps valid image, icon, colour and gradient background', () => {
    expect(styles({ [uri]: { image: png, icon: 'vinyl-record', color: '#ABC', background: 'linear-gradient(#000, #111)' } })).toEqual({
      [uri]: { image: png, icon: 'vinyl-record', color: '#aabbcc', background: 'linear-gradient(#000, #111)' },
    })
  })

  it.each([
    ['an SVG image (can carry script)', { image: 'data:image/svg+xml;base64,PHN2Zz4=' }],
    ['a remote image', { image: 'https://example.com/x.png' }],
    ['an oversized image', { image: 'data:image/png;base64,' + 'A'.repeat(FOLDER_IMAGE_MAX_CHARS) }],
    ['an icon that is not a slug', { icon: '../../x' }],
    ['a background with url()', { background: 'linear-gradient(url(x), #000)' }],
    ['an invalid colour', { color: 'blue-ish' }],
  ])('drops %s', (_why, style) => {
    expect(styles({ [uri]: style })).toEqual({})
  })

  it('accepts Liked Songs (exact spotify:collection:tracks) and rejects look-alikes', () => {
    const liked = 'spotify:collection:tracks'
    expect(styles({ [liked]: { icon: 'heart' } })).toEqual({ [liked]: { icon: 'heart' } })
    for (const key of [`${liked}-1`, 'spotify:collection', 'spotify:user:u:collection', `${liked} `, `x${liked}`]) {
      expect(styles({ [key]: { icon: 'heart' } })).toEqual({})
    }
  })

  it('accepts Your Episodes (exact spotify:collection:your-episodes) and rejects look-alikes', () => {
    const episodes = 'spotify:collection:your-episodes'
    expect(styles({ [episodes]: { icon: 'star' } })).toEqual({ [episodes]: { icon: 'star' } })
    for (const key of [`${episodes}-1`, 'spotify:collection:episodes', `${episodes} `]) expect(styles({ [key]: { icon: 'star' } })).toEqual({})
  })

  it('migrates the old folderStyles key, preferring artworkStyles when both exist', () => {
    expect(normalizeSettings({ folderStyles: { [uri]: { icon: 'star' } } }, 'darcula').artworkStyles).toEqual({ [uri]: { icon: 'star' } })
    expect(normalizeSettings({ folderStyles: { [uri]: { icon: 'star' } }, artworkStyles: {} }, 'darcula').artworkStyles).toEqual({})
    expect(normalizeSettings({ folderStyles: {} }, 'darcula')).not.toHaveProperty('folderStyles')
  })

  it('drops entries whose key is not a folder URI and keeps the valid parts of mixed entries', () => {
    expect(styles({ 'spotify:playlist:abc': { icon: 'star' }, [uri]: { icon: 'star', image: 'nope' } })).toEqual({ [uri]: { icon: 'star' } })
  })
})

describe('progress bar style', () => {
  it('defaults old themes to Spotify and keeps known styles only', () => {
    expect(validateTheme({ ...darcula, effects: { albumMode: true } }).effects).toEqual({
      albumMode: true,
      ambientGlow: false,
      canvasAlbum: false,
      canvasPlayerBar: false,
      progressBar: 'spotify',
      reactive: defaultReactiveLook(),
    })
    expect(validateTheme({ ...darcula, effects: { canvasAlbum: true } }).effects).toMatchObject({ canvasAlbum: true, canvasPlayerBar: false })
    // The single switch it replaced turns both on.
    expect(validateTheme({ ...darcula, effects: { canvasCover: true } }).effects).toMatchObject({ canvasAlbum: true, canvasPlayerBar: true })
    expect(validateTheme({ ...darcula, effects: { progressBar: 'wave' } }).effects.progressBar).toBe('wave')
    expect(validateTheme({ ...darcula, effects: { progressBar: 'segments' } }).effects.progressBar).toBe('segments')
    expect(validateTheme({ ...darcula, effects: { progressBar: 'stripes' } }).effects.progressBar).toBe('stripes')
    expect(validateTheme({ ...darcula, effects: { progressBar: 'sparkles' } }).effects.progressBar).toBe('spotify')
  })
})

describe('lyrics page Now playing column', () => {
  it('defaults to off for old themes and keeps an explicit true', () => {
    expect(validateTheme({ ...darcula, layout: { compactPlayer: true } }).layout.lyricsNowPlaying).toBe(false)
    expect(validateTheme({ ...darcula, layout: { lyricsNowPlaying: true } }).layout.lyricsNowPlaying).toBe(true)
    expect(validateTheme({ ...darcula, layout: { lyricsNowPlaying: 'yes' } }).layout.lyricsNowPlaying).toBe(false)
  })

  it("plays the Canvas in the column unless a theme turns it off (old themes keep it on)", () => {
    expect(validateTheme({ ...darcula, layout: {} }).layout.lyricsNowPlayingVideo).toBe(true)
    expect(validateTheme({ ...darcula, layout: { lyricsNowPlayingVideo: false } }).layout.lyricsNowPlayingVideo).toBe(false)
    expect(validateTheme({ ...darcula, layout: { lyricsNowPlayingVideo: 'no' } }).layout.lyricsNowPlayingVideo).toBe(true)
    expect(validateTheme({ ...darcula, layout: {} }).layout.lyricsNowPlayingQueue).toBe(true)
    expect(validateTheme({ ...darcula, layout: { lyricsNowPlayingQueue: false } }).layout.lyricsNowPlayingQueue).toBe(false)
    expect(validateTheme({ ...darcula, layout: {} }).layout.lyricsLibraryFloating).toBe(false)
    expect(validateTheme({ ...darcula, layout: { lyricsLibraryFloating: true } }).layout.lyricsLibraryFloating).toBe(true)
    expect(validateTheme({ ...darcula, layout: {} }).layout.lyricsPanelFloating).toBe(false)
    expect(validateTheme({ ...darcula, layout: { lyricsPanelFloating: true } }).layout.lyricsPanelFloating).toBe(true)
  })

  it("starts the search suggestions as Spotify's own and clamps what a theme sets", () => {
    const dropdown = (searchDropdown: unknown) => validateTheme({ ...darcula, layout: { searchDropdown } }).layout.searchDropdown
    expect(dropdown(undefined)).toEqual({ density: 'spotify', imageSize: 48, textSize: 16, maxHeight: null, hideHints: false, hideTypeLabel: false })
    expect(dropdown({ density: 'dense', imageSize: 8, textSize: 30.4, maxHeight: 9999, hideHints: true, hideTypeLabel: 'yes' })).toEqual({
      density: 'dense', imageSize: 24, textSize: 18, maxHeight: 800, hideHints: true, hideTypeLabel: false,
    })
    expect(dropdown({ density: 'tiny', maxHeight: 'tall' })).toMatchObject({ density: 'spotify', maxHeight: null })
  })

  it('keeps a valid top bar search position, else centre', () => {
    expect(validateTheme({ ...darcula, layout: { searchPosition: 'right' } }).layout.searchPosition).toBe('right')
    expect(validateTheme({ ...darcula, layout: { searchPosition: 'top' } }).layout.searchPosition).toBe('centre')
  })
})

describe('Home look (shortcut cards, stats shelf)', () => {
  it('defaults old themes to Spotify-like values', () => {
    expect(validateTheme({ ...darcula, homeStyle: undefined }).homeStyle).toEqual(defaultHomeStyle())
    expect(defaultHomeStyle()).toEqual({ shortcutSize: 'spotify', shortcutColumns: 0, statsLayout: 'hero', statsCount: 5, statsRanks: true, statsGlow: true })
  })

  it('keeps valid values and replaces junk field by field', () => {
    const t = validateTheme({
      ...darcula,
      homeStyle: { shortcutSize: 'large', shortcutColumns: 4, statsLayout: 'grid', statsCount: 10, statsRanks: false, statsGlow: 'no' },
    })
    expect(t.homeStyle).toEqual({ shortcutSize: 'large', shortcutColumns: 4, statsLayout: 'grid', statsCount: 10, statsRanks: false, statsGlow: true })
    const junk = validateTheme({ ...darcula, homeStyle: { shortcutSize: 'huge', shortcutColumns: 7, statsLayout: 'pie', statsCount: 3 } })
    expect(junk.homeStyle).toEqual(defaultHomeStyle())
  })
})

describe('per-button icons', () => {
  const svg = '<svg viewBox="0 0 24 24"><path d="M1 1h22"/></svg>'

  it('keeps gallery ids and plain SVG markup for known buttons', () => {
    const t = validateTheme({ ...darcula, iconOverrides: { home: { gallery: 'castle' }, friends: { svg } } })
    expect(t.iconOverrides).toEqual({ home: { gallery: 'castle' }, friends: { svg } })
  })

  it.each([
    ['an unknown button', { teapot: { gallery: 'castle' } }],
    ['a gallery id that is not a slug', { home: { gallery: '../x' } }],
    ['markup that is not an svg', { home: { svg: '<img src=x>' } }],
    ['an svg with script', { home: { svg: '<svg><script>alert(1)</script></svg>' } }],
    ['an svg with an event handler', { home: { svg: '<svg onload="alert(1)"></svg>' } }],
    ['an svg with external references', { home: { svg: '<svg><image href="https://x/y.png"/></svg>' } }],
    ['an oversized svg', { home: { svg: `<svg>${'<path d="M0 0"/>'.repeat(2000)}</svg>` } }],
  ])('drops %s', (_why, iconOverrides) => {
    expect(validateTheme({ ...darcula, iconOverrides }).iconOverrides).toEqual({})
  })
})

describe('part size', () => {
  it('keeps a clamped button size', () => {
    const t = validateTheme({ ...darcula, parts: { homeButton: { size: 200 }, other: { size: 'big' } } })
    expect(t.parts).toEqual({ homeButton: { size: PART_SIZE_MAX } })
  })
})

describe('play buttons split into card and player buttons', () => {
  const old = { background: '#ff7a59', radius: 6 }

  it('gives a theme saved with one play button style the same look on both', () => {
    expect(validateTheme({ ...darcula, parts: { playButton: old } }).parts).toEqual({ cardPlayButton: old, playerPlayButton: old })
  })

  it('keeps styles already split, and stays the same when loaded again', () => {
    const once = validateTheme({ ...darcula, parts: { playButton: old, playerPlayButton: { text: '#000000' } } })
    expect(once.parts).toEqual({ cardPlayButton: old, playerPlayButton: { text: '#000000' } })
    expect(validateTheme(once).parts).toEqual(once.parts)
  })

  it('keeps a reset button reset', () => {
    const split = validateTheme({ ...darcula, parts: { playButton: old } })
    const { playerPlayButton: _reset, ...rest } = split.parts
    expect(validateTheme({ ...split, parts: rest }).parts).toEqual({ cardPlayButton: old })
  })
})

describe('Now playing song header and cards', () => {
  it('defaults to Spotify and keeps valid choices, clamping numbers', () => {
    expect(defaultNowPlaying()).toMatchObject({ coverHeight: 'spotify', coverShade: 'spotify', titleScale: 1, hideVideoSwitch: false, hideLikeButton: false, cardGap: 16 })
    const t = validateTheme({
      ...darcula,
      layout: { nowPlaying: { coverHeight: 'tall', coverShade: 'strong', titleScale: 9, hideVideoSwitch: true, hideLikeButton: 'yes', cardGap: 7.6 } },
    })
    expect(t.layout.nowPlaying).toMatchObject({ coverHeight: 'tall', coverShade: 'strong', titleScale: 1.5, hideVideoSwitch: true, hideLikeButton: false, cardGap: 8 })
    expect(validateTheme({ ...darcula, layout: { nowPlaying: { coverShade: 'pitch', cardGap: -4 } } }).layout.nowPlaying).toMatchObject({ coverShade: 'spotify', cardGap: 0 })
  })
})

describe('album / playlist / song page look', () => {
  it("defaults to Spotify's look", () => {
    expect(validateTheme({ ...darcula, pageStyle: undefined }).pageStyle).toEqual(defaultPageStyle())
  })

  it('keeps valid choices, clamps numbers and drops junk field by field', () => {
    const t = validateTheme({
      ...darcula,
      pageStyle: { backdrop: 'cover-blur', headerHeight: 'tall', headerLayout: 'banner', coverSize: 999, coverRadius: 99, coverShadow: 'glow', titleScale: 3, rows: 'outlined', playingRow: true, fewerColumns: true },
    })
    expect(t.pageStyle).toEqual({ ...defaultPageStyle(), backdrop: 'cover-blur', headerHeight: 'tall', headerLayout: 'banner', coverSize: 320, coverRadius: 24, coverShadow: 'glow', titleScale: 1.4, rows: 'outlined', playingRow: true })
    expect(validateTheme({ ...darcula, pageStyle: { backdrop: 'lava', rows: 'zebra', coverRadius: 'round' } }).pageStyle).toEqual(defaultPageStyle())
  })

  it('keeps the newer header, play button, track list and artist choices, and drops junk', () => {
    const page = {
      backdrop: 'custom',
      backdropColor: '#FF8800',
      backdropStrength: 140,
      titleWeight: 'black',
      titleSpacing: 'wide',
      titleUppercase: true,
      playSize: 'large',
      playShape: 'pill',
      thumbnails: 'circle',
      indexStyle: 'accent',
      hideColumnHeader: true,
      artistBanner: 'tint',
      artistBannerHeight: 'compact',
      artistNameScale: 0.1,
    }
    expect(validateTheme({ ...darcula, pageStyle: page }).pageStyle).toEqual({
      ...defaultPageStyle(),
      ...page,
      backdropColor: '#ff8800',
      backdropStrength: 100,
      artistNameScale: 0.6,
    })
    const junk = { backdropColor: 'red-ish', backdropStrength: 'half', titleWeight: 'heavy', playShape: 'star', thumbnails: 'big', indexStyle: 'roman', artistBanner: 'lava', artistNameScale: 'big' }
    expect(validateTheme({ ...darcula, pageStyle: junk }).pageStyle).toEqual(defaultPageStyle())
  })

  it("keeps a centred header from themes made before the layout choice, and drops an unknown layout", () => {
    expect(validateTheme({ ...darcula, pageStyle: { centred: true } }).pageStyle.headerLayout).toBe('centred')
    expect(validateTheme({ ...darcula, pageStyle: { headerLayout: 'poster' } }).pageStyle.headerLayout).toBe('spotify')
    expect(validateTheme({ ...darcula, pageStyle: { centred: true } }).pageStyle).not.toHaveProperty('centred')
  })

  it('sizes the cover in pixels, keeping the Small and Large of older themes', () => {
    const size = (coverSize: unknown) => validateTheme({ ...darcula, pageStyle: { coverSize } }).pageStyle.coverSize
    expect(size(250.4)).toBe(250)
    expect(size(10)).toBe(96)
    expect(size('small')).toBe(160)
    expect(size('large')).toBe(300)
    expect(size('spotify')).toBeNull()
    expect(size('huge')).toBeNull()
  })

  it('keeps an equaliser colour, or follows the playing-row colour', () => {
    expect(validateTheme({ ...darcula, pageStyle: { equaliserColor: '#FF0000' } }).pageStyle.equaliserColor).toBe('#ff0000')
    expect(validateTheme({ ...darcula, pageStyle: { equaliserColor: 'nope' } }).pageStyle.equaliserColor).toBeNull()
  })

  it('keeps CD covers and the spinning cover', () => {
    expect(validateTheme({ ...darcula, pageStyle: { thumbnails: 'cd', playingSpin: true } }).pageStyle).toMatchObject({ thumbnails: 'cd', playingSpin: true })
    expect(validateTheme({ ...darcula, pageStyle: { playingSpin: 'yes' } }).pageStyle.playingSpin).toBe(false)
  })

  it('keeps the playing-row look and clamps its strength', () => {
    const page = validateTheme({ ...darcula, pageStyle: { playingStyle: 'outline', playingColor: '#FF0088', playingStrength: 90, playingTitle: true } }).pageStyle
    expect(page).toMatchObject({ playingStyle: 'outline', playingColor: '#ff0088', playingStrength: 40, playingTitle: true })
    expect(validateTheme({ ...darcula, pageStyle: { playingStyle: 'neon', playingColor: 'not-a-colour', playingStrength: 'max' } }).pageStyle).toMatchObject({
      playingStyle: 'bar',
      playingColor: null,
      playingStrength: 16,
    })
  })

  it('falls back to the accent wash when a custom backdrop has no colour', () => {
    expect(validateTheme({ ...darcula, pageStyle: { backdrop: 'custom' } }).pageStyle.backdrop).toBe('accent')
  })
})
