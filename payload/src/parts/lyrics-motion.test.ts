import { describe, expect, it } from 'vitest'
import type { LayoutConfig, LyricsStyle } from '../types'
import { LYRICS_INTRO_ATTR, LYRICS_INTRO_MS, compileLyricsMotion } from './lyrics-motion'
import { SPOTIFY_LYRICS, SPOTIFY_LYRICS_LAYOUT } from './fixtures/lyrics-theme'

const SPOTIFY = SPOTIFY_LYRICS
const LAYOUT = SPOTIFY_LYRICS_LAYOUT

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

  // Spotify remounts the outgoing and incoming lines on every line change: a cascade tied to the open view alone
  // replays on those new nodes and hides them for up to a second and a half.
  it('cascades the lines only during the opening (the intro mark), never on later line remounts', () => {
    const lines = compileLyricsMotion(theme({}, { background: 'theme' }))
      .split('\n')
      .filter(l => l.includes('sc-lyric-in') && l.includes('nth-child'))
    expect(lines).toHaveLength(14)
    for (const line of lines) expect(line).toContain(`[${LYRICS_INTRO_ATTR}] `)
  })

  it('keeps the intro mark long enough for the last line to finish rising', () => {
    expect(LYRICS_INTRO_MS).toBe(60 + 13 * 25 + 420)
  })

  // Spotify itself spends ~300 ms before the morph starts. A cascade ending ~1.4 s after that (measured 1.7 s from the
  // click) read as the lyrics still loading; keep the whole opening within the morph's neighbourhood.
  it('settles the opening quickly: short morph, cascade done within 850 ms', () => {
    const css = compileLyricsMotion(theme({ lyricsNowPlaying: true }, { background: 'theme' }))
    expect(LYRICS_INTRO_MS).toBeLessThanOrEqual(850)
    for (const ms of css.matchAll(/animation(?:-duration)?: (?:sc-npv-in )?(\d+)ms/g)) {
      expect(Number(ms[1])).toBeLessThanOrEqual(440)
    }
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
      '[data-cinema-npv-duringexit], [data-cinema-library-npv-duringexit]) :is([data-overlayscrollbars-viewport]:has([data-testid="NPV_Panel_OpenDiv"]), [data-npv-root] [data-overlayscrollbars-viewport]) { view-transition-name: sc-npv-content; }',
    )
  })

  // Transition layers stack in page order, which puts the Canvas (and its opaque fade) over the panel's content layer
  // and Spotify's title, actions and video-switch layers: the title, artist and switch vanish under it for the length
  // of the morph and pop back at its end.
  it("keeps the panel's content, title, actions and video switch above the Canvas while the view opens or closes", () => {
    const css = compileLyricsMotion(theme({}, { background: 'theme' }))
    for (const layer of ['cinema-npv-title', 'cinema-npv-actions', 'cinema-switch-button', 'sc-npv-content']) {
      expect(css).toContain(`html[data-transition^="cinema"]::view-transition-group(${layer})`)
    }
    expect(css).toMatch(/::view-transition-group\(sc-npv-content\) \{ z-index: 1; \}/)
    expect(css).not.toContain('::view-transition-group(cinema-npv-canvas)')
  })
})
