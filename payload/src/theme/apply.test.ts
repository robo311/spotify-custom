import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INSTANT_HOLD_MS, applyThemeCss, clearMorphSuppression } from './apply'
import { createBridge } from '../core/bridge'
import { createStore } from '../core/store'
import { PRESETS } from './presets'

const suppressed = () => document.documentElement.classList.contains('sc-no-morph')

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  clearMorphSuppression()
  vi.useRealTimers()
  localStorage.clear()
})

describe('morph suppression', () => {
  it('lasts at most two frames after an instant change, even if animation frames never run', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0) // hidden window: frames stall
    applyThemeCss('a { color: red }', { instant: true, cache: false })
    expect(suppressed()).toBe(true)
    vi.advanceTimersByTime(INSTANT_HOLD_MS)
    expect(suppressed()).toBe(false)
    raf.mockRestore()
  })

  it('extends to the latest deadline when changes overlap (preview → switch interleave)', () => {
    applyThemeCss('a { color: red }', { instant: true, cache: false })
    vi.advanceTimersByTime(INSTANT_HOLD_MS - 10)
    applyThemeCss('a { color: blue }', { origin: { x: 1, y: 1 }, cache: false }) // no View Transitions here → instant
    vi.advanceTimersByTime(20)
    expect(suppressed()).toBe(true)
    vi.advanceTimersByTime(INSTANT_HOLD_MS)
    expect(suppressed()).toBe(false)
  })

  it('is cleared when the store is disposed mid-preview (hot re-inject)', async () => {
    const store = createStore(createBridge())
    await store.init()
    const nord = PRESETS.find(p => p.id === 'nord')
    if (!nord) throw new Error('missing preset')
    store.preview(nord)
    expect(suppressed()).toBe(true)
    store.dispose()
    expect(suppressed()).toBe(false)
    vi.advanceTimersByTime(1000)
    expect(suppressed()).toBe(false)
  })
})
