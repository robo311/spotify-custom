// Palette generation and readability rules: "pick one colour", "from image", contrast checks and fixes.
import type { Color, Palette } from '../types'
import { contrast, ensureContrast, fromOklch, toOklch } from './color'

export const MIN_TEXT_CONTRAST = 4.5
/** WCAG non-text contrast: the accent must stand out from the surfaces it sits on. */
export const MIN_ACCENT_CONTRAST = 3

/** Text/background pairs that must meet MIN_TEXT_CONTRAST (fg, bg). */
export const CONTRAST_PAIRS: [keyof Palette, keyof Palette][] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['text', 'elevated'],
  ['textSubdued', 'background'],
  ['textSubdued', 'surface'],
  ['textSubdued', 'elevated'],
  ['onAccent', 'accent'],
]

export function contrastRatio(a: Color, b: Color): number {
  return contrast(a, b)
}

/** Returns fg adjusted (lightness only, hue kept) so that contrastRatio(fg, bg) >= min. */
export function fixContrast(fg: Color, bg: Color, min = MIN_TEXT_CONTRAST): Color {
  return ensureContrast(fg, bg, min)
}

/** Every pair that falls short, for the builder's readability guard. */
export function contrastIssues(p: Palette): { fg: keyof Palette; bg: keyof Palette; ratio: number }[] {
  return CONTRAST_PAIRS.map(([fg, bg]) => ({ fg, bg, ratio: contrastRatio(p[fg], p[bg]) })).filter(
    i => i.ratio < MIN_TEXT_CONTRAST,
  )
}

/** Fixes every failing pair by adjusting the foreground colour. */
export function makeReadable(p: Palette): Palette {
  const out = { ...p }
  for (const [fg, bg] of CONTRAST_PAIRS) out[fg] = fixContrast(out[fg], out[bg])
  return out
}

/**
 * Builds a dark palette around an accent colour. tintHue lets the neutrals lean towards a different
 * hue than the accent (used for album art, where the dominant colour and the vivid colour differ).
 */
function buildPalette(accentInput: Color, tintHue?: number): Palette {
  const a = toOklch(accentInput)
  const hue = tintHue ?? a.h ?? 0
  // Neutrals carry a whisper of the hue; greys stay grey.
  const tint = Math.min(0.025, a.c * 0.18)
  const neutral = (l: number, c = tint) => fromOklch({ mode: 'oklch', l, c, h: hue })

  const background = neutral(0.2)
  const surface = neutral(0.16)
  const elevated = neutral(0.27)
  const border = neutral(0.33)
  // Keep the accent luminous enough to read on dark surfaces, without washing out its chroma.
  const accent = ensureContrast(fromOklch({ ...a, l: Math.min(0.85, Math.max(0.66, a.l)) }), elevated, MIN_ACCENT_CONTRAST)
  const darkOn = neutral(0.17, Math.min(0.04, a.c * 0.3))
  const onAccent = contrast(darkOn, accent) >= contrast('#ffffff', accent) ? darkOn : '#ffffff'

  return makeReadable({
    background,
    surface,
    elevated,
    text: neutral(0.95, tint * 0.5),
    textSubdued: neutral(0.76, tint),
    accent,
    onAccent,
    border,
  })
}

/** Full readable palette generated from one colour. */
export function paletteFromColor(c: Color): Palette {
  return buildPalette(c)
}

export interface ImageColors {
  dominant: Color // most common colour (weighted towards visible chroma)
  vivid: Color // the most striking colour, good for an accent
}

/** Samples an image (URL or data URL). Spotify's CEF allows reading i.scdn.co covers (verified 2026-10-02). */
export async function extractImageColors(src: string): Promise<ImageColors> {
  const pixels = await samplePixels(src, 48)
  return pickImageColors(pixels)
}

/** Full readable palette extracted from an image (URL or data URL). */
export async function paletteFromImage(src: string): Promise<Palette> {
  const { dominant, vivid } = await extractImageColors(src)
  return buildPalette(vivid, toOklch(dominant).h)
}

/** Pure part of image extraction: RGBA bytes → dominant + vivid colour. */
export function pickImageColors(rgba: Uint8ClampedArray): ImageColors {
  // Bucket by hue (24 bins) and lightness band; score buckets.
  const buckets = new Map<string, { n: number; l: number; c: number; h: number }>()
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if ((rgba[i + 3] ?? 0) < 200) continue
    const hex = rgbToHex(rgba[i] ?? 0, rgba[i + 1] ?? 0, rgba[i + 2] ?? 0)
    const { l, c, h = 0 } = toOklch(hex)
    const key = c < 0.03 ? `grey-${Math.round(l * 5)}` : `${Math.round(h / 15)}-${Math.round(l * 4)}`
    const b = buckets.get(key) ?? { n: 0, l: 0, c: 0, h: 0 }
    b.n++
    b.l += l
    b.c += c
    b.h += h
    buckets.set(key, b)
  }
  const avg = [...buckets.values()].map(b => ({ n: b.n, l: b.l / b.n, c: b.c / b.n, h: b.h / b.n }))
  if (avg.length === 0) return { dominant: '#808080', vivid: '#808080' }

  const toHex = (b: { l: number; c: number; h: number }) => fromOklch({ mode: 'oklch', l: b.l, c: b.c, h: b.h })
  const dominant = [...avg].sort((x, y) => y.n - x.n)[0]
  // Vivid: chroma matters most, but a tiny speck shouldn't win; mid lightness reads best as an accent.
  const vividScore = (b: { n: number; l: number; c: number }) => b.c * Math.sqrt(b.n) * (1 - Math.abs(b.l - 0.65))
  const vivid = [...avg].sort((x, y) => vividScore(y) - vividScore(x))[0]
  return { dominant: toHex(dominant), vivid: toHex(vivid) }
}

function rgbToHex(r: number, g: number, b: number): Color {
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
}

async function samplePixels(src: string, size: number): Promise<Uint8ClampedArray> {
  const response = await fetch(src)
  if (!response.ok) throw new Error(`Image request failed (${response.status})`)
  const bitmap = await createImageBitmap(await response.blob(), { resizeWidth: size, resizeHeight: size })
  const canvas = new OffscreenCanvas(size, size)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  return ctx.getImageData(0, 0, size, size).data
}
