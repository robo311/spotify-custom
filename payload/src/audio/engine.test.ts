import { describe, expect, it, vi } from 'vitest'
import type { AudioStatus } from '../types'
import { fakeStore, fakeTheme } from '../ext/test-fakes'
import { startAudioEngine } from './engine'
import { AUDIO_BANDS, encodeFrame } from './frame'
import type { AudioLevels } from './envelope'

function setup() {
  const store = fakeStore()
  let setPlaying: (p: boolean) => void = () => undefined
  const send = vi.fn((on: boolean) => Promise.resolve<AudioStatus>({ state: on ? 'listening' : 'off', latencyMs: 0 }))
  const engine = startAudioEngine({
    store,
    helperConnected: true,
    send,
    onPlaying: fn => {
      setPlaying = fn
      fn(false)
      return () => undefined
    },
  })
  const withSpectrum = () => {
    const theme = fakeTheme()
    theme.effects.reactive.spectrum.on = true
    store.setActive(theme)
  }
  const enable = () =>
    store.editSettings(s => {
      s.reactive.enabled = true
    })
  return { store, send, engine, withSpectrum, enable, play: (p: boolean) => setPlaying(p) }
}

describe('audio engine', () => {
  it('tells the helper not to listen on boot when nothing wants it', () => {
    const { send, engine } = setup()
    expect(send.mock.calls).toEqual([[false]])
    engine.dispose()
  })

  it('asks the helper to listen once enabled, an effect is on and music plays', () => {
    const { send, engine, withSpectrum, enable, play } = setup()
    enable()
    withSpectrum()
    expect(send).toHaveBeenLastCalledWith(false) // still paused
    play(true)
    expect(send).toHaveBeenLastCalledWith(true)
    engine.dispose()
    expect(send).toHaveBeenLastCalledWith(false)
  })

  it('turns incoming frames into levels on the next display frames', async () => {
    const { engine, send } = setup()
    await send.mock.results[0]?.value // let the boot "don't listen" reply land (it clears buffered frames)
    await Promise.resolve()
    engine.channel.status({ state: 'listening', latencyMs: 0 })
    const seen: number[] = []
    engine.onLevels((l: AudioLevels) => seen.push(l.level))
    const loud = encodeFrame({ level: 1, beat: 0, bands: new Array<number>(AUDIO_BANDS).fill(1) })
    for (let i = 0; i < 4; i++) engine.channel.frame(loud)
    await vi.waitFor(() => expect(Math.max(...seen)).toBeGreaterThan(0.3))
    engine.dispose()
  })

  it('accepts well-formed statuses only', () => {
    const { engine } = setup()
    const statuses: AudioStatus[] = []
    engine.onStatus(s => statuses.push(s))
    engine.channel.status({ state: 'needs-permission', latencyMs: 12, message: 'no' })
    engine.channel.status({ state: 'bogus', latencyMs: 0 } as unknown as AudioStatus)
    expect(engine.status()).toEqual({ state: 'needs-permission', latencyMs: 12, message: 'no' })
    expect(statuses).toHaveLength(1)
    engine.dispose()
  })
})
