import { describe, expect, it } from 'vitest'
import { compileHomeCss } from './css'
import { hrefPath, shelfIdentity, shelfTitle } from './keys'
import { mountHome } from './fixtures'

function shelf(index: number): Element {
  mountHome()
  const found = document.querySelectorAll('[data-testid="component-shelf"]').item(index)
  if (!(found instanceof Element)) throw new Error(`fixture has no shelf #${index}`)
  return found
}

describe('shelf identity', () => {
  it('uses the see-all section path as a stable key', () => {
    expect(shelfIdentity(shelf(0))).toEqual({ key: '/section/0JQ5DAnM3wGh0gz1MXnukA', stable: true })
  })

  it('normalises absolute links and drops query strings', () => {
    expect(shelfIdentity(shelf(1))).toEqual({ key: '/recents', stable: true })
  })

  it('falls back to the first link, marked unstable', () => {
    expect(shelfIdentity(shelf(2))).toEqual({ key: 'first:/playlist/37i9dQZF1E8abc', stable: false })
  })

  it('gives up when a shelf has no links', () => {
    expect(shelfIdentity(shelf(3))).toBeNull()
  })

  it('reads the localised title for display only', () => {
    expect(shelfTitle(shelf(1))).toBe('Recents')
  })

  it('handles empty hrefs', () => {
    expect(hrefPath(null)).toBeNull()
    expect(hrefPath('')).toBeNull()
  })
})

describe('compileHomeCss', () => {
  it('only lays out our shelf hosts when nothing is configured', () => {
    const css = compileHomeCss({ hidden: [], order: [] })
    expect(css).not.toContain('order:')
    expect(css).not.toMatch(/\[data-sc-shelf-key="[^"]+"\] \{ display: none/)
  })

  // Behaviour is checked in real Chromium by e2e ("stats shelf hides on filtered Home"): happy-dom mis-evaluates
  // `:first-child` inside `:has()`, so here we only pin the rule's shape.
  it('hides only our shelves, and only while the first Home filter chip ("All") is unchecked', () => {
    const rule = compileHomeCss({ hidden: [], order: [] }).split('\n').find(line => line.includes('aria-checked'))
    expect(rule).toBe(
      '#main-view:has([data-carousel-item]:first-child > button[role="checkbox"][data-encore-id="chip"][aria-checked="false"]) ' +
        '[data-testid="home-page"] [data-sc-shelf-key^="ext:"] { display: none !important; }',
    )
  })

  it('orders listed shelves first and the rest after, in natural order', () => {
    const css = compileHomeCss({ hidden: [], order: ['/recents', 'ext:stats', '/recents'] })
    expect(css).toContain('[data-testid="home-page"] [data-sc-shelf-key] { order: 3 !important; }')
    expect(css).toMatch(/\[data-sc-shelf-key="\\\/recents"\] \{ order: 1 !important; \}/)
    expect(css).toMatch(/\[data-sc-shelf-key="ext\\:stats"\] \{ order: 2 !important; \}/)
  })

  it('hides listed shelves', () => {
    const css = compileHomeCss({ hidden: ['/recents'], order: [] })
    expect(css).toMatch(/\[data-sc-shelf-key="\\\/recents"\] \{ display: none !important; \}/)
  })

  it('produces selectors that match marked shelves', () => {
    mountHome()
    const shelf = document.querySelector('[data-testid="component-shelf"]')
    shelf?.setAttribute('data-sc-shelf-key', '/section/0JQ5DAnM3wGh0gz1MXnukA')
    const css = compileHomeCss({ hidden: ['/section/0JQ5DAnM3wGh0gz1MXnukA'], order: [] })
    const selector = css.split('\n').at(-1)?.split(' {')[0] ?? ''
    expect(document.querySelector(selector)).toBe(shelf)
  })
})
