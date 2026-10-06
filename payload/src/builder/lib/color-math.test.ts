import { clampChroma, hexToOklch, inGamut, mixHex, normalizeHex, oklchToHex, oklchToRgbUnclamped, parseHex, toHex } from './color-math'

describe('hex parsing', () => {
  it('accepts short, long, prefixed and alpha forms', () => {
    expect(normalizeHex('abc')).toBe('#aabbcc')
    expect(normalizeHex('#3574F0')).toBe('#3574f0')
    expect(normalizeHex('#3574f0ff')).toBe('#3574f0')
  })

  it('rejects anything else', () => {
    expect(parseHex('red')).toBeNull()
    expect(parseHex('#12345')).toBeNull()
    expect(normalizeHex('')).toBeNull()
  })
})

describe('OKLCH round trip', () => {
  it.each(['#000000', '#ffffff', '#3574f0', '#1ed760', '#e5c07b', '#121212', '#ff0000'])('%s survives hex → oklch → hex', hex => {
    const lch = hexToOklch(hex)
    expect(lch).not.toBeNull()
    if (lch) expect(oklchToHex(lch)).toBe(hex)
  })

  it('maps white and black to the lightness extremes', () => {
    expect(hexToOklch('#ffffff')?.l).toBeCloseTo(1, 3)
    expect(hexToOklch('#000000')?.l).toBeCloseTo(0, 3)
  })

  it('reports greys as achromatic', () => {
    expect(hexToOklch('#808080')?.c).toBeLessThan(1e-3)
  })
})

describe('gamut handling', () => {
  it('clamps out-of-gamut chroma while keeping lightness and hue', () => {
    const wild = { l: 0.7, c: 0.37, h: 140 }
    expect(inGamut(oklchToRgbUnclamped(wild))).toBe(false)
    const clamped = clampChroma(wild)
    expect(inGamut(oklchToRgbUnclamped(clamped))).toBe(true)
    expect(clamped.l).toBe(wild.l)
    expect(clamped.h).toBe(wild.h)
    expect(clamped.c).toBeLessThan(wild.c)
    expect(clamped.c).toBeGreaterThan(0.1)
  })

  it('formats channels outside 0–1 safely', () => {
    expect(toHex({ r: 1.2, g: -0.1, b: 0.5 })).toBe('#ff0080')
  })
})

describe('mixHex', () => {
  it('interpolates between two colours', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000')
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff')
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080')
  })

  it('keeps the first colour when the second is invalid', () => {
    expect(mixHex('#ABC', 'nope', 0.5)).toBe('#aabbcc')
  })
})
