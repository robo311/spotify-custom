// Subscribes a component to one slice of an observable source; re-renders only when that slice changes.
import { useCallback } from 'preact/hooks'
import { useSyncExternalStore } from 'preact/compat'
import type { Source } from '../lib/observable'

export function useSelect<S, R>(source: Source<S>, selector: (s: S) => R): R {
  const subscribe = useCallback((onChange: () => void) => source.subscribe(onChange), [source])
  return useSyncExternalStore(subscribe, () => selector(source.get()))
}
