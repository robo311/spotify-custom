import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AudioStatus } from '../types'
import { defaultReactiveLook } from '../theme/model'
import { anyEffectOn, captureWanted, createWantSender, OFF_DELAY_MS } from './wanted'

const all = { enabled: true, anyEffectOn: true, playing: true, visible: true, helperConnected: true }

describe('captureWanted', () => {
  it('listens only when every condition holds', () => {
    expect(captureWanted(all)).toBe(true)
    for (const key of Object.keys(all) as (keyof typeof all)[]) {
      expect(captureWanted({ ...all, [key]: false })).toBe(false)
    }
  })
})

describe('anyEffectOn', () => {
  it('is false for the default look and true once any effect is on', () => {
    const look = defaultReactiveLook()
    expect(anyEffectOn(look)).toBe(false)
    look.lyrics.on = true
    expect(anyEffectOn(look)).toBe(true)
  })
})

describe('createWantSender', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  const listening: AudioStatus = { state: 'listening', latencyMs: 40 }
  const setup = () => {
    vi.useFakeTimers()
    const send = vi.fn((on: boolean) => Promise.resolve<AudioStatus>(on ? listening : { state: 'off', latencyMs: 0 }))
    const onStatus = vi.fn()
    return { send, onStatus, sender: createWantSender(send, onStatus) }
  }

  it('sends the first wish at once, even "off" (stops a capture a reloaded page left running)', () => {
    const { send, sender } = setup()
    sender.set(false)
    expect(send).toHaveBeenCalledWith(false)
  })

  it('turns on immediately and only once', async () => {
    const { send, onStatus, sender } = setup()
    sender.set(true)
    sender.set(true)
    expect(send.mock.calls).toEqual([[true]])
    await vi.waitFor(() => expect(onStatus).toHaveBeenCalledWith(listening))
  })

  it('waits before turning off, and a quick "on" cancels it', () => {
    const { send, sender } = setup()
    sender.set(true)
    sender.set(false)
    vi.advanceTimersByTime(OFF_DELAY_MS - 1)
    sender.set(true)
    vi.advanceTimersByTime(OFF_DELAY_MS)
    expect(send.mock.calls).toEqual([[true]])
    sender.set(false)
    vi.advanceTimersByTime(OFF_DELAY_MS)
    expect(send.mock.calls).toEqual([[true], [false]])
  })

  it('reports a failed call as an error status, and ignores answers to superseded calls', async () => {
    vi.useFakeTimers()
    let resolveFirst: (s: AudioStatus) => void = () => undefined
    const send = vi
      .fn<(on: boolean) => Promise<AudioStatus>>()
      .mockImplementationOnce(() => new Promise(r => (resolveFirst = r)))
      .mockImplementationOnce(() => Promise.reject(new Error('helper gone')))
    const onStatus = vi.fn()
    const sender = createWantSender(send, onStatus, 0)
    sender.set(true)
    sender.set(false)
    vi.advanceTimersByTime(0)
    resolveFirst(listening)
    await vi.waitFor(() => expect(onStatus).toHaveBeenCalledWith({ state: 'error', latencyMs: 0, message: 'helper gone' }))
    expect(onStatus).not.toHaveBeenCalledWith(listening)
  })

  it('stops listening when disposed', () => {
    const { send, sender } = setup()
    sender.set(true)
    sender.dispose()
    expect(send.mock.calls).toEqual([[true], [false]])
    sender.set(true)
    expect(send).toHaveBeenCalledTimes(2)
  })
})
