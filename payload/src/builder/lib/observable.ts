// Minimal observable value for builder-local UI state (drawer open, active tab, pick mode).
// Same get/subscribe shape as the app Store, so one hook (useSelect) serves both.

export interface Source<T> {
  get(): T
  subscribe(fn: (value: T) => void): () => void
}

export interface Observable<T> extends Source<T> {
  set(next: T | ((prev: T) => T)): void
}

export function observable<T>(initial: T): Observable<T> {
  let value = initial
  const listeners = new Set<(value: T) => void>()
  return {
    get: () => value,
    set(next) {
      const resolved = typeof next === 'function' ? (next as (prev: T) => T)(value) : next
      if (Object.is(resolved, value)) return
      value = resolved
      for (const fn of [...listeners]) fn(value)
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}
