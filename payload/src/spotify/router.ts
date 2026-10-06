// In-app navigation through Spotify's own router.
// Spotify uses a *memory* history (not window.history), so pushState/popstate can't drive it; the history object is
// found as the `history`/`navigator` prop of a router component near the top of the React tree.
import { findInFiber, isRecord, rootFiber, type FiberLike } from './fiber'

export interface SpotifyHistory {
  push(path: string): void
  listen(listener: (update: unknown) => void): () => void
  location: { pathname: string }
}

const HISTORY_PROP_NAMES = ['history', 'navigator'] as const

export function isSpotifyHistory(value: unknown): value is SpotifyHistory {
  if (!isRecord(value)) return false
  const location = value.location
  return (
    typeof value.push === 'function' &&
    typeof value.listen === 'function' &&
    isRecord(location) &&
    typeof location.pathname === 'string'
  )
}

export function findHistoryInFiber(root: FiberLike | null): SpotifyHistory | null {
  return findInFiber(root, props => HISTORY_PROP_NAMES.map(name => props[name]).find(isSpotifyHistory) ?? null)
}

let cached: SpotifyHistory | null = null
let warned = false

function history(): SpotifyHistory | null {
  cached ??= findHistoryInFiber(rootFiber())
  if (!cached && !warned) {
    warned = true
    console.warn('[spotify-custom] Spotify router not found; in-app navigation is unavailable')
  }
  return cached
}

/** history v4 passes (location, action); v5 passes ({ location, action }). */
function pathnameOf(update: unknown): string | null {
  if (!isRecord(update)) return null
  const location = isRecord(update.location) ? update.location : update
  return typeof location.pathname === 'string' ? location.pathname : null
}

export function navigate(path: string): void {
  history()?.push(path)
}

/** The open page's path (e.g. /album/ID), or null if Spotify's router can't be found. */
export function currentPath(): string | null {
  return history()?.location.pathname ?? null
}

export function onNavigate(listener: (path: string) => void): () => void {
  const h = history()
  if (!h) return () => undefined
  return h.listen(update => {
    const path = pathnameOf(update)
    if (path !== null) listener(path)
  })
}

/** Converts a Spotify URI (spotify:artist:ID) to an in-app path (/artist/ID). */
export function uriToPath(uri: string): string | null {
  const [scheme, type, id] = uri.split(':')
  return scheme === 'spotify' && type && id ? `/${type}/${id}` : null
}
