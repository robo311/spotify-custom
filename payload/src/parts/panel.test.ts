import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PanelSectionInfo } from '../types'
import { compilePanelLayout, markPanelSections, PANEL_KEY_ATTR, watchPanelSections } from './panel'
import { mountNowPlaying } from './fixtures/now-playing'
import { defaultNowPlaying } from '../theme/model'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('markPanelSections', () => {
  it('keys every known section by what it contains, in DOM order', () => {
    mountNowPlaying()
    expect(markPanelSections().map(s => s.key)).toEqual([
      'track', 'lyrics', 'videos', 'artist', 'credits', 'tour', 'merch', 'queue',
    ])
  })

  it('uses the localised heading as title, with a label for sections without one', () => {
    mountNowPlaying()
    const titles = Object.fromEntries(markPanelSections().map(s => [s.key, s.title]))
    expect(titles.track).toBe('Now playing')
    expect(titles.tour).toBe('On tour')
  })

  it('leaves unknown sections unmarked', () => {
    mountNowPlaying()
    markPanelSections()
    expect(document.getElementById('unknown')?.hasAttribute(PANEL_KEY_ATTR)).toBe(false)
  })

  it('numbers repeated kinds', () => {
    const container = mountNowPlaying()
    const videos = container.querySelector('[data-testid="video-card-image"]')?.parentElement
    if (videos) container.append(videos.cloneNode(true))
    expect(markPanelSections().filter(s => s.key.startsWith('videos')).map(s => s.key)).toEqual(['videos', 'videos#2'])
  })

  it('returns nothing while the panel is closed', () => {
    expect(markPanelSections()).toEqual([])
  })
})

describe('watchPanelSections', () => {
  it('reports now, re-marks after a re-render, and cleans up', async () => {
    const container = mountNowPlaying()
    const reports: PanelSectionInfo[][] = []
    const stop = watchPanelSections(s => reports.push(s))
    expect(reports).toHaveLength(1)

    const fresh = container.cloneNode(true) as HTMLElement
    for (const el of fresh.querySelectorAll(`[${PANEL_KEY_ATTR}]`)) el.removeAttribute(PANEL_KEY_ATTR)
    fresh.lastElementChild?.previousElementSibling?.remove() // queue section gone
    container.replaceWith(fresh)
    await vi.waitFor(() => {
      expect(reports.at(-1)?.some(s => s.key === 'queue')).toBe(false)
    })
    expect(fresh.querySelector(`[${PANEL_KEY_ATTR}="lyrics"]`)).not.toBeNull()

    stop()
    expect(document.querySelectorAll(`[${PANEL_KEY_ATTR}]`)).toHaveLength(0)
  })
})

describe('compilePanelLayout', () => {
  const none = defaultNowPlaying()

  it('is empty by default', () => {
    expect(compilePanelLayout(none)).toBe('')
  })

  it('orders listed sections first and hides others', () => {
    const container = mountNowPlaying()
    markPanelSections()
    const css = compilePanelLayout({ ...none, order: ['queue', 'track'], hidden: ['merch'] })
    expect(css).toContain('[data-testid="NPV_Panel_OpenDiv"] > * { order: 3 !important; }')

    const style = document.createElement('style')
    style.textContent = css
    document.head.append(style)
    const keyed = (key: string) => container.querySelector<HTMLElement>(`[${PANEL_KEY_ATTR}="${key}"]`) ?? container
    expect(getComputedStyle(keyed('queue')).order).toBe('1')
    expect(getComputedStyle(keyed('track')).order).toBe('2')
    expect(getComputedStyle(keyed('merch')).display).toBe('none')
    style.remove()
  })

  it('swaps the big cover for the thumbnail in compact mode', () => {
    const css = compilePanelLayout({ ...none, compactCover: true })
    expect(css).toContain('div:has(> [data-testid="track-visual-enhancement"]) {\n  display: none !important;')
    expect(css).toContain('[data-testid="minimized-track-visual-enhancement"] {\n  width: 56px !important;')
  })

  const rules = (css: string) => css.split('}')
  const rule = (css: string, needle: string) => rules(css).find(r => r.includes(needle)) ?? ''

  it('sets the cover height through the box that holds the square cover', () => {
    expect(rule(compilePanelLayout({ ...none, coverHeight: 'short' }), 'aspect-ratio')).toContain('div:has(> [data-testid="track-visual-enhancement"])')
    expect(compilePanelLayout({ ...none, coverHeight: 'short' })).toContain('aspect-ratio: 4 / 3 !important;')
    expect(compilePanelLayout({ ...none, coverHeight: 'tall' })).toContain('aspect-ratio: 4 / 5 !important;')
  })

  it("dims or removes Spotify's gradient over the cover", () => {
    expect(rule(compilePanelLayout({ ...none, coverShade: 'none' }), 'opacity')).toContain('[data-testid="track-visual-enhancement"]::before')
    expect(compilePanelLayout({ ...none, coverShade: 'none' })).toContain('opacity: 0 !important;')
    expect(compilePanelLayout({ ...none, coverShade: 'soft' })).toContain('opacity: 0.5 !important;')
    expect(rule(compilePanelLayout({ ...none, coverShade: 'strong' }), 'filter')).toContain('brightness(0.7)')
  })

  it('scales the title, hides the video switch and the Liked tick, and spaces the cards', () => {
    const css = compilePanelLayout({ ...none, titleScale: 1.3, hideVideoSwitch: true, hideLikeButton: true, cardGap: 24 })
    expect(rule(css, 'zoom')).toContain('[data-testid="context-item-info-title"]')
    expect(css).toContain('zoom: 1.3 !important;')
    expect(rule(css, 'button:not([data-encore-id])')).toContain('display: none')
    expect(rule(css, 'button[aria-checked]')).toContain('display: none')
    expect(rule(css, 'gap: 24px')).toContain('[data-testid="NPV_Panel_OpenDiv"]')
    for (const r of rules(css)) expect(r).not.toMatch(/:has\([^)]*:has\(/)
  })
})
