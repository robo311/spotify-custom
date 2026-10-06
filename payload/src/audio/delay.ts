// Holds the last moments of frames so effects can show the sound when it's heard, not when it was captured: the
// helper taps audio before the speakers, which add their own latency (Bluetooth: ~150–250 ms).
// Pure (time is passed in), allocation-free on the sampling path.
import { AUDIO_BANDS, type AudioFrame } from './frame'

/** Frames older than this behind the newest are dropped; covers the largest delay (latency + 300 ms sync). */
const KEEP_MS = 1500
/** A frame stands in for the sound up to this long after it; beyond that the stream has stopped (silence). */
const HOLD_MS = 250

interface Stamped {
  at: number
  frame: AudioFrame
}

export interface DelayBuffer {
  push(frame: AudioFrame, at: number): void
  /** Writes the sound at time t into out (interpolated between the frames around t). False = nothing to show. */
  sample(t: number, out: AudioFrame): boolean
  /** Strongest beat among frames stamped in (since, until]; 0 when none. */
  beatBetween(since: number, until: number): number
  /** Time of the newest frame, or -Infinity. */
  newest(): number
  clear(): void
}

export function emptyFrame(): AudioFrame {
  return { level: 0, beat: 0, bands: new Float32Array(AUDIO_BANDS) }
}

export function createDelayBuffer(): DelayBuffer {
  const frames: Stamped[] = []

  return {
    push(frame, at) {
      frames.push({ at, frame })
      while (frames.length > 0 && frames[0].at < at - KEEP_MS) frames.shift()
    },

    sample(t, out) {
      // Last frame at or before t.
      let i = frames.length - 1
      while (i >= 0 && frames[i].at > t) i--
      if (i < 0) return false
      const a = frames[i]
      const b = frames[i + 1] as Stamped | undefined
      if (!b) {
        if (t - a.at > HOLD_MS) return false
        out.level = a.frame.level
        out.bands.set(a.frame.bands)
        out.beat = 0
        return true
      }
      const k = (t - a.at) / (b.at - a.at)
      out.level = a.frame.level + (b.frame.level - a.frame.level) * k
      for (let j = 0; j < AUDIO_BANDS; j++) out.bands[j] = a.frame.bands[j] + (b.frame.bands[j] - a.frame.bands[j]) * k
      out.beat = 0
      return true
    },

    beatBetween(since, until) {
      let strongest = 0
      for (const { at, frame } of frames) {
        if (at > since && at <= until && frame.beat > strongest) strongest = frame.beat
      }
      return strongest
    },

    newest() {
      return frames.length > 0 ? frames[frames.length - 1].at : -Infinity
    },

    clear() {
      frames.length = 0
    },
  }
}
