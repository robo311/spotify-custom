import { describe, expect, it } from 'vitest'
import type { Theme } from '../types'
import { compileParts, PARTS } from '.'
import { compileRecipe, PART_RECIPES, type PartRecipe } from './registry'
import { readableOn } from './style-props'
import { mountSpotifyLayout } from './fixtures/spotify-layout'
import { defaultPageStyle } from '../theme/model'

function recipe(id: string): PartRecipe {
  const found = PART_RECIPES.find(r => r.id === id)
  if (!found) throw new Error(`no recipe ${id}`)
  return found
}

describe('PARTS registry', () => {
  it('has the 16 curated parts with unique ids', () => {
    expect(PARTS.map(p => p.id)).toEqual([
      'sidebar', 'topBar', 'main', 'rightPanel', 'playerBar', 'cards',
      'buttons', 'playButton', 'progressBar', 'volumeBar', 'searchBox',
      'homeButton', 'shortcuts', 'stats', 'npvCards', 'shelfHeaders',
    ])
  })

  it('offers at least one property and a label for every part', () => {
    for (const part of PARTS) {
      expect(part.props.length, part.id).toBeGreaterThan(0)
      expect(part.label, part.id).not.toBe('')
    }
  })

  it('flags parts that only exist on some pages', () => {
    expect(PARTS.filter(p => p.pageSpecific).map(p => p.id)).toEqual(['cards', 'buttons', 'shortcuts', 'stats', 'npvCards', 'shelfHeaders'])
  })

  it('never relies on hashed classes, aria-labels or text', () => {
    for (const selector of PARTS.flatMap(p => p.selectors)) {
      expect(selector).not.toMatch(/\.[A-Za-z0-9_-]{16,}/)
      expect(selector).not.toMatch(/aria-label|:contains/)
    }
  })

  it('matches every part in real Spotify markup', () => {
    mountSpotifyLayout()
    for (const part of PARTS) {
      expect(document.querySelector(part.selectors.join(',')), part.id).not.toBeNull()
    }
  })
})

describe('compileRecipe', () => {
  it('returns nothing for an empty style', () => {
    expect(compileRecipe(recipe('sidebar'), {})).toBe('')
  })

  it('ignores properties a part does not offer', () => {
    expect(compileRecipe(recipe('topBar'), { accent: '#f00', radius: 4 })).toBe('')
  })

  it('scopes Encore background variables and paints a solid colour', () => {
    const css = compileRecipe(recipe('playerBar'), { background: '#102030' })
    expect(css).toContain('[data-testid="now-playing-bar"] {')
    expect(css).toContain('--background-base: #102030 !important;')
    expect(css).toContain('--background-highlight: color-mix(in oklab, #102030 92%, var(--sc-text, #fff)) !important;')
    expect(css).toContain('background: #102030 !important;')
  })

  it('lets inner panels show a gradient through', () => {
    const css = compileRecipe(recipe('sidebar'), { background: 'linear-gradient(#111, #222)' })
    expect(css).toContain('--background-base: transparent !important;')
    expect(css).toContain('background: linear-gradient(#111, #222) !important;')
  })

  it('targets the fill span of both play buttons', () => {
    const css = compileRecipe(recipe('playButton'), { background: '#ff7a59' })
    expect(css).toContain(
      ':is([data-testid="play-button"][data-encore-id="buttonPrimary"], [data-testid="control-button-playpause"]) > span {',
    )
  })

  it('colours hard-coded spots directly for text', () => {
    const css = compileRecipe(recipe('playerBar'), { text: '#ffd27a' })
    expect(css).toContain('[data-testid="now-playing-bar"] [data-testid="context-item-info-title"] {')
    expect(css).toContain('color: #ffd27a !important;')
    expect(css).toContain('--text-subdued: color-mix(in oklab, #ffd27a 70%, transparent) !important;')
  })

  it('sets accent variables plus the bright-accent set inside the part', () => {
    const css = compileRecipe(recipe('main'), { accent: '#ffffff' })
    expect(css).toContain('--essential-bright-accent: #ffffff !important;')
    expect(css).toContain('#main-view .encore-bright-accent-set {')
    expect(css).toContain('--text-base: #000 !important;')
  })

  it('uses the progress bar variables instead of raw properties', () => {
    const css = compileRecipe(recipe('progressBar'), { accent: '#ff7a59', background: '#333', radius: 3 })
    expect(css).toContain('--fg-color: #ff7a59 !important;')
    expect(css).toContain('--is-active-fg-color: #ff7a59 !important;')
    expect(css).toContain('--bg-color: #333 !important;')
    expect(css).toContain('--progress-bar-radius: 3px !important;')
    expect(css).not.toMatch(/^\s+color: /m)
    expect(css).not.toContain('border-radius')
  })

  it('ignores gradients where only colour variables are possible', () => {
    expect(compileRecipe(recipe('searchBox'), { background: 'linear-gradient(#000, #fff)' })).toBe('')
  })

  it('only offers gradients where the background is painted', () => {
    const byId = (id: string) => PARTS.find(p => p.id === id)
    expect(byId('sidebar')?.gradient).toBe(true)
    expect(byId('searchBox')?.gradient).toBe(false)
    expect(byId('stats')?.gradient).toBe(false)
  })

  it('repaints the hover state of shortcut cards and the Home button, keeping hover feedback', () => {
    const css = compileRecipe(recipe('shortcuts'), { background: 'linear-gradient(#123, #456)' })
    const hover = css.split('}').find(r => r.includes(':hover')) ?? ''
    expect(hover).toContain('[data-context-menu-open="true"]')
    expect(hover).toContain('background: linear-gradient(#123, #456) !important;')
    expect(hover).toContain('box-shadow: inset 0 0 0 100vmax')
    expect(compileRecipe(recipe('homeButton'), { background: '#223' })).toContain('[data-testid="home-button"]:hover {')
  })

  it('colours the shortcut title Spotify hard-codes white', () => {
    expect(compileRecipe(recipe('shortcuts'), { text: '#ffd' })).toMatch(/shortcut-background"\]\) \[data-encore-id="text"\] \{\n {2}--text-base: #ffd/)
  })

  it('sizes the Home button with its icon at half the size', () => {
    const css = compileRecipe(recipe('homeButton'), { size: 40 })
    expect(css).toContain('[data-testid="global-nav-bar"] [data-testid="home-button"] {\n  width: 40px !important;')
    expect(css).toContain('[data-testid="home-button"] svg {\n  width: 20px !important;')
    expect(PARTS.find(p => p.id === 'homeButton')?.size).toEqual({ min: 32, max: 56, default: 48 })
  })

  it('styles the stats shelf through its own variables, with a subdued text shade', () => {
    const css = compileRecipe(recipe('stats'), { text: '#eee', background: '#101820', accent: '#f80', radius: 14 })
    expect(css).toContain('[data-sc-shelf-key="ext:stats"] {')
    expect(css).toContain('--sc-stats-text: #eee !important;')
    expect(css).toContain('--sc-stats-subdued: color-mix(in oklab, #eee 70%, transparent) !important;')
    expect(css).toContain('--sc-stats-surface: #101820 !important;')
    expect(css).toContain('--sc-stats-accent: #f80 !important;')
    expect(css).toContain('--sc-stats-radius: 14px !important;')
    expect(css).not.toMatch(/^\s+(color|background):/m)
  })

  it('styles the Now playing cards but leaves the header and the lyrics preview alone', () => {
    const css = compileRecipe(recipe('npvCards'), { background: '#203040', radius: 16 })
    expect(css).toContain(':not([data-sc-panel-key="track"], [data-sc-panel-key="lyrics"]) {')
    expect(css).toContain('background: #203040 !important;')
    expect(css).toContain('border-radius: 16px !important;')
  })

  it('rounds regions and clips their inner panels', () => {
    const css = compileRecipe(recipe('sidebar'), { radius: 18 })
    expect(css).toContain('border-radius: 18px !important;')
    expect(css).toContain('overflow: clip !important;')
  })
})

describe('compileParts', () => {
  it('compiles known parts and skips unknown ids', () => {
    const theme = {
      parts: { cards: { radius: 12 }, nope: { radius: 3 } },
      lyrics: { background: 'spotify', fontScale: 1, font: 'theme', align: 'left' },
      effects: { albumMode: false, ambientGlow: false, progressBar: 'spotify' },
      layout: { lyricsKeepLibrary: false, lyricsImmersive: false },
      homeStyle: { shortcutSize: 'spotify', shortcutColumns: 0 },
      pageStyle: defaultPageStyle(),
    } as unknown as Theme
    const css = compileParts(theme)
    expect(css).toContain('[data-encore-id="card"] {')
    expect(css).toContain('border-radius: 12px !important;')
    expect(css).not.toContain('3px')
  })
})

describe('readableOn', () => {
  it('picks black on light and white on dark colours', () => {
    expect(readableOn('#ffffff')).toBe('#000')
    expect(readableOn('#1e1f22')).toBe('#fff')
    expect(readableOn('not a colour')).toBe('#fff')
  })
})
