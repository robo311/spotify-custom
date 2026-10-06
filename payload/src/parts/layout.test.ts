import { describe, expect, it } from 'vitest'
import { defaultNowPlaying } from '../theme/model'
import type { LayoutConfig } from '../types'
import { compileLayout, LAYOUT_OPTIONS } from './layout'
import { PARTS } from './registry'
import { mountSpotifyLayout } from './fixtures/spotify-layout'

const BASE: LayoutConfig = {
  hidden: [],
  compactPlayer: false,
  librarySide: 'left',
  searchPosition: 'centre',
  nowPlaying: defaultNowPlaying(),
  lyricsKeepLibrary: false,
  lyricsImmersive: false,
  lyricsNowPlaying: false,
}

describe('LAYOUT_OPTIONS', () => {
  it('uses ids that do not collide with part ids', () => {
    const partIds = new Set(PARTS.map(p => p.id))
    for (const option of LAYOUT_OPTIONS) expect(partIds.has(option.id), option.id).toBe(false)
  })

  it('hides elements that exist in real Spotify markup', () => {
    mountSpotifyLayout()
    for (const option of LAYOUT_OPTIONS) {
      const selector = option.css.slice(0, option.css.indexOf('{')).trim()
      expect(document.querySelector(selector), option.id).not.toBeNull()
    }
  })
})

describe('compileLayout', () => {
  it("keeps Home clear of the Mac window buttons when back/forward are hidden (the gap after them stays)", () => {
    const css = compileLayout({ ...BASE, hidden: ['backForward'] })
    const rule = css.split('}').find(r => r.includes('margin-right: 24px')) ?? ''
    expect(rule).toContain(':root[data-sc-mac] ')
    expect(rule).toContain(':first-child:not(:has(button))')
  })

  it('is empty for the default layout', () => {
    expect(compileLayout(BASE)).toBe('')
  })

  it('hides layout options and hideable parts', () => {
    const css = compileLayout({ ...BASE, hidden: ['whatsNew', 'sidebar'] })
    expect(css).toContain('[data-testid="whats-new-feed-button"] {\n  display: none !important;')
    expect(css).toContain('#Desktop_LeftSidebar_Id {\n  display: none !important;')
  })

  it('never hides parts that are not hideable, and ignores unknown ids', () => {
    expect(compileLayout({ ...BASE, hidden: ['playerBar', 'topBar', 'bogus'] })).toBe('')
  })

  it('shrinks the player bar in compact mode', () => {
    const css = compileLayout({ ...BASE, compactPlayer: true })
    expect(css).toContain('[data-testid="now-playing-bar"] > div {\n  height: 56px !important;')
  })

  it('moves the Home + search group out of the centre into the flow, at the chosen end', () => {
    const left = compileLayout({ ...BASE, searchPosition: 'left' })
    expect(left).toContain('[data-testid="global-nav-bar"] > div:has(form[role="search"]) {\n  position: static !important;')
    expect(left).toContain('justify-content: flex-start !important;')
    expect(compileLayout({ ...BASE, searchPosition: 'right' })).toContain('justify-content: flex-end !important;')
  })

  it('hides the back/forward pair with its box, and the Home button', () => {
    mountSpotifyLayout()
    const css = compileLayout({ ...BASE, hidden: ['backForward', 'topBarHome'] })
    const selectors = css.split('\n').filter(l => l.endsWith('{')).map(l => l.slice(0, -1).trim())
    const hidden = selectors.flatMap(sel => [...document.querySelectorAll(sel)])
    expect(hidden.some(el => el.querySelector('[data-testid="top-bar-back-button"]') && el.querySelector('[data-testid="top-bar-forward-button"]'))).toBe(true)
    expect(hidden.some(el => el.matches('[data-testid="home-button"]'))).toBe(true)
  })

  it('swaps the sidebar grid areas for library on the right', () => {
    const css = compileLayout({ ...BASE, librarySide: 'right' })
    expect(css).toContain('"right-sidebar main-view left-sidebar" 1fr')
    expect(css).toContain('[data-testid="LayoutResizer__resize-bar"] {\n  display: none !important;')
  })
})
