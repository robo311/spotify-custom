import { describe, expect, it } from 'vitest'
import { FOLDER_IMAGE_MAX_CHARS, PART_SIZE_MAX, ThemeValidationError, defaultHomeStyle, defaultLayout, defaultNowPlaying, defaultPageStyle, defaultLyrics, defaultReactiveLook, forkTheme, isSlug, normalizeSettings, slugify, uniqueId, validateTheme } from './model'
import { PRESETS } from './presets'

const darcula = PRESETS[0]

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

  it('replaces unsafe ids (they become folder names) with a slug of the name', () => {
    expect(validateTheme({ ...darcula, id: '../../etc' }).id).toBe('darcula')
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
    })
    expect(normalizeSettings(null, 'darcula').activeTheme).toBe('darcula')
  })

  it('keeps music-reactive off unless explicitly on, and clamps the sync offset', () => {
    expect(normalizeSettings({ reactive: { enabled: 'yes', syncMs: 999 } }, 'darcula').reactive).toEqual({ enabled: false, syncMs: 300 })
    expect(normalizeSettings({ reactive: { enabled: true, syncMs: -42.4 } }, 'darcula').reactive).toEqual({ enabled: true, syncMs: -42 })
    expect(normalizeSettings({ reactive: { enabled: true, syncMs: 'x' } }, 'darcula').reactive).toEqual({ enabled: true, syncMs: 0 })
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
    expect(v.pulse).toEqual({ on: false, intensity: 0, cover: false, play: true, entry: true })
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
    })
    expect(t.lyrics).toEqual({ background: 'spotify', fontScale: 1, font: 'theme', align: 'left' })
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
    expect(t.lyrics).toEqual({ background: 'cover-blur', fontScale: 1.5, font: 'jetbrains-mono', align: 'center', activeLine: '#ffffff' })
    expect(t.layout.nowPlaying).toEqual({ ...defaultNowPlaying(), order: ['lyrics'], compactCover: true })
    expect(t.layout.lyricsImmersive).toBe(true)
  })

  it('falls back to defaults for unknown lyrics backgrounds and fonts', () => {
    const t = validateTheme({ ...darcula, lyrics: { background: 'rainbow', font: 'comic-sans', fontScale: 0.1 } })
    expect(t.lyrics).toMatchObject({ background: 'spotify', font: 'theme', fontScale: 0.75 })
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
