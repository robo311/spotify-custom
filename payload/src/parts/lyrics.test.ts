import { describe, expect, it } from 'vitest'
import { defaultNowPlaying } from '../theme/model'
import type { LayoutConfig, LyricsStyle } from '../types'
import { compileLyrics, compileLyricsIdle, compileLyricsLayout, compileLyricsMotion } from './lyrics'

const SPOTIFY: LyricsStyle = { background: 'spotify', fontScale: 1, font: 'theme', align: 'left' }
const LAYOUT: LayoutConfig = {
  hidden: [],
  compactPlayer: false,
  librarySide: 'left',
  searchPosition: 'centre',
  nowPlaying: defaultNowPlaying(),
  lyricsKeepLibrary: false,
  lyricsImmersive: false,
  lyricsNowPlaying: false,
}

describe('compileLyrics', () => {
  it("only fades the scroll edges on Spotify's defaults", () => {
    const css = compileLyrics(SPOTIFY)
    expect(css).toContain('[data-overlayscrollbars-viewport] {\n  mask-image: linear-gradient(to bottom, transparent 0, #000 11%')
    expect(css).not.toContain('--lyrics-color')
    expect(css).not.toContain('--background-base')
  })

  it("drops Spotify's black frame (an 8px outline) around the lyrics view, so the gaps show the theme", () => {
    const css = compileLyrics(SPOTIFY)
    const rule = css.split('}').find(r => r.includes('outline')) ?? ''
    expect(rule).toContain(':has(> [data-overlayscrollbars]) > *')
    expect(rule).toContain('outline: none !important;')
  })

  // Spotify rewrites inline styles on many elements every frame while the lyrics view opens and closes. A :has()
  // that looks at style attributes makes each of those rewrites re-run it (measured live: ~9 ms per rewrite).
  it('never lets :has() depend on style attributes', () => {
    const layout = { ...LAYOUT, lyricsKeepLibrary: true, lyricsImmersive: true, lyricsNowPlaying: true }
    const style: LyricsStyle = { ...SPOTIFY, background: 'cover-blur' }
    const theme = { lyrics: style, layout }
    const css = [compileLyrics(style), compileLyricsLayout(layout), compileLyricsIdle(theme), compileLyricsMotion(theme)].join('\n')
    expect(hasArguments(css).length).toBeGreaterThan(0)
    expect(hasArguments(css).filter(arg => arg.includes('[style'))).toEqual([])
  })

  it('applies explicit line colours even on the Spotify background', () => {
    const css = compileLyrics({ ...SPOTIFY, activeLine: '#fff', inactiveLine: '#888' })
    expect(css).toContain('--lyrics-color-active: #fff !important;')
    expect(css).toContain('--lyrics-color-inactive: #888 !important;')
    expect(css).not.toContain('--lyrics-color-background:')
  })

  it('paints the theme background with the automatic line colours as live palette variables', () => {
    const css = compileLyrics({ ...SPOTIFY, background: 'theme' })
    expect(css).toContain('[style*="--lyrics-color-background"], [data-testid="lyrics-npv-section"] {')
    expect(css).toContain('--lyrics-color-background: var(--sc-background) !important;')
    expect(css).toContain('--lyrics-color-active: var(--sc-text) !important;')
    expect(css).toContain('--lyrics-color-inactive: var(--sc-text-subdued) !important;')
    expect(css).toContain('--sc-lyrics-past: color-mix(in srgb, var(--sc-text) 65%, var(--sc-background)) !important;')
    expect(css).toContain('--cinema-mode-bg-color-from: var(--sc-surface) !important;')
  })

  it('puts onAccent lines on the accent itself', () => {
    const css = compileLyrics({ ...SPOTIFY, background: 'accent' })
    expect(css).toContain('--lyrics-color-background: var(--sc-accent) !important;')
    expect(css).toContain('--lyrics-color-active: var(--sc-on-accent) !important;')
  })

  it('lets chosen colours win over automatic ones', () => {
    const css = compileLyrics({ ...SPOTIFY, background: 'theme', activeLine: '#ff0' })
    expect(css).toContain('--lyrics-color-active: #ff0 !important;')
  })

  it('puts the blurred cover behind the lyrics view and the preview card', () => {
    const css = compileLyrics({ ...SPOTIFY, background: 'cover-blur' })
    expect(css).toContain('--lyrics-color-background: transparent !important;')
    expect(css).toContain('[data-testid="lyrics-npv-section"]::before {')
    expect(css).toContain('div:has(> #Desktop_LeftSidebar_Id)::before {')
    expect(css.split('}').find(r => r.includes(':is(#Desktop_LeftSidebar_Id,'))).toContain('background: transparent !important;')
    expect(css).toContain(':has(#Desktop_PanelContainer_Id):not(:has(> [data-overlayscrollbars])) {\n  visibility: hidden !important;')
    expect(css).toContain('background-image: var(--sc-cover-url, none) !important;')
    for (const rule of css.split('}')) expect(rule).not.toMatch(/:has\([^)]*:has\(/)
  })

  it('switches past lines to their own colour at full opacity', () => {
    const css = compileLyrics({ ...SPOTIFY, pastLine: '#555' })
    expect(css).toContain('--sc-lyrics-past: #555 !important;')
    expect(css).toContain('--sc-lyrics-past-opacity: 1 !important;')
  })

  it('sets font, alignment and size', () => {
    const css = compileLyrics({ ...SPOTIFY, font: 'jetbrains-mono', align: 'center', fontScale: 1.25 })
    expect(css).toContain('font-family: "SC Mono", var(--fallback-fonts, monospace) !important;')
    expect(css).toContain('text-align: center !important;')
    expect(css).toContain('[style*="--cinema-mode-bg-color-from"] [data-testid="lyrics-line"] {\n  zoom: 1.25 !important;')
  })
})

describe('compileLyricsLayout', () => {
  it('gives a kept library the full height in immersive mode', () => {
    const fullHeight = (css: string) => css.split('}').find(rule => rule.includes('grid-row: 1 / -1')) ?? ''
    const kept = fullHeight(compileLyricsLayout({ ...LAYOUT, lyricsImmersive: true, lyricsKeepLibrary: true }))
    const alone = fullHeight(compileLyricsLayout({ ...LAYOUT, lyricsImmersive: true }))
    const sidebar = '[data-cinema-library-npv-preexit]) #Desktop_LeftSidebar_Id)'
    expect(kept).toContain(sidebar)
    expect(alone).not.toContain(sidebar)
  })


  it('keeps the library by giving the lyrics view the other columns', () => {
    const left = compileLyricsLayout({ ...LAYOUT, lyricsKeepLibrary: true })
    expect(left).toContain('[data-cinema-npv-postenter]')
    expect(left).toContain('#Desktop_LeftSidebar_Id {\n  transform: none !important;')
    expect(left).toContain('grid-column: main-view / right-sidebar !important;')
    const right = compileLyricsLayout({ ...LAYOUT, lyricsKeepLibrary: true, librarySide: 'right' })
    expect(right).toContain('grid-column: right-sidebar / main-view !important;')
  })

  it('hides the bars until hovered or focused in immersive mode', () => {
    const css = compileLyricsLayout({ ...LAYOUT, lyricsImmersive: true })
    expect(css).toContain('grid-row: 1 / -1 !important;')
    expect(css).toContain(':not(:has([data-overlayscrollbars])) {\n  opacity: 0 !important;')
    expect(css).toContain('opacity: 0 !important;')
    expect(css).toMatch(/:is\(:hover, :has\(:focus-visible\)\) \{\n {2}opacity: 1 !important;/)
    expect(css).toContain('translate: 0 64px !important;')
    // Chromium drops rules with :has() nested inside :has().
    for (const rule of css.split('}')) expect(rule).not.toMatch(/:has\([^)]*:has\(/)
  })
})

describe('our Now playing column beside the lyrics', () => {
  const RIGHT_OPEN = ':is([data-right-sidebar-open-duringenter], [data-right-sidebar-open-postenter], [data-right-sidebar-open-preexit])'
  const rules = (css: string) => css.split('}')
  const viewColumns = (css: string) => rules(css).find(r => r.includes('[data-sc-lyrics-npv]') && r.includes('grid-column')) ?? ''

  it('is not laid out unless the option is on', () => {
    expect(compileLyricsLayout(LAYOUT)).not.toContain('sc-lyrics-npv')
  })

  it('gives the column the right-panel slot once it is ready, only while no Spotify panel is open', () => {
    const css = compileLyricsLayout({ ...LAYOUT, lyricsNowPlaying: true })
    expect(css).toContain('#sc-lyrics-npv {\n  display: none !important;')
    const column = rules(css).find(r => r.includes('#sc-lyrics-npv') && r.includes('grid-area')) ?? ''
    expect(column).toContain('[data-sc-lyrics-npv]')
    expect(column).toContain(`:not(${RIGHT_OPEN})`)
    expect(column).toContain('grid-area: right-sidebar !important;')
    expect(column).toContain('display: flex !important;')
  })

  it('runs flush with the window edge, mirrored when the library is on the right', () => {
    const column = (layout: Partial<LayoutConfig>) =>
      rules(compileLyricsLayout({ ...LAYOUT, lyricsNowPlaying: true, ...layout })).find(r => r.includes('grid-area')) ?? ''
    expect(column({})).toContain('margin-right: calc(-1 * var(--panel-gap, 8px)) !important;')
    expect(column({})).toContain('--sc-lyrics-npv-radius: 8px 0 0 8px !important;')
    expect(column({ librarySide: 'right' })).toContain('margin-left: calc(-1 * var(--panel-gap, 8px)) !important;')
  })

  it('shrinks the lyrics view to make room, with or without the library, on either side', () => {
    const view = (layout: Partial<LayoutConfig>) => viewColumns(compileLyricsLayout({ ...LAYOUT, lyricsNowPlaying: true, ...layout }))
    expect(view({})).toContain('grid-column: left-sidebar / main-view !important;')
    expect(view({ librarySide: 'right' })).toContain('grid-column: main-view / left-sidebar !important;')
    expect(view({ lyricsKeepLibrary: true })).toContain('grid-column: main-view !important;')
    expect(view({ lyricsKeepLibrary: true, librarySide: 'right' })).toContain('grid-column: main-view !important;')
  })

  it('hides the empty panel slot behind it and takes the full height in immersive mode', () => {
    const css = compileLyricsLayout({ ...LAYOUT, lyricsNowPlaying: true, lyricsImmersive: true })
    const slot = rules(css).find(r => r.includes('[data-sc-lyrics-npv]') && r.includes('visibility: hidden')) ?? ''
    expect(slot).toContain('#Desktop_PanelContainer_Id')
    expect(rules(css).find(r => r.includes('grid-row: 1 / -1'))).toContain('#sc-lyrics-npv')
    for (const rule of rules(css)) expect(rule).not.toMatch(/:has\([^)]*:has\(/)
  })

  it('turns translucent over the blurred cover like the other columns', () => {
    const css = compileLyrics({ ...SPOTIFY, background: 'cover-blur' })
    expect(rules(css).find(r => r.includes('#sc-lyrics-npv'))).toContain('--background-base: color-mix(in oklab, var(--sc-surface) 55%, transparent)')
  })

  it('counts as customising the lyrics view (cancels Spotify\'s idle growth)', () => {
    expect(compileLyricsIdle({ lyrics: SPOTIFY, layout: { ...LAYOUT, lyricsNowPlaying: true } })).not.toBe('')
  })
})

describe('lyrics view with Spotify\'s right panel (queue, friends) open', () => {
  const RIGHT_OPEN = ':is([data-right-sidebar-open-duringenter], [data-right-sidebar-open-postenter], [data-right-sidebar-open-preexit])'

  it('keeps the library and gives the panel its column: library | lyrics | panel', () => {
    const css = compileLyricsLayout({ ...LAYOUT, lyricsKeepLibrary: true })
    const rule = css.split('}').find(r => r.includes(RIGHT_OPEN) && r.includes('grid-column')) ?? ''
    expect(rule).toContain('grid-column: main-view !important;')
  })

  it('mirrors with the library on the right (named areas swap)', () => {
    const css = compileLyricsLayout({ ...LAYOUT, lyricsKeepLibrary: true, librarySide: 'right' })
    expect(css.split('}').find(r => r.includes(RIGHT_OPEN) && r.includes('grid-column'))).toContain('grid-column: main-view !important;')
  })

  it('only hides the panel behind a transparent (cover-blur) view while no panel is open', () => {
    const css = compileLyrics({ ...SPOTIFY, background: 'cover-blur' })
    const hide = css.split('}').find(r => r.includes('visibility: hidden')) ?? ''
    expect(hide).toContain(`:not(${RIGHT_OPEN})`)
  })

  it('turns an open panel into a translucent themed column over the cover', () => {
    const css = compileLyrics({ ...SPOTIFY, background: 'cover-blur' })
    const column = css.split('}').find(r => r.includes('#Desktop_PanelContainer_Id') && r.includes('background: transparent')) ?? ''
    expect(column).toContain('--background-base: color-mix(in oklab, var(--sc-surface) 55%, transparent) !important;')
    expect(column).not.toContain('visibility')
  })
})

describe("Spotify's native idle auto-hide in the lyrics view", () => {
  const theme = (lyrics: Partial<LyricsStyle> = {}, layout: Partial<LayoutConfig> = {}) => ({
    lyrics: { ...SPOTIFY, ...lyrics },
    layout: { ...LAYOUT, ...layout },
  })

  it('is left alone when the lyrics view is native (Spotify Original)', () => {
    expect(compileLyricsIdle(theme())).toBe('')
  })

  it('is cancelled when the theme customises lyrics: the view stays between the bars, the top bar stays visible', () => {
    const css = compileLyricsIdle(theme({ background: 'theme' }))
    expect(css).toMatch(/:has\(> \[data-overlayscrollbars\]\) \{\n {2}margin-top: 0 !important;\n {2}margin-bottom: 0 !important;/)
    expect(css).toMatch(/\[data-testid="global-nav-bar"\] \{\n {2}opacity: 1 !important;/)
  })

  it('keeps the player bar visible too (Spotify fades it out when the pointer or focus leaves the window)', () => {
    const css = compileLyricsIdle(theme({ background: 'theme' }))
    expect(css).toMatch(/\[data-testid="now-playing-bar"\] \{\n {2}opacity: 1 !important;/)
  })

  it.each([{ fontScale: 1.2 }, { align: 'center' as const }, { activeLine: '#fff' }])('counts %o as customising', l => {
    expect(compileLyricsIdle(theme(l))).not.toBe('')
  })

  it('leaves the bars to the hover reveal when immersive is on', () => {
    const css = compileLyricsIdle(theme({}, { lyricsImmersive: true }))
    expect(css).toContain('margin-top: 0 !important;')
    expect(css).not.toContain('opacity: 1')
  })
})

describe('lyrics view state selector', () => {
  // Spotify snapshots the "before" picture of its close transition in the preexit state; our layout must still hold
  // then, or the transition starts from a half-reverted layout (library slid away, column gone).
  it.each([
    ['data-cinema-npv-duringenter', true],
    ['data-cinema-npv-postenter', true],
    ['data-cinema-npv-preexit', true],
    ['data-cinema-library-npv-preexit', true],
    ['data-cinema-npv-preenter', false],
    ['data-cinema-npv-duringexit', false],
    ['data-cinema-npv-postexit', false],
  ])('%s counts as open: %s', async (attr, open) => {
    const S = await import('./selectors')
    const html = document.documentElement
    html.setAttribute(attr, '')
    expect(html.matches(S.LYRICS_VIEW_OPEN)).toBe(open)
    html.removeAttribute(attr)
  })
})

describe('right-panel state selector', () => {
  it('matches the html state Spotify sets while lyrics and a right panel are open', async () => {
    const S = await import('./selectors')
    const html = document.documentElement
    html.setAttribute('data-cinema-npv-postenter', '')
    expect(html.matches(`${S.LYRICS_VIEW_OPEN}${S.RIGHT_PANEL_OPEN}`)).toBe(false)
    html.setAttribute('data-right-sidebar-open-postenter', '')
    expect(html.matches(`${S.LYRICS_VIEW_OPEN}${S.RIGHT_PANEL_OPEN}`)).toBe(true)
    html.removeAttribute('data-cinema-npv-postenter')
    html.removeAttribute('data-right-sidebar-open-postenter')
  })
})

describe('lyrics view motion', () => {
  const theme = (layout: Partial<LayoutConfig> = {}, lyrics: Partial<LyricsStyle> = {}) => ({
    lyrics: { ...SPOTIFY, ...lyrics },
    layout: { ...LAYOUT, ...layout },
  })

  it("leaves Spotify's own transition alone when the lyrics view is native", () => {
    expect(compileLyricsMotion(theme())).toBe('')
  })

  it("eases Spotify's open/close morph and cascades the first lines in, only without reduced motion", () => {
    const css = compileLyricsMotion(theme({}, { background: 'theme' }))
    expect(css.startsWith('@media (prefers-reduced-motion: no-preference) {')).toBe(true)
    expect(css).toContain('html[data-transition^="cinema"]::view-transition-group(*)')
    expect(css).toContain('[data-testid="lyrics-line"]:nth-child(1)')
    expect(css).toContain('animation-fill-mode: backwards')
  })

  it('slides our Now playing column in and out as its own transition layer', () => {
    const css = compileLyricsMotion(theme({ lyricsNowPlaying: true }))
    expect(css).toContain('view-transition-name: sc-lyrics-npv')
    expect(css).toContain('::view-transition-new(sc-lyrics-npv)')
    expect(css).toContain('::view-transition-old(sc-lyrics-npv)')
  })

  // On close, Spotify morphs the panel's background into place as a layer above the page snapshot, so the panel's
  // text (part of the page snapshot) would only appear once the morph ends, after the cover that has its own layer.
  it("fades the Now playing panel's content in with the cover when the lyrics view closes", () => {
    const css = compileLyricsMotion(theme({}, { background: 'theme' }))
    expect(css).toContain(
      '[data-cinema-npv-duringexit], [data-cinema-library-npv-duringexit]) [data-overlayscrollbars-viewport]:has([data-testid="NPV_Panel_OpenDiv"]) { view-transition-name: sc-npv-content; }',
    )
  })
})

/** The argument of every :has(…) in css (balanced parentheses). */
function hasArguments(css: string): string[] {
  const args: string[] = []
  for (let at = css.indexOf(':has('); at !== -1; at = css.indexOf(':has(', at + 1)) {
    let depth = 0
    for (let i = at + 4; i < css.length; i++) {
      if (css[i] === '(') depth++
      else if (css[i] === ')' && --depth === 0) {
        args.push(css.slice(at + 5, i))
        break
      }
    }
  }
  return args
}
