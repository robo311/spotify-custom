// The helper's analysis frames (layout in types.ts, AudioStatus): 35 bytes, base64 encoded.
// Pure: decoding never throws; anything malformed is dropped.

export const AUDIO_FRAME_VERSION = 1
export const AUDIO_BANDS = 32
const FRAME_BYTES = 3 + AUDIO_BANDS

/** One analysis frame, every value scaled to 0–1. */
export interface AudioFrame {
  level: number // overall loudness
  beat: number // onset strength; 0 = no beat in this frame
  bands: Float32Array // AUDIO_BANDS log-spaced bands, low to high
}

export function decodeFrame(base64: string): AudioFrame | null {
  let raw: string
  try {
    raw = atob(base64)
  } catch {
    return null
  }
  if (raw.length !== FRAME_BYTES || raw.charCodeAt(0) !== AUDIO_FRAME_VERSION) return null
  const bands = new Float32Array(AUDIO_BANDS)
  for (let i = 0; i < AUDIO_BANDS; i++) bands[i] = raw.charCodeAt(3 + i) / 255
  return { level: raw.charCodeAt(1) / 255, beat: raw.charCodeAt(2) / 255, bands }
}

/** The inverse, for tests and for simulating the helper in live checks. Values are clamped to 0–1. */
export function encodeFrame(frame: { level: number; beat: number; bands: ArrayLike<number> }): string {
  const byte = (v: number) => String.fromCharCode(Math.round(Math.min(1, Math.max(0, v)) * 255))
  let raw = String.fromCharCode(AUDIO_FRAME_VERSION) + byte(frame.level) + byte(frame.beat)
  for (let i = 0; i < AUDIO_BANDS; i++) raw += byte(frame.bands[i] ?? 0)
  return btoa(raw)
}
