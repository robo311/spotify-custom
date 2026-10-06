import { describe, expect, it } from 'vitest'
import { defaultHomeStyle } from '../theme/model'
import { compileHomeLook } from './home-look'
import { SHORTCUT_GRID } from './selectors'

describe('compileHomeLook', () => {
  it("leaves Spotify's responsive shortcut grid alone by default", () => {
    expect(compileHomeLook(defaultHomeStyle())).toBe('')
  })

  it('sets the card height and the number of columns on the grid', () => {
    const css = compileHomeLook({ ...defaultHomeStyle(), shortcutSize: 'large', shortcutColumns: 2 })
    expect(css).toContain('--item-height: 88px !important;')
    expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr)) !important;')
  })

  // happy-dom mis-evaluates chained :has(> a > b) (it matches the cards too), so the grid/card distinction was checked
  // in Spotify 1.3.3 itself: 1 grid, 8 cards.
  it('targets the grid: two levels above each card\'s link layer', () => {
    expect(SHORTCUT_GRID).toBe('[data-testid="home-page"] div:has(> div > div > [data-testid="shortcut-background"])')
    expect(compileHomeLook({ ...defaultHomeStyle(), shortcutColumns: 3 })).toContain(`${SHORTCUT_GRID} {`)
  })
})
