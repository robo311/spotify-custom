import { hexToHsv, hsvToBytes, hsvToHex } from './okhsv'

describe('okhsv', () => {
  it.each(['#3574f0', '#1ed760', '#e5c07b', '#ff0000', '#121212', '#ffffff'])('%s round-trips through Okhsv', hex => {
    const hsv = hexToHsv(hex)
    expect(hsv).not.toBeNull()
    if (hsv) expect(hsvToHex(hsv)).toBe(hex)
  })

  it('maps the field corners to white and black', () => {
    expect(hsvToHex({ h: 120, s: 0, v: 1 })).toBe('#ffffff')
    expect(hsvToHex({ h: 120, s: 1, v: 0 })).toBe('#000000')
  })

  it('produces a valid colour for every point of the field (no gamut holes)', () => {
    for (let h = 0; h < 360; h += 45)
      for (let s = 0; s <= 1; s += 0.25)
        for (let v = 0; v <= 1; v += 0.25) {
          const bytes = hsvToBytes({ h, s, v })
          expect(bytes.every(b => Number.isInteger(b) && b >= 0 && b <= 255)).toBe(true)
        }
  })

  it('keeps the previous hue for greys and the previous saturation for black', () => {
    const previous = { h: 210, s: 0.6, v: 0.5 }
    expect(hexToHsv('#808080', previous)?.h).toBe(210)
    expect(hexToHsv('#000000', previous)).toEqual({ h: 210, s: 0.6, v: 0 })
  })

  it('rejects non-colours', () => {
    expect(hexToHsv('nope')).toBeNull()
  })
})
