// Colour primitives shared by the theme engine: parsing, OKLCH adjustments and WCAG contrast.
// Everything perceptual happens in OKLCH so that "lighter"/"darker" means the same thing for every hue.
import { clampChroma, formatHex, formatHex8, interpolate, oklch, parse, wcagContrast, type Oklch } from 'culori'
import type { Color } from '../types'

export function isColor(value: unknown): value is Color {
  return typeof value === 'string' && parse(value) !== undefined
}

export function toOklch(c: Color): Oklch {
  const parsed = oklch(parse(c))
  if (!parsed) throw new Error(`Not a valid colour: ${c}`)
  return { ...parsed, c: parsed.c, h: parsed.h ?? 0 }
}

/** Gamut-safe hex output (#rrggbb, or #rrggbbaa when translucent). */
export function fromOklch(c: Oklch): Color {
  const clamped = clampChroma({ ...c, l: Math.min(1, Math.max(0, c.l)) }, 'oklch')
  return (clamped.alpha ?? 1) < 1 ? formatHex8(clamped) : formatHex(clamped)
}

export function normalizeHex(c: Color): Color {
  return fromOklch(toOklch(c))
}

export function lightness(c: Color): number {
  return toOklch(c).l
}

export function withLightness(c: Color, l: number): Color {
  return fromOklch({ ...toOklch(c), l })
}

/** Perceptual mix in OKLab; t = 0 → a, t = 1 → b. */
export function mix(a: Color, b: Color, t: number): Color {
  const lerp = interpolate([a, b], 'oklab')
  return formatHex(lerp(t))
}

export function contrast(a: Color, b: Color): number {
  return wcagContrast(a, b)
}

/** Moves fg's lightness (hue and chroma kept) away from bg until the WCAG ratio reaches min. */
export function ensureContrast(fg: Color, bg: Color, min: number): Color {
  if (contrast(fg, bg) >= min) return fg
  const base = toOklch(fg)
  const goLighter = lightness(bg) < 0.6
  const target = goLighter ? 1 : 0
  // Binary search for the smallest lightness change that passes.
  let lo = base.l
  let hi = target
  let best = fromOklch({ ...base, l: target })
  for (let i = 0; i < 24; i++) {
    const midL = (lo + hi) / 2
    const candidate = fromOklch({ ...base, l: midL })
    if (contrast(candidate, bg) >= min) {
      best = candidate
      hi = midL
    } else {
      lo = midL
    }
  }
  return best
}
