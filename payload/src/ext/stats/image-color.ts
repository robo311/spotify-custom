// Picks a vivid representative colour from an image (Spotify's i.scdn.co images allow CORS canvas reads).
// Used for the #1 hero glow; any failure simply means "no glow colour" and the accent is used instead.

const SAMPLE_SIZE = 24
const cache = new Map<string, Promise<string | null>>()

interface Rgb {
  r: number
  g: number
  b: number
}

/** Pure: weighted average favouring saturated, mid-light pixels (skips near-black/white/transparent). */
export function vividAverage(pixels: Uint8ClampedArray): Rgb | null {
  let r = 0
  let g = 0
  let b = 0
  let total = 0
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    const pr = pixels[i]
    const pg = pixels[i + 1]
    const pb = pixels[i + 2]
    const pa = pixels[i + 3]
    if (pa < 128) continue
    const max = Math.max(pr, pg, pb)
    const min = Math.min(pr, pg, pb)
    const lightness = (max + min) / 510
    if (lightness < 0.12 || lightness > 0.92) continue
    const saturation = max === 0 ? 0 : (max - min) / max
    const weight = 0.15 + saturation * saturation
    r += pr * weight
    g += pg * weight
    b += pb * weight
    total += weight
  }
  return total === 0 ? null : { r: Math.round(r / total), g: Math.round(g / total), b: Math.round(b / total) }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`image failed: ${url}`))
    image.src = url
  })
}

async function compute(url: string): Promise<string | null> {
  try {
    const image = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = SAMPLE_SIZE
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return null
    context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
    const colour = vividAverage(context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data)
    return colour ? `rgb(${colour.r} ${colour.g} ${colour.b})` : null
  } catch {
    return null
  }
}

export function imageColor(url: string): Promise<string | null> {
  let pending = cache.get(url)
  if (!pending) {
    pending = compute(url)
    cache.set(url, pending)
  }
  return pending
}
