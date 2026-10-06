// Turns a user-picked picture into a small square data URL for Settings.artworkStyles (settings.json stays small).

/** Data URL length budget (~30 KB). */
export const IMAGE_BUDGET_CHARS = 30_000
const QUALITIES = [0.86, 0.78, 0.7, 0.6, 0.5] as const
const MIN_SIZE = 96

export interface SquareCrop {
  sx: number
  sy: number
  side: number
}

/** Pure: the centred square of a w×h image. */
export function centerSquare(width: number, height: number): SquareCrop {
  const side = Math.min(width, height)
  return { sx: Math.floor((width - side) / 2), sy: Math.floor((height - side) / 2), side }
}

export type Encode = (size: number, type: 'image/webp' | 'image/jpeg', quality: number) => string

/**
 * Pure: tries webp (jpeg if the engine can't encode webp) at decreasing quality, then smaller sizes, until the
 * result fits the budget. Returns the smallest attempt if nothing fits.
 */
export function encodeWithinBudget(encode: Encode, size: number, budget = IMAGE_BUDGET_CHARS): string {
  const webpWorks = encode(1, 'image/webp', 0.5).startsWith('data:image/webp')
  const type = webpWorks ? 'image/webp' : 'image/jpeg'
  let smallest = ''
  for (let s = size; s >= MIN_SIZE; s = Math.round(s * 0.75)) {
    for (const quality of QUALITIES) {
      const url = encode(s, type, quality)
      if (url.length <= budget) return url
      if (smallest === '' || url.length < smallest.length) smallest = url
    }
  }
  return smallest
}

/** Center-crops to a square, downscales to ≤ maxSize px and encodes as a compact data URL (webp, jpeg fallback). */
export async function imageToDataUrl(file: Blob, maxSize = 256): Promise<string> {
  const source = await createImageBitmap(file)
  const crop = centerSquare(source.width, source.height)
  const target = Math.max(1, Math.min(maxSize, crop.side))
  // The browser's high-quality resampler avoids the aliasing a single big drawImage downscale produces on photos.
  const square = await createImageBitmap(source, crop.sx, crop.sy, crop.side, crop.side, {
    resizeWidth: target,
    resizeHeight: target,
    resizeQuality: 'high',
  }).finally(() => source.close())
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas is not available')

    const encode: Encode = (size, type, quality) => {
      canvas.width = canvas.height = size
      context.imageSmoothingQuality = 'high'
      context.drawImage(square, 0, 0, size, size)
      return canvas.toDataURL(type, quality)
    }
    return encodeWithinBudget(encode, target)
  } finally {
    square.close()
  }
}
