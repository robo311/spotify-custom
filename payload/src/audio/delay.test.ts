import { describe, expect, it } from 'vitest'
import { createDelayBuffer, emptyFrame } from './delay'
import { AUDIO_BANDS, type AudioFrame } from './frame'

const frame = (level: number, beat = 0): AudioFrame => ({ level, beat, bands: new Float32Array(AUDIO_BANDS).fill(level) })

describe('delay buffer', () => {
  it('interpolates between the frames around the sampled time', () => {
    const buffer = createDelayBuffer()
    buffer.push(frame(0.2), 1000)
    buffer.push(frame(0.6), 1100)
    const out = emptyFrame()
    expect(buffer.sample(1025, out)).toBe(true)
    expect(out.level).toBeCloseTo(0.3)
    expect(out.bands[7]).toBeCloseTo(0.3)
  })

  it('shows the sound when it is heard: sampling earlier than the newest frame', () => {
    const buffer = createDelayBuffer()
    buffer.push(frame(0.1), 0)
    buffer.push(frame(0.9), 200)
    const out = emptyFrame()
    buffer.sample(200 - 200, out) // a 200 ms delay at "now = 200"
    expect(out.level).toBeCloseTo(0.1)
  })

  it('has nothing before the first frame and after the stream stopped', () => {
    const buffer = createDelayBuffer()
    const out = emptyFrame()
    expect(buffer.sample(0, out)).toBe(false)
    buffer.push(frame(0.5), 1000)
    expect(buffer.sample(999, out)).toBe(false)
    expect(buffer.sample(1100, out)).toBe(true) // holds the last frame briefly
    expect(buffer.sample(1300, out)).toBe(false)
  })

  it('reports each beat once, when the sampled time passes it', () => {
    const buffer = createDelayBuffer()
    buffer.push(frame(0.5), 0)
    buffer.push(frame(0.5, 0.8), 33)
    buffer.push(frame(0.5, 0.4), 66)
    expect(buffer.beatBetween(-Infinity, 20)).toBe(0)
    expect(buffer.beatBetween(20, 40)).toBeCloseTo(0.8)
    expect(buffer.beatBetween(40, 70)).toBeCloseTo(0.4)
    expect(buffer.beatBetween(70, 100)).toBe(0)
  })

  it('forgets frames older than it could ever need', () => {
    const buffer = createDelayBuffer()
    buffer.push(frame(0.5), 0)
    buffer.push(frame(0.5), 5000)
    expect(buffer.sample(10, emptyFrame())).toBe(false)
    expect(buffer.newest()).toBe(5000)
    buffer.clear()
    expect(buffer.newest()).toBe(-Infinity)
  })
})
