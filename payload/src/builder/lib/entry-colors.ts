// Which colours the entry button's paint dots show: accent and text, then the two other palette colours that are
// clearly visible on the top bar. Dark themes rarely have two (their spare colours are near-black surfaces), so
// gaps are filled with the accent's hue neighbours, keeping the icon a lively, truthful preview of the theme.
import type { Color, Palette } from '../../types'
import { hexToOklch, oklchToHex } from './color-math'

const CANDIDATES: readonly (keyof Palette)[] = ['textSubdued', 'onAccent', 'elevated', 'surface', 'border']
const MIN_VISIBLE = 3 // non-text contrast against the top bar
const NEIGHBOUR_OFFSETS = [40, -40, 80]

export function entryDotColors(palette: Palette, ratio: (a: Color, b: Color) => number): string[] {
  const dots = [palette.accent, palette.text]
  const seen = new Set(dots.map(c => c.toLowerCase()))
  const add = (c: string) => {
    const key = c.toLowerCase()
    if (dots.length >= 4 || seen.has(key)) return
    seen.add(key)
    dots.push(c)
  }

  CANDIDATES.map(key => palette[key])
    .filter(c => ratio(c, palette.background) >= MIN_VISIBLE)
    .sort((a, b) => ratio(b, palette.background) - ratio(a, palette.background))
    .forEach(add)

  const accent = hexToOklch(palette.accent)
  if (accent) for (const offset of NEIGHBOUR_OFFSETS) add(oklchToHex({ ...accent, h: (accent.h + offset + 360) % 360 }))
  return dots
}
