import { describe, expect, it } from 'vitest'
import { AUDIO_BANDS, decodeFrame, encodeFrame } from './frame'

const bytes = (...values: number[]) => btoa(String.fromCharCode(...values))

describe('decodeFrame', () => {
  it('reads level, beat and the 32 bands as 0–1 values', () => {
    const bands = Array.from({ length: AUDIO_BANDS }, (_, i) => i * 8)
    const frame = decodeFrame(bytes(1, 255, 51, ...bands))
    expect(frame?.level).toBe(1)
    expect(frame?.beat).toBeCloseTo(0.2)
    expect(frame?.bands).toHaveLength(AUDIO_BANDS)
    expect(frame?.bands[0]).toBe(0)
    expect(frame?.bands[31]).toBeCloseTo(248 / 255)
  })

  it('drops frames of another version, the wrong length or not base64', () => {
    const bands = new Array<number>(AUDIO_BANDS).fill(0)
    expect(decodeFrame(bytes(2, 0, 0, ...bands))).toBeNull()
    expect(decodeFrame(bytes(1, 0, 0, ...bands.slice(1)))).toBeNull()
    expect(decodeFrame('%%%not base64')).toBeNull()
  })

  it('round-trips through encodeFrame (clamping out-of-range values)', () => {
    const bands = Array.from({ length: AUDIO_BANDS }, (_, i) => i / 31)
    const frame = decodeFrame(encodeFrame({ level: 2, beat: -1, bands }))
    expect(frame?.level).toBe(1)
    expect(frame?.beat).toBe(0)
    expect(frame?.bands[31]).toBe(1)
    expect(frame?.bands[15]).toBeCloseTo(15 / 31, 2)
  })
})
