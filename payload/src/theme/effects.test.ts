import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppState, Store } from '../types'
import type { ImageColors } from './palette'
import { coverColors } from './cover-colors'
import { startEffects } from './effects'
import { PRESETS } from './presets'

vi.mock('./cover-colors', () => ({ coverColors: vi.fn() }))

const COLORS: ImageColors = { dominant: '#203040', vivid: '#e04060' }
const sampled = vi.mocked(coverColors)
const tick = () => new Promise(r => setTimeout(r, 0))
const effectsCss = () => document.getElementById('sc-effects')?.textContent ?? ''

function albumModeStore(): Store {
  const active = { ...PRESETS[0], effects: { ...PRESETS[0].effects, albumMode: true } }
  return { get: () => ({ active }) as AppState, subscribe: () => () => undefined } as unknown as Store
}

function cover(): HTMLImageElement {
  const img = document.querySelector<HTMLImageElement>('[data-testid="cover-art-image"]')
  if (!img) throw new Error('missing cover')
  return img
}

/** Animation frames run only when the test says so (happy-dom runs them as immediates). */
let frames = new Map<number, FrameRequestCallback>()
let lastFrame = 0
const runFrames = () => {
  const due = [...frames.values()]
  frames = new Map()
  for (const cb of due) cb(0)
}

beforeEach(() => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
    frames.set(++lastFrame, cb)
    return lastFrame
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id))
  document.body.innerHTML =
    '<div data-testid="now-playing-bar"><div data-testid="now-playing-widget"><img data-testid="cover-art-image" src="a.jpg"></div></div><main></main>'
  sampled.mockReset()
  sampled.mockResolvedValue(COLORS)
})

afterEach(() => {
  vi.restoreAllMocks()
  frames.clear()
  document.body.replaceChildren()
  document.head.replaceChildren()
})

describe('startEffects', () => {
  it('writes nothing when a cover sample finishes after dispose', async () => {
    let finish: (c: ImageColors) => void = () => undefined
    sampled.mockReturnValue(new Promise(r => (finish = r)))
    const dispose = startEffects(albumModeStore())
    expect(sampled).toHaveBeenCalledWith('a.jpg')
    dispose()
    finish(COLORS)
    await tick()
    expect(effectsCss()).toBe('')
  })

  it('batches cover changes per animation frame', async () => {
    const dispose = startEffects(albumModeStore())
    await tick()
    sampled.mockClear()
    cover().src = 'b.jpg'
    await tick()
    cover().src = 'c.jpg'
    await tick()
    expect(sampled).not.toHaveBeenCalled()
    runFrames()
    expect(sampled.mock.calls).toEqual([['c.jpg']])
    dispose()
  })

  it('drops a pending frame on dispose', async () => {
    const dispose = startEffects(albumModeStore())
    await tick()
    sampled.mockClear()
    cover().src = 'b.jpg'
    await tick()
    dispose()
    runFrames()
    expect(sampled).not.toHaveBeenCalled()
  })
})
