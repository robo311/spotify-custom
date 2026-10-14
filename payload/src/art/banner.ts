// Turns a user-picked picture into a compact data URL for a bar image. Unlike library artwork it keeps the picture's
// shape: the bars are long and thin, and the studio's position sliders choose which part shows.
import { encodeWithinBudget, type Encode } from '../library'

export const BANNER_MAX_WIDTH = 2560
export const BANNER_MAX_HEIGHT = 640
/** ~225 KB: room for a sharp 2560 px banner. */
export const BAR_IMAGE_BUDGET_CHARS = 230_000
/** All uploaded bar pictures in one theme together (~700 KB): share codes and theme files stay reasonable. */
export const THEME_PICTURES_BUDGET_CHARS = 700_000
/** Below this a banner turns to mush; better to say so than to save it. */
export const MIN_PICTURE_BUDGET_CHARS = 40_000

/** Pure: how big the next picture may be, given what the theme's other pictures use; null when there's no room. */
export function pictureBudget(usedChars: number): number | null {
  const left = Math.min(BAR_IMAGE_BUDGET_CHARS, THEME_PICTURES_BUDGET_CHARS - usedChars)
  return left >= MIN_PICTURE_BUDGET_CHARS ? left : null
}

/** Pure: the picture's size scaled down (never up) to fit within the banner limits, keeping its shape. */
export function bannerSize(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, BANNER_MAX_WIDTH / width, BANNER_MAX_HEIGHT / height)
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** Downscales to the banner limits and encodes as webp (jpeg where webp can't be encoded) within `budget` characters. */
export async function bannerToDataUrl(file: Blob, budget = BAR_IMAGE_BUDGET_CHARS): Promise<string> {
  const source = await createImageBitmap(file)
  const target = bannerSize(source.width, source.height)
  const aspect = target.height / target.width
  const scaled = await createImageBitmap(source, {
    resizeWidth: target.width,
    resizeHeight: target.height,
    resizeQuality: 'high',
  }).finally(() => source.close())
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas is not available')

    // `size` is the width; the budget loop shrinks it and the height follows.
    const encode: Encode = (size, type, quality) => {
      canvas.width = size
      canvas.height = Math.max(1, Math.round(size * aspect))
      context.imageSmoothingQuality = 'high'
      context.drawImage(scaled, 0, 0, canvas.width, canvas.height)
      return canvas.toDataURL(type, quality)
    }
    return encodeWithinBudget(encode, target.width, budget)
  } finally {
    scaled.close()
  }
}
