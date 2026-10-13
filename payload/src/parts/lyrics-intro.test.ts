import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LYRICS_INTRO_ATTR, LYRICS_INTRO_MS } from './lyrics'
import { startLyricsIntro } from './lyrics-intro'

const root = document.documentElement
const flush = () => new Promise<void>(resolve => queueMicrotask(resolve))

describe('startLyricsIntro', () => {
  let stop: () => void
  beforeEach(() => {
    vi.useFakeTimers()
    stop = startLyricsIntro()
  })
  afterEach(() => {
    stop()
    vi.useRealTimers()
    for (const name of ['data-cinema-npv-duringenter', 'data-cinema-library-npv-duringenter', 'data-cinema-npv-postenter']) root.removeAttribute(name)
  })

  it('marks <html> while the lyrics view opens, for as long as the cascade runs', async () => {
    root.setAttribute('data-cinema-npv-duringenter', '')
    await flush()
    expect(root.hasAttribute(LYRICS_INTRO_ATTR)).toBe(true)
    root.removeAttribute('data-cinema-npv-duringenter')
    root.setAttribute('data-cinema-npv-postenter', '')
    await flush()
    vi.advanceTimersByTime(LYRICS_INTRO_MS - 1)
    expect(root.hasAttribute(LYRICS_INTRO_ATTR)).toBe(true)
    vi.advanceTimersByTime(1)
    expect(root.hasAttribute(LYRICS_INTRO_ATTR)).toBe(false)
  })

  it('also marks the opening from the library view', async () => {
    root.setAttribute('data-cinema-library-npv-duringenter', '')
    await flush()
    expect(root.hasAttribute(LYRICS_INTRO_ATTR)).toBe(true)
  })

  it('leaves no mark behind when disposed mid-intro', async () => {
    root.setAttribute('data-cinema-npv-duringenter', '')
    await flush()
    stop()
    expect(root.hasAttribute(LYRICS_INTRO_ATTR)).toBe(false)
    stop = () => undefined
  })
})
