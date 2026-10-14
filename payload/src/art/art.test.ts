import { describe, expect, it } from 'vitest'
import { BAR_ART, BAR_IMAGE_BUDGET_CHARS, barArtUrl, bannerSize, pictureBudget } from '.'

describe('built-in bar art', () => {
  it('ships the Galaxy nebula and planet as SVG data URLs', () => {
    expect(BAR_ART.map(a => a.id)).toEqual(['nebula', 'planet'])
    expect(barArtUrl('nebula')).toMatch(/^data:image\/svg\+xml,/)
    expect(barArtUrl('planet')).toMatch(/^data:image\/svg\+xml,/)
    expect(barArtUrl('nope')).toBeNull()
  })

  it('never loads anything from outside the SVG', () => {
    for (const art of BAR_ART) {
      expect(art.svg, art.id).not.toMatch(/href=|url\((?!#)|<script|<foreignObject|@import/i)
    }
  })
})

describe('bannerSize', () => {
  it('keeps the picture as it is when it already fits', () => {
    expect(bannerSize(1800, 120)).toEqual({ width: 1800, height: 120 })
  })

  it('scales a wide picture down to the width limit, keeping its shape', () => {
    expect(bannerSize(5120, 320)).toEqual({ width: 2560, height: 160 })
  })

  it('scales a tall photo down to the height limit', () => {
    expect(bannerSize(3000, 4000)).toEqual({ width: 480, height: 640 })
  })

  it('never returns an empty size', () => {
    expect(bannerSize(10000, 1)).toEqual({ width: 2560, height: 1 })
  })

  it('budgets well under what a theme may carry', () => {
    expect(BAR_IMAGE_BUDGET_CHARS).toBeLessThanOrEqual(300 * 1024)
  })
})

describe('pictureBudget', () => {
  it('gives the first picture the full allowance', () => {
    expect(pictureBudget(0)).toBe(BAR_IMAGE_BUDGET_CHARS)
  })

  it('shrinks as the theme fills up, then says there is no room', () => {
    expect(pictureBudget(600_000)).toBe(100_000)
    expect(pictureBudget(670_000)).toBeNull()
  })
})
