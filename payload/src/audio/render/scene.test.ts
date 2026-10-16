import { describe, expect, it } from 'vitest'
import { defaultReactiveLook } from '../../theme/model'
import { AUDIO_BANDS, encodeFrame } from '../frame'
import type { FromScene, PaintContext } from './protocol'
import { createScene, dueStep, FRAME_RATE } from './scene'
import { fakeCanvas } from './test-canvas'

const VSYNC = 1000 / 60
const loud = encodeFrame({ level: 1, beat: 0, bands: new Array<number>(AUDIO_BANDS).fill(1) })
/** A swell that never repeats at the paint rate (alternating loud/quiet would alias with it). */
const swell = (i: number) => {
  const v = 0.5 + 0.45 * Math.sin(i * 0.7)
  return encodeFrame({ level: v, beat: 0, bands: new Array<number>(AUDIO_BANDS).fill(v) })
}

function setup() {
  let t = 1000
  let queued: (() => void) | null = null
  const posted: FromScene[] = []
  const scene = createScene({
    post: msg => posted.push(msg),
    now: () => t,
    requestFrame: fn => {
      queued = fn
      return 1
    },
    cancelFrame: () => {
      queued = null
    },
  })
  /** One 60 Hz display frame: time moves on, the requested callback (if any) runs. */
  const vsync = () => {
    t += VSYNC
    const fn = queued
    queued = null
    fn?.()
  }
  /** The helper's ~30 frames/s for ms, one display frame at a time; `changing` = a swell instead of a steady sound. */
  const play = (ms: number, changing = false) => {
    let sent = 0
    for (let elapsed = 0; elapsed < ms; elapsed += VSYNC) {
      if (Math.round(elapsed / VSYNC) % 2 === 0) scene.handle({ type: 'frame', data: changing ? swell(sent++) : loud })
      vsync()
    }
  }
  const context = (patch: Partial<PaintContext> = {}): PaintContext => {
    const look = defaultReactiveLook()
    return { look, accent: '#1ed760', cover: null, reducedMotion: false, ...patch }
  }
  return { scene, posted, vsync, play, context, running: () => queued !== null }
}

describe('reactive scene', () => {
  it('steps on every other 60 Hz frame, tolerating early frames', () => {
    expect(dueStep(1000 / 60)).toBe(false)
    expect(dueStep(1000 / 30 - 2)).toBe(true) // vsync jitter
    expect(dueStep(1000 / 30)).toBe(true)
  })

  it('sends levels back only while the page asks for them, at most FRAME_RATE a second', () => {
    const { scene, posted, play } = setup()
    play(500)
    expect(posted).toHaveLength(0)
    scene.handle({ type: 'levels', on: true })
    play(1000)
    const levels = posted.flatMap(m => (m.type === 'levels' ? [m.level] : []))
    expect(levels.length).toBeGreaterThanOrEqual(FRAME_RATE - 2)
    expect(levels.length).toBeLessThanOrEqual(FRAME_RATE + 1)
    expect(Math.max(...levels)).toBeGreaterThan(0.5)
    scene.handle({ type: 'levels', on: false })
    posted.length = 0
    play(200)
    expect(posted).toHaveLength(0)
  })

  it('stops asking for frames once the sound has stopped and the levels have settled', () => {
    const { play, vsync, running } = setup()
    play(300)
    expect(running()).toBe(true)
    for (let i = 0; i < 300 && running(); i++) vsync()
    expect(running()).toBe(false)
  })

  it('drops buffered frames on clear', () => {
    const { scene, posted, vsync } = setup()
    scene.handle({ type: 'levels', on: true })
    scene.handle({ type: 'frame', data: loud })
    scene.handle({ type: 'clear' })
    for (let i = 0; i < 4; i++) vsync()
    expect(posted.every(m => m.type !== 'levels' || m.level === 0)).toBe(true)
  })

  it('paints the spectrum every step and the breathing background at half that rate', () => {
    const { scene, play, context } = setup()
    const spectrum = fakeCanvas()
    const backdrop = fakeCanvas()
    scene.handle({ type: 'context', context: context() })
    scene.handle({ type: 'attach', id: 'spectrum', canvas: spectrum })
    scene.handle({ type: 'size', id: 'spectrum', width: 400, height: 36, dpr: 2 })
    scene.handle({ type: 'attach', id: 'backdrop', canvas: backdrop })
    play(1000, true) // music that keeps changing: the light never repeats a frame
    const spectrumPaints = spectrum.calls.filter(c => c === 'clearRect').length
    const backdropPaints = backdrop.calls.filter(c => c === 'clearRect').length
    expect(spectrumPaints).toBeGreaterThanOrEqual(FRAME_RATE - 2)
    expect(backdropPaints).toBeGreaterThanOrEqual(Math.floor(spectrumPaints / 2) - 1)
    expect(backdropPaints).toBeLessThanOrEqual(Math.ceil(spectrumPaints / 2) + 1)
  })

  it('stops painting a canvas once it is detached', () => {
    const { scene, play, context } = setup()
    const spectrum = fakeCanvas()
    scene.handle({ type: 'context', context: context() })
    scene.handle({ type: 'attach', id: 'spectrum', canvas: spectrum })
    scene.handle({ type: 'size', id: 'spectrum', width: 400, height: 36, dpr: 1 })
    play(200)
    scene.handle({ type: 'detach', id: 'spectrum' })
    const painted = spectrum.calls.length
    play(200)
    expect(spectrum.calls.length).toBe(painted)
  })

  it('does nothing after dispose', () => {
    const { scene, posted, vsync, running } = setup()
    scene.handle({ type: 'levels', on: true })
    scene.dispose()
    scene.handle({ type: 'frame', data: loud })
    vsync()
    expect(running()).toBe(false)
    expect(posted).toHaveLength(0)
  })
})
