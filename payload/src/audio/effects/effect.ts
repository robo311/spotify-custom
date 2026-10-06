// What every music-reactive effect gets each display frame, and how it is driven.
import type { ReactiveLook } from '../../types'
import type { AudioLevels } from '../envelope'

export interface EffectContext {
  look: ReactiveLook
  reducedMotion: boolean
  accent: string // the theme's live accent (follows Album Mode)
  cover: string | null // vivid colour of the playing cover, when known
}

export interface ReactiveEffect {
  update(levels: AudioLevels, ctx: EffectContext): void
  /** Re-find Spotify's elements after it re-rendered (called about once a second). */
  heal(): void
  dispose(): void
}

/** 0–100 intensity → 0–1. */
export const amount = (intensity: number) => Math.min(1, Math.max(0, intensity / 100))
