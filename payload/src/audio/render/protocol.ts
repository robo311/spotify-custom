// Messages between the page and the reactive scene (the levels and the canvases painted from them). The scene runs in
// a worker when it can, so painting never makes the page render a frame; the same messages drive it on the page
// itself when workers are blocked.
import type { ReactiveLook } from '../../types'

/** Our canvases the scene paints. */
export type SurfaceId = 'spectrum' | 'backdrop'

/** A canvas the scene can paint: our own <canvas> (on the page) or its OffscreenCanvas (in the worker). */
export interface PaintTarget {
  width: number
  height: number
  getContext(contextId: '2d'): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
}

/** What the effects look like right now; sent whenever any of it changes. */
export interface PaintContext {
  look: ReactiveLook
  accent: string // the theme's live accent (follows Album Mode)
  cover: string | null // vivid colour of the playing cover, when known
  reducedMotion: boolean
}

export type ToScene =
  | { type: 'frame'; data: string } // a helper frame, base64 (decoded in the scene)
  | { type: 'clear' } // the stream stopped: drop buffered frames
  | { type: 'timing'; delayMs: number; sensitivity: number }
  | { type: 'context'; context: PaintContext }
  | { type: 'attach'; id: SurfaceId; canvas: PaintTarget }
  | { type: 'size'; id: SurfaceId; width: number; height: number; dpr: number } // CSS px
  | { type: 'played'; share: number } // 0–1 of the song played, for the spectrum
  | { type: 'detach'; id: SurfaceId }
  | { type: 'levels'; on: boolean } // whether the page wants the levels back every painted frame

export type FromScene =
  | { type: 'ready' }
  | { type: 'levels'; level: number; bass: number; beat: number; bands: Float32Array }
