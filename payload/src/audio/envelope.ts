// Turns stepped frames (~30/s) into smooth per-display-frame values: quick to rise so hits feel immediate, slower to
// fall so motion doesn't flicker. Beats become a decaying 0–1 kick. Pure (time step passed in).
import { AUDIO_BANDS, type AudioFrame } from './frame'

const ATTACK_MS = 25
const RELEASE_MS = 160
const BEAT_DECAY_MS = 140
const BASS_BANDS = 4
/** Below this everything counts as silent, so the loop can stop. */
const SETTLED = 0.002

/** What effects read every display frame. All 0–1; the object is reused, so read it, don't keep it. */
export interface AudioLevels {
  level: number
  bass: number
  beat: number
  bands: Float32Array
}

export interface Envelope {
  readonly levels: AudioLevels
  /** Moves towards target (null = silence) over dtMs; beat = strongest onset since the last step (0 = none). */
  step(target: AudioFrame | null, beat: number, dtMs: number, sensitivity: number): AudioLevels
  /** True once everything has decayed to silence. */
  settled(): boolean
}

export function createEnvelope(): Envelope {
  const levels: AudioLevels = { level: 0, bass: 0, beat: 0, bands: new Float32Array(AUDIO_BANDS) }
  const follow = (current: number, target: number, dt: number) => {
    const tau = target > current ? ATTACK_MS : RELEASE_MS
    return current + (target - current) * (1 - Math.exp(-dt / tau))
  }
  const scaled = (v: number, sensitivity: number) => Math.min(1, v * sensitivity)

  return {
    levels,
    step(target, beat, dtMs, sensitivity) {
      const dt = Math.max(0, dtMs)
      levels.level = follow(levels.level, target ? scaled(target.level, sensitivity) : 0, dt)
      let bass = 0
      for (let i = 0; i < AUDIO_BANDS; i++) {
        levels.bands[i] = follow(levels.bands[i], target ? scaled(target.bands[i], sensitivity) : 0, dt)
        if (i < BASS_BANDS) bass += levels.bands[i]
      }
      levels.bass = bass / BASS_BANDS
      levels.beat = Math.max(levels.beat * Math.exp(-dt / BEAT_DECAY_MS), scaled(beat, sensitivity))
      return levels
    },
    settled() {
      return levels.level < SETTLED && levels.beat < SETTLED && levels.bands.every(v => v < SETTLED)
    },
  }
}
