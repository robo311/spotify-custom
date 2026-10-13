import { describe, expect, it } from 'vitest'
import { compileLyrics } from './lyrics'
import { compileLyricsIdle, compileLyricsLayout } from './lyrics-layout'
import { compileLyricsMotion } from './lyrics-motion'
import { LYRICS_VIEW_SLOT } from './lyrics-shared'
import { SPOTIFY_LYRICS, SPOTIFY_LYRICS_LAYOUT } from './fixtures/lyrics-theme'
import type { LyricsStyle } from '../types'

const SPOTIFY = SPOTIFY_LYRICS
const LAYOUT = SPOTIFY_LYRICS_LAYOUT

describe('compileLyrics', () => {
  it("only fades the scroll edges on Spotify's defaults", () => {
    const css = compileLyrics(SPOTIFY)
    expect(css).toContain(
      '[data-overlayscrollbars-viewport] {\n  mask-image: linear-gradient(to bottom, transparent var(--sc-lyrics-clear-top, 48px), #000 var(--sc-lyrics-fade-top, 120px), ' +
        '#000 calc(100% - var(--sc-lyrics-fade-bottom, 11%)), transparent calc(100% - var(--sc-lyrics-clear-bottom, 0px))) !important;',
    )
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

  // A blur fades out towards its box's edges, so a cover blurred within the window was darkest in the gaps at the
  // window edge (beside a floating library or right column). Behind the window it runs past the edges; the preview
  // card keeps its cover within the card.
  it('runs the window\'s blurred cover past the window edges', () => {
    const css = compileLyrics({ ...SPOTIFY, background: 'cover-blur' })
    const before = (part: string) => css.split('}').find(r => r.includes(`${part}::before {`)) ?? ''
    expect(before('div:has(> #Desktop_LeftSidebar_Id)')).toContain('inset: -216px !important;')
    expect(before('[data-testid="lyrics-npv-section"]')).toContain('inset: 0 !important;')
  })

  // On the blurred cover the view is see-through, so the 8px gaps beside it showed the bare cover without the
  // header's dark fade; the view runs over them instead, up to the library and the column beside it.
  it('runs the see-through lyrics view over the gaps beside it on the blurred cover', () => {
    const margin = 'margin-inline: calc(-1 * var(--panel-gap, 8px)) !important;'
    const rule = (css: string) => css.split('}').find(r => r.includes(margin)) ?? ''
    expect(rule(compileLyrics({ ...SPOTIFY, background: 'cover-blur' }))).toContain(':has(> [data-overlayscrollbars])')
    expect(compileLyrics({ ...SPOTIFY, background: 'theme' })).not.toContain(margin)
  })

  // Spotify's resize bars sit in those gaps, on the library's and the right panel's edges: the columns go above the
  // view (Spotify raises it to its "above everything" level while open) so the bars can still be dragged.
  it('keeps the library and right panel resizable over the widened view', () => {
    const css = compileLyrics({ ...SPOTIFY, background: 'cover-blur' })
    const rule = css.split('}').find(r => r.includes('z-index: calc(var(--above-everything-grid-area-z-index, 7) + 1)')) ?? ''
    expect(rule).toContain('#Desktop_LeftSidebar_Id')
    expect(rule).toContain(':has(#Desktop_PanelContainer_Id):not(:has(> [data-overlayscrollbars]))')
  })

  it('switches past lines to their own colour at full opacity', () => {
    const css = compileLyrics({ ...SPOTIFY, pastLine: '#555' })
    expect(css).toContain('--sc-lyrics-past: #555 !important;')
    expect(css).toContain('--sc-lyrics-past-opacity: 1 !important;')
  })

  it('hides Spotify\'s lines (not its background) while our animated lyrics show', () => {
    expect(compileLyrics(SPOTIFY)).not.toContain(LYRICS_VIEW_SLOT.ownAttr)
    const css = compileLyrics({ ...SPOTIFY, animated: { ...SPOTIFY.animated, on: true } })
    const rule = css.split('}').find(r => r.includes(LYRICS_VIEW_SLOT.ownAttr)) ?? ''
    expect(rule).toContain('[style*="--cinema-mode-bg-color-from"] > :has([data-testid="lyrics-line"])')
    expect(rule).toContain('visibility: hidden !important;')
  })

  // Spotify's "Sync" button scrolls its own (hidden) lines back to the sung one; our view follows the song again by
  // itself a moment after the user scrolls it, and the button would sit under our lines.
  it("hides Spotify's sync button while our animated lyrics show", () => {
    const css = compileLyrics({ ...SPOTIFY, animated: { ...SPOTIFY.animated, on: true } })
    const rule = css.split('}').find(r => r.includes('buttonPrimary')) ?? ''
    expect(rule).toContain(`[${LYRICS_VIEW_SLOT.ownAttr}] `)
    expect(rule).toContain(':has(> [data-overlayscrollbars]) > :has(> * > [data-encore-id="buttonPrimary"])')
    expect(rule).toContain('visibility: hidden !important;')
    expect(compileLyrics(SPOTIFY)).not.toContain('buttonPrimary')
  })

  it('sets font, alignment and size', () => {
    const css = compileLyrics({ ...SPOTIFY, font: 'jetbrains-mono', align: 'center', fontScale: 1.25 })
    expect(css).toContain('font-family: "SC Mono", var(--fallback-fonts, monospace) !important;')
    expect(css).toContain('text-align: center !important;')
    expect(css).toContain('[style*="--cinema-mode-bg-color-from"] [data-testid="lyrics-line"] {\n  zoom: 1.25 !important;')
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
