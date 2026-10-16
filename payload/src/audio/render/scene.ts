// The reactive scene: turns the helper's frames into smooth levels and paints our canvases from them. It steps at most
// FRAME_RATE times a second: the helper sends about as many frames, and every painted frame costs the GPU a redraw of
// the whole window. The loop only runs while frames arrive or levels are still decaying. Levels go back to the page
// only while it asked for them (beat pulse, lyrics, the studio's meter). Host-agnostic: the worker and the page-side
// fallback drive it the same way.
import { createDelayBuffer, emptyFrame } from '../delay'
import { createEnvelope } from '../envelope'
import { decodeFrame } from '../frame'
import { createBackdropPainter, type BackdropPainter } from './backdrop-paint'
import type { FromScene, PaintContext, ToScene } from './protocol'
import { createSpectrumPainter, type SpectrumPainter } from './spectrum-paint'

export const FRAME_RATE = 30
const STEP_MS = 1000 / FRAME_RATE
/**
 * The breathing background repaints every BACKDROP_EVERY steps. Each canvas that changes costs the GPU its own redraw
 * of the window (measured: two canvases in the same frame = two redraws), and a soft light that follows the bass
 * doesn't need 30 a second.
 */
export const BACKDROP_EVERY = 2
/** Display frames land with some jitter; one this early still counts, so 60 Hz steps every other frame, not every third. */
const EARLY_MS = 4
/** After the newest frame is this old (plus the sync delay) the stream counts as stopped. */
const STREAM_GAP_MS = 400
const MAX_STEP_MS = 100

/** Pure: whether a display frame this long after the last step should step again. */
export function dueStep(sinceLastMs: number): boolean {
  return sinceLastMs >= STEP_MS - EARLY_MS
}

export interface SceneDeps {
  post(msg: FromScene): void
  now(): number
  requestFrame(fn: () => void): number
  cancelFrame(id: number): void
}

export interface Scene {
  handle(msg: ToScene): void
  dispose(): void
}

export function createScene(deps: SceneDeps): Scene {
  const buffer = createDelayBuffer()
  const envelope = createEnvelope()
  const scratch = emptyFrame()
  let delayMs = 0
  let sensitivity = 1
  let ctx: PaintContext | null = null
  let spectrum: SpectrumPainter | null = null
  let backdrop: BackdropPainter | null = null
  let levelsWanted = false
  let frame = 0
  let lastStep = -Infinity
  let lastSampleAt = -Infinity
  let steps = 0
  let disposed = false

  // Frames are stamped with now() on arrival, so the loop uses the same clock (not the display frame's time).
  const step = () => {
    frame = 0
    const now = deps.now()
    if (!dueStep(now - lastStep)) {
      frame = deps.requestFrame(step)
      return
    }
    const dt = Math.min(MAX_STEP_MS, now - lastStep)
    lastStep = now
    const t = now - delayMs
    const has = buffer.sample(t, scratch)
    const beat = buffer.beatBetween(lastSampleAt, t)
    lastSampleAt = t
    const levels = envelope.step(has ? scratch : null, beat, dt, sensitivity)
    steps++
    if (ctx) {
      spectrum?.paint(levels, ctx, dt)
      if (steps % BACKDROP_EVERY === 0 || envelope.settled()) backdrop?.paint(levels, ctx) // settled: always end dark
    }
    if (levelsWanted) deps.post({ type: 'levels', level: levels.level, bass: levels.bass, beat: levels.beat, bands: levels.bands })
    const streaming = now - buffer.newest() < STREAM_GAP_MS + delayMs
    if (streaming || !envelope.settled()) frame = deps.requestFrame(step)
  }

  const wake = () => {
    if (frame !== 0 || disposed) return
    lastStep = deps.now() - STEP_MS // the first frame steps at once, by one step
    frame = deps.requestFrame(step)
  }

  return {
    handle(msg) {
      switch (msg.type) {
        case 'frame': {
          const decoded = decodeFrame(msg.data)
          if (!decoded) return
          buffer.push(decoded, deps.now())
          wake()
          return
        }
        case 'clear':
          buffer.clear()
          return
        case 'timing':
          delayMs = msg.delayMs
          sensitivity = msg.sensitivity
          return
        case 'context':
          ctx = msg.context
          return
        case 'attach':
          if (msg.id === 'spectrum') spectrum = createSpectrumPainter(msg.canvas)
          else backdrop = createBackdropPainter(msg.canvas)
          return
        case 'size':
          if (msg.id === 'spectrum') spectrum?.size(msg.width, msg.dpr)
          return
        case 'played':
          spectrum?.played(msg.share)
          return
        case 'detach':
          if (msg.id === 'spectrum') spectrum = null
          else backdrop = null
          return
        case 'levels':
          levelsWanted = msg.on
          return
      }
    },
    dispose() {
      disposed = true
      if (frame !== 0) deps.cancelFrame(frame)
      frame = 0
    },
  }
}
