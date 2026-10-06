import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PartStatus } from '../types'
import { findPartAt, partElements, readPartStatus, watchPartStatus } from './status'
import { mountSpotifyLayout } from './fixtures/spotify-layout'

function byId(id: string): Element {
  const el = document.getElementById(id)
  if (!el) throw new Error(`fixture has no #${id}`)
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('readPartStatus', () => {
  it('reports every part present in real markup', () => {
    mountSpotifyLayout()
    expect(Object.values(readPartStatus()).every(s => s === 'ok')).toBe(true)
  })

  it('reports parts missing from an empty page', () => {
    expect(readPartStatus().playerBar).toBe('missing')
  })
})

describe('findPartAt', () => {
  it('returns the innermost part', () => {
    mountSpotifyLayout()
    expect(findPartAt(byId('track-link'))?.id).toBe('playerBar')
    expect(findPartAt(byId('card-play'))?.id).toBe('playButton')
    expect(findPartAt(byId('card-image'))?.id).toBe('cards')
    expect(findPartAt(byId('shelf-title'))?.id).toBe('shelfHeaders')
    expect(findPartAt(byId('panel-text'))?.id).toBe('rightPanel')
  })

  it('returns null outside curated parts', () => {
    mountSpotifyLayout()
    expect(findPartAt(byId('outside'))).toBeNull()
  })
})

describe('partElements', () => {
  it('lists all elements of a part', () => {
    mountSpotifyLayout()
    expect(partElements('playButton')).toHaveLength(2)
    expect(partElements('nope')).toEqual([])
  })
})

describe('watchPartStatus', () => {
  it('reports immediately and again when a part disappears', async () => {
    mountSpotifyLayout()
    const calls: PartStatus[] = []
    const stop = watchPartStatus(s => calls.push(s))
    expect(calls).toHaveLength(1)

    document.querySelector('[data-testid="now-playing-bar"]')?.remove()
    await vi.waitFor(() => {
      expect(calls.at(-1)?.playerBar).toBe('missing')
    })
    stop()
  })

  it('stays quiet when nothing relevant changes', async () => {
    mountSpotifyLayout()
    const cb = vi.fn()
    const stop = watchPartStatus(cb)
    document.getElementById('outside')?.append(document.createElement('span'))
    await new Promise(r => setTimeout(r, 50))
    expect(cb).toHaveBeenCalledTimes(1)
    stop()
  })
})
