// Cover art colours, sampled once per image and shared by everything that follows the cover (Album Mode, Ambient
// Glow, the music-reactive effects).
import { extractImageColors, type ImageColors } from './palette'

const CACHE_LIMIT = 50
const cache = new Map<string, Promise<ImageColors>>()

/** Colours of the image at src. Rejects if the image can't be read (a failed sample isn't cached). */
export function coverColors(src: string): Promise<ImageColors> {
  const cached = cache.get(src)
  if (cached) return cached
  const sampled = extractImageColors(src)
  cache.set(src, sampled)
  sampled.catch(() => cache.delete(src))
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value ?? src)
  return sampled
}
