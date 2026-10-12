import { describe, expect, it } from 'vitest'
import { contrast, ensureContrast, lightness } from './color'

describe('ensureContrast', () => {
  it('keeps a colour that already passes', () => {
    expect(ensureContrast('#ffffff', '#000000', 4.5)).toBe('#ffffff')
  })

  it('moves away from the background until the ratio is reached', () => {
    expect(contrast(ensureContrast('#333333', '#222222', 4.5), '#222222')).toBeGreaterThanOrEqual(4.5)
    expect(contrast(ensureContrast('#dddddd', '#eeeeee', 4.5), '#eeeeee')).toBeGreaterThanOrEqual(4.5)
  })

  it('goes darker on mid-tone backgrounds where only black can reach the ratio', () => {
    const bg = '#3c7ebe'
    expect(lightness(bg)).toBeGreaterThan(0.564)
    expect(lightness(bg)).toBeLessThan(0.6)
    expect(contrast('#ffffff', bg)).toBeLessThan(4.5)
    expect(contrast(ensureContrast('#3c7ebe', bg, 4.5), bg)).toBeGreaterThanOrEqual(4.5)
  })
})
