// What's playing and what's up next, from Spotify's own player service. There is no public handle on it: it is
// the `playerAPI` prop of a provider near the top of the React tree (verified on Spotify 1.3.3), with getState()
// and an event emitter ('update' on every playback change, 'queue_update' when the queue changes).
import type { PlaybackState, PlaybackTrack } from '../types'
import { findInFiber, isRecord, rootFiber, type FiberLike } from './fiber'

export interface SpotifyPlayer {
  getState(): unknown
  /** Returns an unsubscribe function on 1.3.3; typed loosely because it's Spotify's internals. */
  _events: { addListener(name: string, fn: () => void): unknown }
}

const NEXT_LIMIT = 10
const EVENTS = ['update', 'queue_update'] as const

export function isSpotifyPlayer(value: unknown): value is SpotifyPlayer {
  return (
    isRecord(value) &&
    typeof value.getState === 'function' &&
    typeof value.skipToNext === 'function' &&
    isRecord(value._events) &&
    typeof value._events.addListener === 'function'
  )
}

export function findPlayerInFiber(root: FiberLike | null): SpotifyPlayer | null {
  return findInFiber(root, props => (isSpotifyPlayer(props.playerAPI) ? props.playerAPI : null))
}

// ---- mapping (the state is untrusted: Spotify can change it any day) ----

const text = (value: unknown): string => (typeof value === 'string' ? value : '')
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])
const field = (value: unknown, key: string): unknown => (isRecord(value) ? value[key] : undefined)

/** spotify:image:<id> → its CDN URL. Anything that isn't https is dropped (it ends up in src attributes). */
export function coverUrl(value: string): string | null {
  const id = /^spotify:image:([A-Za-z0-9]+)$/.exec(value)?.[1]
  if (id) return `https://i.scdn.co/image/${id}`
  return value.startsWith('https://') ? value : null
}

const IMAGE_ORDER = ['small', 'standard', 'large', 'xlarge']

function covers(album: unknown): { image: string | null; thumb: string | null } {
  const images = list(field(album, 'images'))
    .map(img => ({ url: coverUrl(text(field(img, 'url'))), rank: IMAGE_ORDER.indexOf(text(field(img, 'label'))) }))
    .filter((img): img is { url: string; rank: number } => img.url !== null)
    .sort((a, b) => a.rank - b.rank)
  return { image: images.at(-1)?.url ?? null, thumb: images.at(0)?.url ?? null }
}

function toTrack(item: unknown): PlaybackTrack | null {
  if (field(item, 'type') !== 'track') return null
  const uri = text(field(item, 'uri'))
  const name = text(field(item, 'name'))
  if (!uri || !name) return null
  const album = field(item, 'album')
  return {
    uri,
    name,
    artists: list(field(item, 'artists'))
      .map(a => ({ name: text(field(a, 'name')), uri: text(field(a, 'uri')) }))
      .filter(a => a.name !== ''),
    album: { name: text(field(album, 'name')), uri: text(field(album, 'uri')) },
    ...covers(album),
  }
}

/** Pure: is music playing right now (a track loaded and not paused)? */
export function isPlaying(state: unknown): boolean {
  return isRecord(field(state, 'item')) && field(state, 'isPaused') === false
}

/** Pure: Spotify's player state → our view model. */
export function mapPlayerState(state: unknown): PlaybackState {
  const track = toTrack(field(state, 'item'))
  const next = list(field(state, 'nextItems'))
    .map(toTrack)
    .filter((t): t is PlaybackTrack => t !== null)
    .slice(0, NEXT_LIMIT)
  return { track, next: track ? next : [] }
}

// ---- subscription ----

/** Calls fn now and whenever the mapped state changes (player events batched per frame). Returns unsubscribe. */
export function subscribePlayback(player: SpotifyPlayer, fn: (s: PlaybackState) => void): () => void {
  return subscribeMapped(player, mapPlayerState, fn)
}

function subscribeMapped<T>(player: SpotifyPlayer, map: (state: unknown) => T, fn: (value: T) => void): () => void {
  let last = ''
  const report = () => {
    const state = map(player.getState())
    const json = JSON.stringify(state)
    if (json === last) return
    last = json
    fn(state)
  }
  let frame = 0
  const schedule = () => {
    if (frame === 0) {
      frame = requestAnimationFrame(() => {
        frame = 0
        report()
      })
    }
  }
  const offs = EVENTS.map(name => player._events.addListener(name, schedule)).filter((off): off is () => void => typeof off === 'function')
  report()
  return () => {
    if (frame !== 0) cancelAnimationFrame(frame)
    for (const off of offs) off()
  }
}

let cached: SpotifyPlayer | null = null
let warned = false

/** Follows playback. Reports `null` once if Spotify's player can't be found (the caller then degrades). */
export function onPlayback(fn: (s: PlaybackState | null) => void): () => void {
  cached ??= findPlayerInFiber(rootFiber())
  if (!cached) {
    if (!warned) {
      warned = true
      console.warn('[spotify-custom] Spotify player not found; the lyrics Now playing column is unavailable')
    }
    fn(null)
    return () => undefined
  }
  return subscribePlayback(cached, fn)
}

let warnedPlaying = false

/**
 * Follows whether music is playing. If Spotify's player can't be found it reports true once, so features that only
 * run while music plays degrade to "always on" rather than never working.
 */
export function onPlaying(fn: (playing: boolean) => void): () => void {
  cached ??= findPlayerInFiber(rootFiber())
  if (!cached) {
    if (!warnedPlaying) {
      warnedPlaying = true
      console.warn('[spotify-custom] Spotify player not found; music-reactive effects assume music is playing')
    }
    fn(true)
    return () => undefined
  }
  return subscribeMapped(cached, isPlaying, fn)
}
