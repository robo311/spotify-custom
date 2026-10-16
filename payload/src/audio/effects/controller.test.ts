import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeStore, fakeTheme } from '../../ext/test-fakes'
import type { AudioEngine } from '../engine'
import type { AudioLevels } from '../envelope'
import { startReactiveEffects } from './controller'

function fakeEngine() {
  const listeners = new Set<(l: AudioLevels) => void>()
  const paint = { attach: vi.fn(), size: vi.fn(), played: vi.fn(), detach: vi.fn(), context: vi.fn() }
  const engine = {
    paint,
    onLevels: (fn: (l: AudioLevels) => void) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  } as unknown as AudioEngine
  return { engine, paint, listening: () => listeners.size > 0 }
}

function setup(effects: ('spectrum' | 'background' | 'pulse' | 'lyrics')[]) {
  const store = fakeStore()
  store.editSettings(s => {
    s.reactive.enabled = true
  })
  const theme = fakeTheme()
  for (const key of effects) theme.effects.reactive[key].on = true
  store.setActive(theme)
  return { store, theme }
}

afterEach(() => {
  document.body.replaceChildren()
  document.head.querySelectorAll('#sc-reactive').forEach(el => el.remove())
})

describe('reactive effects controller', () => {
  it("hands the painted effects' canvases to the scene and never listens for levels for them", () => {
    const { store } = setup(['spectrum', 'background'])
    const { engine, paint, listening } = fakeEngine()
    const stop = startReactiveEffects(engine, store)
    expect(paint.attach.mock.calls.map(c => c[0] as string).sort()).toEqual(['backdrop', 'spectrum'])
    expect(paint.context).toHaveBeenCalled()
    expect(listening()).toBe(false)
    stop()
    expect(paint.detach.mock.calls.map(c => c[0] as string).sort()).toEqual(['backdrop', 'spectrum'])
  })

  it('listens for levels only while an effect on Spotify’s own elements runs', () => {
    const { store, theme } = setup(['spectrum'])
    const { engine, listening } = fakeEngine()
    const stop = startReactiveEffects(engine, store)
    expect(listening()).toBe(false)
    const withPulse = structuredClone(theme)
    withPulse.effects.reactive.pulse.on = true
    store.setActive(withPulse)
    expect(listening()).toBe(true)
    const without = structuredClone(withPulse)
    without.effects.reactive.pulse.on = false
    store.setActive(without)
    expect(listening()).toBe(false)
    stop()
  })

  it('listens for lyrics react only while lyrics show, starting at once when the lyrics view opens', async () => {
    vi.useFakeTimers()
    const { store } = setup(['lyrics'])
    const { engine, listening } = fakeEngine()
    const stop = startReactiveEffects(engine, store)
    expect(listening()).toBe(false) // lyrics react on, but no lyrics anywhere
    document.body.innerHTML = '<div data-testid="lyrics-line">la</div>'
    document.documentElement.setAttribute('data-cinema-npv-postenter', '')
    await Promise.resolve() // the observer's microtask: no waiting for the next heal
    expect(listening()).toBe(true)
    document.body.replaceChildren()
    document.documentElement.removeAttribute('data-cinema-npv-postenter')
    await Promise.resolve()
    expect(listening()).toBe(false)
    document.body.innerHTML = '<aside><div data-testid="lyrics-line">la</div></aside>' // the Now playing card's lyrics
    vi.advanceTimersByTime(1000) // found at the next heal
    expect(listening()).toBe(true)
    stop()
    vi.useRealTimers()
  })

  it('tells the scene about a new look only when something changed', () => {
    const { store } = setup(['spectrum'])
    const { engine, paint } = fakeEngine()
    const stop = startReactiveEffects(engine, store)
    const sent = paint.context.mock.calls.length
    store.editSettings(s => {
      s.reactive.syncMs = 40 // personal setting, not the look
    })
    expect(paint.context.mock.calls.length).toBe(sent)
    stop()
  })
})
