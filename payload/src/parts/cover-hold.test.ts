import { describe, expect, it, vi } from 'vitest'
import { createCoverHold } from './cover-hold'

/** A loader whose loads the test finishes by hand. */
function manualLoader() {
  const pending = new Map<string, { resolve: () => void; reject: () => void }>()
  const load = vi.fn(
    (url: string) =>
      new Promise<void>((resolve, reject) => {
        pending.set(url, { resolve, reject })
      }),
  )
  const finish = async (url: string, ok = true) => {
    const p = pending.get(url)
    if (ok) p?.resolve()
    else p?.reject()
    await Promise.resolve()
    await Promise.resolve()
  }
  return { load, finish }
}

describe('createCoverHold', () => {
  it('takes the first cover once it has loaded', async () => {
    const { load, finish } = manualLoader()
    const changed = vi.fn()
    const hold = createCoverHold(changed, load)
    expect(hold.offer('a')).toBeNull()
    await finish('a')
    expect(hold.current()).toBe('a')
    expect(changed).toHaveBeenCalledTimes(1)
  })

  // Skipping a song: Spotify's player-bar cover briefly disappears, then shows a cover that is still loading. Dropping
  // or switching to it right away left the window-wide blurred cover empty (black) for a moment.
  it('keeps the current cover while Spotify has none and while the next one loads', async () => {
    const { load, finish } = manualLoader()
    const hold = createCoverHold(() => undefined, load)
    hold.offer('a')
    await finish('a')
    expect(hold.offer(null)).toBe('a')
    expect(hold.offer('b')).toBe('a')
    await finish('b')
    expect(hold.current()).toBe('b')
  })

  it('switches only to the latest cover when songs change quickly; a cover that fails to load still takes over', async () => {
    const { load, finish } = manualLoader()
    const hold = createCoverHold(() => undefined, load)
    hold.offer('a')
    await finish('a')
    hold.offer('b')
    hold.offer('c')
    await finish('b')
    expect(hold.current()).toBe('a')
    await finish('c', false)
    expect(hold.current()).toBe('c')
    expect(load).toHaveBeenCalledTimes(3)
  })
})
