// Accent ideas that belong to the current palette: hues offset from the theme's own tint, at a lightness that
// stands out from the panels the accent sits on.
import type { Color, Palette } from '../../types'
import { hexToOklch, oklchToHex } from './color-math'

/** Analogous, then split-complementary and complementary hues: close cousins first, bolder options last. */
const HUE_OFFSETS = [0, 35, 70, 150, 200, 290]
const CHROMA = 0.16
const STEP = 0.03
const TINTED = 0.012 // background chroma above which it has a hue worth following
/** Yellows turn olive at mid lightness; they only read as clean yellow when light. */
const isYellow = (h: number) => h >= 75 && h <= 120

export type AccentContext = Pick<Palette, 'background' | 'surface' | 'accent'>

export function suggestAccents(palette: AccentContext, ratio: (a: Color, b: Color) => number, minContrast: number): string[] {
  const bg = hexToOklch(palette.background)
  const accent = hexToOklch(palette.accent)
  const baseHue = bg && bg.c > TINTED ? bg.h : (accent?.h ?? 250)
  const dark = (bg?.l ?? 0) < 0.6
  const current = palette.accent.toLowerCase()
  const out: string[] = []

  for (const offset of HUE_OFFSETS) {
    const h = (baseHue + offset) % 360
    let l = dark ? (isYellow(h) ? 0.86 : 0.72) : 0.55
    let hex = oklchToHex({ l, c: CHROMA, h })
    // Push away from the surface until the accent reads as a clear highlight on it.
    while (ratio(hex, palette.surface) < minContrast && l > 0.05 && l < 0.95) {
      l += dark ? STEP : -STEP
      hex = oklchToHex({ l, c: CHROMA, h })
    }
    if (hex !== current && !out.includes(hex)) out.push(hex)
  }
  return out
}
