// Hex parsing and OKLCH conversion with gamut clamping, used for hex entry and for generating accent suggestions.

export interface Rgb {
  r: number // 0–1, gamma-encoded sRGB
  g: number
  b: number
}

export interface Oklch {
  l: number // 0–1
  c: number // 0–~0.37 within sRGB
  h: number // 0–360
}

// #rgb, #rrggbb, or #rrggbbaa (alpha is ignored: palette colours are opaque).
const HEX_RE = /^#?(?:([0-9a-f]{3})|([0-9a-f]{6})(?:[0-9a-f]{2})?)$/i

export function parseHex(input: string): Rgb | null {
  const m = HEX_RE.exec(input.trim())
  if (!m) return null
  const body = m[1] ? m[1].replace(/./g, ch => ch + ch) : m[2]
  const n = Number.parseInt(body, 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}

/** Normalises user input like "abc" or "#AABBCC" to "#aabbcc"; null when not a hex colour. */
export function normalizeHex(input: string): string | null {
  const rgb = parseHex(input)
  return rgb ? toHex(rgb) : null
}

export function toHex({ r, g, b }: Rgb): string {
  const byte = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${byte(r)}${byte(g)}${byte(b)}`
}

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const toGamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)

export function rgbToOklch({ r, g, b }: Rgb): Oklch {
  const lr = toLinear(r)
  const lg = toLinear(g)
  const lb = toLinear(b)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const c = Math.hypot(A, B)
  const h = c < 1e-4 ? 0 : (Math.atan2(B, A) * 180) / Math.PI
  return { l: L, c, h: (h + 360) % 360 }
}

/** OKLCH → linear-light sRGB (no gamma). In gamut exactly when every channel is within 0–1. */
export function oklchToLinearRgb({ l, c, h }: Oklch): Rgb {
  const rad = (h * Math.PI) / 180
  const A = c * Math.cos(rad)
  const B = c * Math.sin(rad)
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3
  return {
    r: 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    g: -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    b: -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  }
}

/** OKLCH → gamma-encoded sRGB. Channels may fall outside 0–1 when out of gamut. */
export function oklchToRgbUnclamped(color: Oklch): Rgb {
  const { r, g, b } = oklchToLinearRgb(color)
  return { r: toGamma(r), g: toGamma(g), b: toGamma(b) }
}

const EPS = 1e-4
export function inGamut({ r, g, b }: Rgb): boolean {
  return [r, g, b].every(v => v >= -EPS && v <= 1 + EPS)
}

/** Reduces chroma (keeping L and h) until the colour fits sRGB. */
export function clampChroma(color: Oklch): Oklch {
  if (inGamut(oklchToRgbUnclamped(color))) return color
  let lo = 0
  let hi = color.c
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    if (inGamut(oklchToRgbUnclamped({ ...color, c: mid }))) lo = mid
    else hi = mid
  }
  return { ...color, c: lo }
}

export function oklchToHex(color: Oklch): string {
  return toHex(oklchToRgbUnclamped(clampChroma(color)))
}

export function hexToOklch(hex: string): Oklch | null {
  const rgb = parseHex(hex)
  return rgb ? rgbToOklch(rgb) : null
}

/** Mix two colours in sRGB: t = 0 gives a, t = 1 gives b. Falls back to a if b isn't a colour. */
export function mixHex(a: string, b: string, t: number): string {
  const x = parseHex(a)
  const y = parseHex(b)
  if (!x || !y) return normalizeHex(a) ?? a
  const lerp = (p: number, q: number) => p + (q - p) * t
  return toHex({ r: lerp(x.r, y.r), g: lerp(x.g, y.g), b: lerp(x.b, y.b) })
}
