// Reload-surviving state of the Spotify internals adapter.
// Lives on a window symbol so a hot-reloaded payload keeps the fetch hook (installed once) and what it has learned.

export interface HooksState {
  /** Latest replayable headers seen on Spotify's own GraphQL requests; null until the first one. */
  headers: Record<string, string> | null
  /** Persisted-query hashes by operation name (captured from traffic or discovered in JS). */
  hashes: Map<string, string>
  /** JS URLs already scanned for operation hashes. */
  scannedScripts: Set<string>
  /** Called whenever headers are (re)captured. */
  headerListeners: Set<() => void>
  /** The unwrapped window.fetch, used for our own requests so they don't pass through the hook. */
  originalFetch: typeof fetch | null
}

const STATE_KEY = Symbol.for('spotify-custom.spotify-internals')

type StateHolder = Record<symbol, HooksState | undefined>

export function hooksState(): HooksState {
  const holder = window as unknown as StateHolder
  holder[STATE_KEY] ??= {
    headers: null,
    hashes: new Map(),
    scannedScripts: new Set(),
    headerListeners: new Set(),
    originalFetch: null,
  }
  return holder[STATE_KEY]
}

/** Test helper: forget everything (the state otherwise outlives modules on purpose). */
export function resetHooksState(): void {
  const holder = window as unknown as StateHolder
  holder[STATE_KEY] = undefined
}
