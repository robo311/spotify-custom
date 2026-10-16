// What every music-reactive effect gets, and how it is driven.
import type { AudioLevels } from '../envelope'
import type { PaintContext, SurfaceId } from '../render/protocol'

export type EffectContext = PaintContext

/** How page-side effects hand their canvas to the scene, which paints it (render/). */
export interface PaintPort {
  attach(id: SurfaceId, canvas: HTMLCanvasElement): void
  /** CSS px and device pixel ratio. */
  size(id: SurfaceId, width: number, height: number, dpr: number): void
  /** Share of the song played (0–1), for the spectrum. */
  played(share: number): void
  detach(id: SurfaceId): void
}

export interface ReactiveEffect {
  /**
   * Every painted frame (up to 30/s) while sound moves. Only for effects that change Spotify's own elements; effects
   * the scene paints have none, so the page never wakes up for them.
   */
  update?(levels: AudioLevels, ctx: EffectContext): void
  /**
   * Whether update() has anything to work on right now (asked about once a second, and as soon as Spotify opens or
   * closes the lyrics view). While no running effect wants them, the page gets no levels at all. Default: yes.
   */
  wantsLevels?(): boolean
  /** Re-find Spotify's elements after it re-rendered (called about once a second). */
  heal(): void
  dispose(): void
}

/** An effect on Spotify's own elements: it needs the levels on the page. */
export type LevelEffect = ReactiveEffect & Required<Pick<ReactiveEffect, 'update'>>

/** 0–100 intensity → 0–1. */
export const amount = (intensity: number) => Math.min(1, Math.max(0, intensity / 100))
