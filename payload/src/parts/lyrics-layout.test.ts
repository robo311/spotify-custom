import { describe, expect, it } from 'vitest'
import { defaultLyrics } from '../theme/model'
import type { LayoutConfig, LyricsStyle } from '../types'
import { compileLyrics } from './lyrics'
import { compileLyricsFloatingShade, compileLyricsIdle, compileLyricsLayout, compileLyricsPanel } from './lyrics-layout'
import { SPOTIFY_LYRICS, SPOTIFY_LYRICS_LAYOUT } from './fixtures/lyrics-theme'

const SPOTIFY = SPOTIFY_LYRICS
const LAYOUT = SPOTIFY_LYRICS_LAYOUT

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

  // The 8px gap at the window edge reads as a dark border beside the library's surface (on the blurred cover, it is
  // the cover at its darkest), like the Now playing column on the other side.
  it('puts a kept library flush with the window edge, square on that side', () => {
    const rule = (css: string, part: string) => css.split('}').find(r => r.includes(part)) ?? ''
    const left = compileLyricsLayout({ ...LAYOUT, lyricsKeepLibrary: true })
    expect(rule(left, 'margin-left')).toContain('#Desktop_LeftSidebar_Id')
    expect(left).toContain('margin-left: calc(-1 * var(--panel-gap, 8px)) !important;')
    expect(rule(left, 'border-top-left-radius')).toContain('#Desktop_LeftSidebar_Id > nav > div')
    expect(left).toContain('border-bottom-left-radius: 0 !important;')
    const right = compileLyricsLayout({ ...LAYOUT, lyricsKeepLibrary: true, librarySide: 'right' })
    expect(right).toContain('margin-right: calc(-1 * var(--panel-gap, 8px)) !important;')
    expect(right).toContain('border-top-right-radius: 0 !important;')
    expect(compileLyricsLayout(LAYOUT)).not.toContain('margin-left')
  })

  it('leaves a floating library rounded, with the gap at the window edge and inset top and bottom, in immersive mode too', () => {
    for (const lyricsImmersive of [false, true]) {
      const css = compileLyricsLayout({ ...LAYOUT, lyricsKeepLibrary: true, lyricsLibraryFloating: true, lyricsImmersive })
      const library = css.split('}').filter(r => r.includes('#Desktop_LeftSidebar_Id'))
      expect(library.join('')).not.toMatch(/margin-(left|right)|calc\(-1/)
      expect(library.join('')).not.toContain('radius')
      expect(library.find(r => r.includes('transform: none'))).toContain('margin-top: var(--panel-gap, 8px) !important;\n  margin-bottom: var(--panel-gap, 8px) !important;')
      expect(css).toContain('transform: none !important;')
    }
  })

  it('runs the side columns to the top and bottom window edges in immersive mode, square', () => {
    const css = compileLyricsLayout({ ...LAYOUT, lyricsImmersive: true, lyricsKeepLibrary: true, lyricsNowPlaying: true })
    const rules = css.split('}').filter(r => r.includes('margin-top: calc(-1 * var(--panel-gap, 8px))'))
    expect(rules.find(r => r.includes('#Desktop_LeftSidebar_Id'))).toContain('margin-bottom: calc(-1 * var(--panel-gap, 8px)) !important;')
    expect(rules.find(r => r.includes('#sc-lyrics-npv'))).toContain('--sc-lyrics-npv-radius: 0 !important;')
    expect(css.split('}').find(r => r.includes('nav > div)'))).toContain('border-radius: 0 !important;')
    expect(compileLyricsLayout({ ...LAYOUT, lyricsKeepLibrary: true })).not.toContain('margin-top')
  })

  // In immersive mode the lyrics run the full window height, under the floating top bar, the view's header row
  // (64–136px) and the player bar; a fixed 11% fade left lines readable behind the header buttons.
  it('fades the lyrics out under the floating header and player bar in immersive mode', () => {
    expect(compileLyricsLayout(LAYOUT)).not.toContain('--sc-lyrics-fade')
    const css = compileLyricsLayout({ ...LAYOUT, lyricsImmersive: true })
    const rule = css.split('}').find(r => r.includes('--sc-lyrics-fade-top')) ?? ''
    expect(rule).toContain('[data-overlayscrollbars-viewport]')
    expect(rule).toContain('#sc-lyrics-view')
    expect(rule).toContain('--sc-lyrics-clear-top: 112px !important;')
    expect(rule).toContain('--sc-lyrics-fade-top: 184px !important;')
    expect(rule).toContain('--sc-lyrics-clear-bottom: 72px !important;')
    expect(rule).toContain('--sc-lyrics-fade-bottom: 152px !important;')
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

  it('floats rounded, with the gaps around it and inset top and bottom, when the right column floats (in immersive mode too)', () => {
    for (const lyricsImmersive of [false, true]) {
      const column = rules(compileLyricsLayout({ ...LAYOUT, lyricsNowPlaying: true, lyricsPanelFloating: true, lyricsImmersive })).find(r => r.includes('grid-area')) ?? ''
      expect(column).not.toMatch(/margin-(left|right)|calc\(-1/)
      expect(column).toContain('margin-top: var(--panel-gap, 8px) !important;\n  margin-bottom: var(--panel-gap, 8px) !important;')
      expect(column).toContain('--sc-lyrics-npv-radius: 8px !important;')
    }
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

  // The column sits in the panel's grid track, so Spotify's own resize bar (inside the hidden slot) resizes it.
  it("keeps Spotify's panel resize bar usable while the slot is hidden", () => {
    const css = compileLyricsLayout({ ...LAYOUT, lyricsNowPlaying: true })
    const bar = rules(css).find(r => r.includes('LayoutResizer__resize-bar')) ?? ''
    expect(bar).toContain('[data-sc-lyrics-npv]')
    expect(bar).toContain(`:not(${RIGHT_OPEN})`)
    expect(bar).toContain('#Desktop_PanelContainer_Id')
    expect(bar).toContain('visibility: visible !important;')
  })

  // Collapsed, the column is a narrow strip; Spotify's hidden panel slot stops sizing the track (it would hold it at
  // the panel's width) and its resize bar goes with it.
  it('narrows to a strip when collapsed', () => {
    const css = compileLyricsLayout({ ...LAYOUT, lyricsNowPlaying: true })
    const collapsed = rules(css).filter(r => r.includes('[data-sc-lyrics-npv-collapsed]'))
    expect(collapsed.find(r => r.includes('#sc-lyrics-npv {'))).toMatch(/width: 48px !important;\n {2}min-width: 48px !important;/)
    expect(collapsed.find(r => r.includes('position: absolute'))).toContain('#Desktop_PanelContainer_Id')
    expect(collapsed.find(r => r.includes('LayoutResizer__resize-bar'))).toContain('visibility: hidden !important;')
    for (const rule of collapsed) expect(rule).toContain(`:not(${RIGHT_OPEN})`)
  })

  // While it slides, the column's own (animated) width sizes the track: no minimum, no panel slot holding it open.
  it('lets the column width drive the track while it slides', () => {
    const sliding = rules(compileLyricsLayout({ ...LAYOUT, lyricsNowPlaying: true })).filter(r => r.includes('[data-sc-lyrics-npv-sliding]'))
    expect(sliding.find(r => r.includes('#sc-lyrics-npv {'))).toContain('min-width: 0 !important;')
    expect(sliding.find(r => r.includes('position: absolute'))).toContain('#Desktop_PanelContainer_Id')
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

  // Same as our Now playing column, which it replaces while open: flush with the window edge, square on that side.
  it('puts the panel flush with the window edge, square on that side, mirrored with the library on the right', () => {
    const panel = (layout: Partial<LayoutConfig>) => compileLyricsPanel({ lyrics: { ...SPOTIFY, background: 'theme' }, layout: { ...LAYOUT, ...layout } })
    const css = panel({})
    for (const rule of css.split('}').filter(r => r.trim())) expect(rule).toContain(RIGHT_OPEN)
    expect(css).toContain('margin-right: calc(-1 * var(--panel-gap, 8px)) !important;')
    expect(css).toContain(':has(#Desktop_PanelContainer_Id)')
    expect(css).toContain('border-top-right-radius: 0 !important;')
    expect(panel({ librarySide: 'right' })).toContain('margin-left: calc(-1 * var(--panel-gap, 8px)) !important;')
    expect(panel({ librarySide: 'right' })).toContain('border-bottom-left-radius: 0 !important;')
    for (const rule of css.split('}')) expect(rule).not.toMatch(/:has\([^)]*:has\(/)
  })

  // Floating, the panel keeps Spotify's gaps and rounded corners, and is inset top and bottom like our column.
  it('insets a floating panel top and bottom, without touching its edge or corners', () => {
    const css = compileLyricsPanel({ lyrics: { ...SPOTIFY, background: 'theme' }, layout: { ...LAYOUT, lyricsPanelFloating: true } })
    const rules = css.split('}').filter(r => r.trim())
    expect(rules).toHaveLength(1)
    expect(rules[0]).toContain(RIGHT_OPEN)
    expect(rules[0]).toContain('#Desktop_PanelContainer_Id')
    expect(rules[0]).toContain('margin-top: var(--panel-gap, 8px) !important;\n  margin-bottom: var(--panel-gap, 8px) !important;')
    expect(css).not.toMatch(/radius|margin-(left|right)/)
    for (const rule of css.split('}')) expect(rule).not.toMatch(/:has\([^)]*:has\(/)
  })

  it("leaves Spotify's panel alone when the lyrics view is native (Spotify Original)", () => {
    expect(compileLyricsPanel({ lyrics: SPOTIFY, layout: LAYOUT })).toBe('')
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

  it.each([{ fontScale: 1.2 }, { align: 'center' as const }, { activeLine: '#fff' }, { animated: { ...defaultLyrics().animated, on: true } }])('counts %o as customising', l => {
    expect(compileLyricsIdle(theme(l))).not.toBe('')
  })

  // Spotify sizes the music video to the window height (100vh) and pulls it up under the top bar; between the bars
  // that crops it and centres it too low, over the lyrics gradient.
  it('fits a music video to the view between the bars, on black', () => {
    const css = compileLyricsIdle(theme({ background: 'theme' }))
    const rule = (part: string) => css.split('}').find(r => r.includes(part)) ?? ''
    expect(rule(':has(> * > [data-testid="video-player-cinema"])')).toMatch(/height: 100% !important;\n {2}margin-top: 0 !important;/)
    expect(rule('[data-testid="video-player-cinema"] video')).toContain('height: 100% !important;')
    expect(rule(':has([data-testid="video-player-cinema"])')).toContain('background: #000 !important;')
    expect(compileLyricsIdle(theme())).not.toContain('video-player-cinema')
  })

  // Switching from the music video back to audio, Spotify keeps the related-videos section mounted for a second or two
  // after the player is gone, under the lyrics.
  it('hides the music video\'s related videos once the video has gone', () => {
    const css = compileLyricsIdle(theme({ background: 'theme' }))
    const rule = css.split('}').find(r => r.includes('[data-testid="video-card-image"]')) ?? ''
    expect(rule).toContain(':not(:has([data-testid="video-player-cinema"]))')
    expect(rule).toContain('[data-overlayscrollbars-viewport] > :has([data-testid="video-card-image"])')
    expect(rule).toContain('display: none !important;')
    for (const r of css.split('}')) expect(r).not.toMatch(/:has\([^)]*:has\(/)
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

// Spotify darkens the top of the lyrics view under its header row. Floating side columns leave gaps above them
// that showed the bare cover beside that shade; the shade moves behind the whole window width instead.
describe('header shade with floating side columns', () => {
  const shade = (layout: Partial<LayoutConfig>, background: LyricsStyle['background'] = 'cover-blur') =>
    compileLyricsFloatingShade({ lyrics: { ...SPOTIFY, background }, layout: { ...LAYOUT, ...layout } })

  it('spans the window under the top bar instead of only the lyrics view', () => {
    for (const layout of [{ lyricsPanelFloating: true }, { lyricsKeepLibrary: true, lyricsLibraryFloating: true }]) {
      const rules = shade(layout).split('}')
      const ours = rules.find(r => r.includes("[data-testid=\"root\"] > div:has(> #Desktop_LeftSidebar_Id)::after")) ?? ''
      expect(ours).toContain('[data-cinema-npv-postenter]')
      expect(ours).toContain('grid-row: main-view / auto !important;')
      expect(ours).toContain('height: 120px !important;')
      expect(ours).toContain('linear-gradient(rgba(0, 0, 0, 0.85) 0%')
      expect(rules.find(r => r.includes(':not(:has([data-overlayscrollbars]))::before'))).toContain('visibility: hidden !important;')
    }
  })

  it("leaves Spotify's shade alone unless something floats on the blurred cover, outside immersive mode", () => {
    expect(shade({})).toBe('')
    expect(shade({ lyricsLibraryFloating: true })).toBe('')
    expect(shade({ lyricsPanelFloating: true }, 'theme')).toBe('')
    expect(shade({ lyricsPanelFloating: true, lyricsImmersive: true })).toBe('')
  })
})
