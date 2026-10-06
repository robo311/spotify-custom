import { describe, expect, it } from 'vitest'
import { CONTRAST_PAIRS, MIN_ACCENT_CONTRAST, MIN_TEXT_CONTRAST, contrastIssues, contrastRatio, fixContrast, makeReadable, paletteFromColor, pickImageColors } from './palette'
import { toOklch } from './color'
import { PRESETS } from './presets'

const SEEDS = ['#ff0000', '#ff8800', '#ffee00', '#22cc44', '#00bbcc', '#2255ff', '#8833ff', '#ff33aa', '#808080', '#000000', '#ffffff', '#1ed760']

describe('paletteFromColor', () => {
  it.each(SEEDS)('produces a readable palette from %s', seed => {
    const p = paletteFromColor(seed)
    for (const [fg, bg] of CONTRAST_PAIRS) expect(contrastRatio(p[fg], p[bg])).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
    expect(contrastRatio(p.accent, p.elevated)).toBeGreaterThanOrEqual(MIN_ACCENT_CONTRAST)
  })

  it('keeps the seed hue in the accent', () => {
    const seedHue = toOklch('#2255ff').h ?? 0
    const accentHue = toOklch(paletteFromColor('#2255ff').accent).h ?? 0
    expect(Math.abs(seedHue - accentHue)).toBeLessThan(10)
  })
})

describe('contrast helpers', () => {
  it('computes WCAG ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0)
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5)
  })

  it('fixes contrast by changing lightness only', () => {
    const fixed = fixContrast('#444466', '#222233')
    expect(contrastRatio(fixed, '#222233')).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
    expect(Math.abs((toOklch(fixed).h ?? 0) - (toOklch('#444466').h ?? 0))).toBeLessThan(3)
  })

  it('reports and repairs failing pairs', () => {
    const broken = { ...PRESETS[0].palette, textSubdued: PRESETS[0].palette.background }
    expect(contrastIssues(broken).map(i => i.fg)).toContain('textSubdued')
    expect(contrastIssues(makeReadable(broken))).toEqual([])
  })
})

describe('pickImageColors', () => {
  const pixels = (colors: [number, number, number, number][]) => new Uint8ClampedArray(colors.flat())

  it('finds the dominant colour and a vivid accent', () => {
    const navy: [number, number, number, number] = [20, 24, 60, 255]
    const orange: [number, number, number, number] = [255, 120, 20, 255]
    const { dominant, vivid } = pickImageColors(pixels([...Array<typeof navy>(80).fill(navy), ...Array<typeof orange>(20).fill(orange)]))
    expect(toOklch(dominant).l).toBeLessThan(0.35)
    expect(contrastRatio(vivid, '#ff7814')).toBeLessThan(1.2)
  })

  it('ignores transparent pixels and copes with empty images', () => {
    expect(pickImageColors(pixels([[255, 0, 0, 0]]))).toEqual({ dominant: '#808080', vivid: '#808080' })
  })
})
