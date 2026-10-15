// Whether songs are in Liked Songs, for the heart shortcut's filled state. Asks Spotify in one batch per frame for
// every song that appeared, keeps the answers, and tells the buttons when one changes.
import type { ShortcutSource } from './source'

export interface Likes {
  /** null until Spotify has answered. */
  get(uri: string): boolean | null
  set(uri: string, liked: boolean): void
  /** Asks Spotify (again, with force: the user may have used Spotify's own heart meanwhile). */
  request(uri: string, force?: boolean): void
  subscribe(fn: () => void): () => void
  dispose(): void
}

export function createLikes(source: Pick<ShortcutSource, 'isLiked'>, onError: (e: unknown) => void): Likes {
  const known = new Map<string, boolean>()
  const pending = new Set<string>()
  const listeners = new Set<() => void>()
  let frame = 0
  let disposed = false

  const notify = () => {
    for (const fn of listeners) fn()
  }

  const flush = () => {
    frame = 0
    const uris = [...pending]
    pending.clear()
    source.isLiked(uris).then(
      liked => {
        if (disposed) return
        uris.forEach((uri, i) => known.set(uri, liked.at(i) === true))
        notify()
      },
      onError,
    )
  }

  return {
    get: uri => known.get(uri) ?? null,
    set(uri, liked) {
      known.set(uri, liked)
      notify()
    },
    request(uri, force = false) {
      if (disposed || (!force && known.has(uri))) return
      pending.add(uri)
      if (frame === 0) frame = requestAnimationFrame(flush)
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    dispose() {
      disposed = true
      if (frame !== 0) cancelAnimationFrame(frame)
      listeners.clear()
    },
  }
}
