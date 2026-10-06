// Okhsv (Björn Ottosson's perceptual HSV) for the colour picker: every (s, v) at every hue is a real sRGB colour,
// so the picker field is a full rectangle with no gamut holes, and steps look even to the eye.
import { converter, formatHex } from 'culori'

export interface Hsv {
  h: number // 0–360
  s: number // 0–1
  v: number // 0–1
}

const toOkhsv = converter('okhsv')
const toRgb = converter('rgb')

/** Below these, hue (resp. saturation) carries no visible information and is kept from `previous`. */
const ACHROMATIC_S = 0.002
const BLACK_V = 0.002

/**
 * Hex → Okhsv. Greys have no hue and black has no saturation; pass the picker's previous value so the handles
 * stay where the person left them instead of jumping (e.g. dragging to grey must not snap the hue to red).
 */
export function hexToHsv(hex: string, previous?: Hsv): Hsv | null {
  const c = toOkhsv(hex)
  if (!c) return null
  const { s, v } = c
  return {
    h: c.h === undefined || s < ACHROMATIC_S ? (previous?.h ?? 0) : c.h,
    s: v < BLACK_V ? (previous?.s ?? 0) : s,
    v,
  }
}

export function hsvToHex({ h, s, v }: Hsv): string {
  return formatHex(toRgb({ mode: 'okhsv', h, s, v }))
}

/** sRGB bytes for one field pixel (hot path: no hex strings). */
export function hsvToBytes(hsv: Hsv): [number, number, number] {
  const { r, g, b } = toRgb({ mode: 'okhsv', ...hsv })
  const byte = (x: number) => Math.round(Math.min(1, Math.max(0, x)) * 255)
  return [byte(r), byte(g), byte(b)]
}
