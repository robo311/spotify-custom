import { describe, expect, it, vi } from 'vitest'
import { coverUrl, findPlayerInFiber, isPlaying, mapPlayerState, subscribePlayback } from './player'

const track = (name: string, extra: Record<string, unknown> = {}) => ({
  type: 'track',
  uri: `spotify:track:${name}`,
  name,
  album: {
    uri: 'spotify:album:a1',
    name: 'Album',
    images: [
      { url: 'spotify:image:small', label: 'small' },
      { url: 'spotify:image:large', label: 'large' },
      { url: 'spotify:image:xl', label: 'xlarge' },
    ],
  },
  artists: [
    { uri: 'spotify:artist:x', name: 'X' },
    { uri: 'spotify:artist:y', name: 'Y' },
  ],
  metadata: {},
  ...extra,
})

describe('mapPlayerState', () => {
  it('maps the current track, its artists and covers', () => {
    const state = mapPlayerState({ item: track('now'), nextItems: [] })
    expect(state.track).toEqual({
      uri: 'spotify:track:now',
      name: 'now',
      artists: [
        { name: 'X', uri: 'spotify:artist:x' },
        { name: 'Y', uri: 'spotify:artist:y' },
      ],
      album: { name: 'Album', uri: 'spotify:album:a1' },
      image: 'https://i.scdn.co/image/xl',
      thumb: 'https://i.scdn.co/image/small',
    })
  })

  it('lists up to ten upcoming tracks and skips non-track items', () => {
    const next = [track('n1'), { type: 'ad', uri: 'spotify:ad:1', name: 'Ad' }, ...Array.from({ length: 12 }, (_, i) => track(`m${i}`))]
    const state = mapPlayerState({ item: track('now'), nextItems: next })
    expect(state.next.map(t => t.name)).toEqual(['n1', 'm0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'])
  })

  it('survives a state Spotify changed under us', () => {
    expect(mapPlayerState(null)).toEqual({ track: null, next: [] })
    expect(mapPlayerState({ item: { type: 'track' }, nextItems: 'nope' })).toEqual({ track: null, next: [] })
  })
})

describe('coverUrl', () => {
  it('turns Spotify image URIs into CDN URLs and keeps https ones', () => {
    expect(coverUrl('spotify:image:abc')).toBe('https://i.scdn.co/image/abc')
    expect(coverUrl('https://i.scdn.co/image/abc')).toBe('https://i.scdn.co/image/abc')
    expect(coverUrl('javascript:alert(1)')).toBeNull()
  })
})

const fakePlayer = () => {
  const listeners = new Map<string, Set<() => void>>()
  let state: unknown = { item: track('one'), nextItems: [] }
  return {
    getState: () => state,
    getQueue: vi.fn(),
    skipToNext: vi.fn(),
    _events: {
      addListener(name: string, fn: () => void) {
        const set = listeners.get(name) ?? new Set()
        set.add(fn)
        listeners.set(name, set)
        return () => set.delete(fn)
      },
    },
    set(next: unknown) {
      state = next
    },
    emit(name: string) {
      for (const fn of listeners.get(name) ?? []) fn()
    },
    count: () => [...listeners.values()].reduce((n, s) => n + s.size, 0),
  }
}

describe('findPlayerInFiber', () => {
  it('finds the playerAPI prop of a provider', () => {
    const player = fakePlayer()
    expect(findPlayerInFiber({ memoizedProps: {}, child: { memoizedProps: { playerAPI: player } } })).toBe(player)
    expect(findPlayerInFiber({ memoizedProps: { playerAPI: {} } })).toBeNull()
  })
})

describe('subscribePlayback', () => {
  it('reports now and after each player update, and unsubscribes', async () => {
    const player = fakePlayer()
    const seen: string[] = []
    const stop = subscribePlayback(player, s => seen.push(s.track?.name ?? '-'))
    expect(seen).toEqual(['one'])

    player.set({ item: track('two'), nextItems: [] })
    player.emit('update')
    player.emit('queue_update')
    await vi.waitFor(() => {
      expect(seen).toEqual(['one', 'two'])
    })
    stop()
    expect(player.count()).toBe(0)
  })
})

describe('isPlaying', () => {
  it('is true only with a track loaded and not paused', () => {
    expect(isPlaying({ item: track('now'), isPaused: false })).toBe(true)
    expect(isPlaying({ item: track('now'), isPaused: true })).toBe(false)
    expect(isPlaying({ item: null, isPaused: false })).toBe(false)
    expect(isPlaying(undefined)).toBe(false)
  })
})
