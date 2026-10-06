import type { Palette } from '../../types'
import { MIN_ACCENT_CONTRAST, contrastRatio } from '../../theme/palette'
import { hexToOklch } from './color-math'
import { suggestAccents } from './suggest'

const dark: Palette = {
  background: '#1a1b26', // Tokyo Night: tinted navy
  surface: '#16161e',
  elevated: '#24283b',
  text: '#c0caf5',
  textSubdued: '#9aa5ce',
  accent: '#7aa2f7',
  onAccent: '#1a1b26',
  border: '#292e42',
}

const light: Palette = { ...dark, background: '#f5f5f5', surface: '#ffffff', elevated: '#eeeeee', text: '#111111', textSubdued: '#555555' }
const grey: Palette = { ...dark, background: '#121212', surface: '#181818', accent: '#1ed760' }

const hueDistance = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b))

describe('suggestAccents', () => {
  it.each([
    ['dark', dark],
    ['light', light],
    ['neutral', grey],
  ])('gives six distinct accents that stand out from panels (%s theme)', (_name, palette) => {
    const out = suggestAccents(palette, contrastRatio, MIN_ACCENT_CONTRAST)
    expect(out).toHaveLength(6)
    expect(new Set(out).size).toBe(6)
    for (const hex of out) expect(contrastRatio(hex, palette.surface)).toBeGreaterThanOrEqual(MIN_ACCENT_CONTRAST)
  })

  it("starts from the background's own tint", () => {
    const first = hexToOklch(suggestAccents(dark, contrastRatio, MIN_ACCENT_CONTRAST)[0])
    const bgHue = hexToOklch(dark.background)?.h ?? 0
    expect(hueDistance(first?.h ?? 0, bgHue)).toBeLessThan(10)
  })

  it('follows the current accent when the background is neutral grey', () => {
    const first = hexToOklch(suggestAccents(grey, contrastRatio, MIN_ACCENT_CONTRAST)[0])
    const accentHue = hexToOklch(grey.accent)?.h ?? 0
    expect(hueDistance(first?.h ?? 0, accentHue)).toBeLessThan(10)
  })

  it('never suggests the accent already in use', () => {
    const out = suggestAccents(dark, contrastRatio, MIN_ACCENT_CONTRAST)
    expect(out).not.toContain(dark.accent)
  })
})
