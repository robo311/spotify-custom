import { describe, expect, it } from 'vitest'
import { createEnvelope } from './envelope'
import { AUDIO_BANDS, type AudioFrame } from './frame'

const frame = (v: number): AudioFrame => ({ level: v, beat: 0, bands: new Float32Array(AUDIO_BANDS).fill(v) })
const run = (steps: number, fn: () => void) => {
  for (let i = 0; i < steps; i++) fn()
}

describe('envelope', () => {
  it('rises fast and falls slower', () => {
    const env = createEnvelope()
    env.step(frame(1), 0, 16, 1)
    const afterRise = env.levels.level
    run(30, () => env.step(frame(1), 0, 16, 1))
    env.step(null, 0, 16, 1)
    const fallen = 1 - env.levels.level
    expect(afterRise).toBeGreaterThan(0.4) // one 16 ms frame gets most of the way up
    expect(fallen).toBeLessThan(0.15) // and the same time only drops a little
  })

  it('derives the bass from the lowest bands', () => {
    const env = createEnvelope()
    const bassOnly = frame(0)
    bassOnly.bands.fill(1, 0, 4)
    run(40, () => env.step(bassOnly, 0, 16, 1))
    expect(env.levels.bass).toBeGreaterThan(0.95)
    expect(env.levels.bands[10]).toBe(0)
  })

  it('kicks on a beat and decays', () => {
    const env = createEnvelope()
    env.step(frame(0.5), 0.9, 16, 1)
    expect(env.levels.beat).toBeCloseTo(0.9)
    run(10, () => env.step(frame(0.5), 0, 16, 1))
    expect(env.levels.beat).toBeLessThan(0.3)
  })

  it('scales with sensitivity, clamped to 1', () => {
    const env = createEnvelope()
    run(40, () => env.step(frame(0.3), 0, 16, 2))
    expect(env.levels.level).toBeCloseTo(0.6, 2)
    run(40, () => env.step(frame(0.8), 0, 16, 2))
    expect(env.levels.level).toBeLessThanOrEqual(1)
  })

  it('settles to silence', () => {
    const env = createEnvelope()
    run(10, () => env.step(frame(1), 1, 16, 1))
    expect(env.settled()).toBe(false)
    run(200, () => env.step(null, 0, 16, 1))
    expect(env.settled()).toBe(true)
  })
})
