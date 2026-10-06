// Builds the ExtensionContext handed to one running extension. Every resource the extension acquires through it
// (shelves, listeners, subscriptions) is tracked and released by dispose(), and every callback into extension code
// is guarded so a throw is reported as that extension's crash instead of breaking Spotify or other extensions.
import type { ExtensionContext, ShelfDef, Store, Theme } from '../types'
import type { HomeController } from '../home'
import { spotify } from '../spotify'

export interface ContextDeps {
  extensionId: string // settings key of the extension
  store: Store
  home: HomeController
  onCrash: (error: unknown) => void
}

export interface ExtensionScope {
  ctx: ExtensionContext
  /** Releases everything acquired through ctx. Safe to call more than once. */
  dispose(): void
}

export function createExtensionScope({ extensionId, store, home, onCrash }: ContextDeps): ExtensionScope {
  const releases = new Set<() => void>()
  let disposed = false

  const track = (release: () => void): (() => void) => {
    if (disposed) {
      release()
      return () => undefined
    }
    const once = () => {
      if (!releases.delete(once)) return
      release()
    }
    releases.add(once)
    return once
  }

  const guard = <A extends unknown[], R>(fn: (...args: A) => R) =>
    (...args: A): R | undefined => {
      if (disposed) return undefined
      try {
        return fn(...args)
      } catch (error) {
        onCrash(error)
        return undefined
      }
    }

  const addHomeShelf = (def: ShelfDef) => {
    const render = guard((el: HTMLElement) => {
      const cleanup = def.render(el)
      return typeof cleanup === 'function' ? guard(cleanup) : undefined
    })
    track(home.addShelf({ id: def.id, title: def.title, render: el => render(el) }))
  }

  const subscribeTheme = (fn: (t: Theme) => void) => {
    const listener = guard(fn)
    let last = store.get().active
    return track(
      store.subscribe(state => {
        if (state.active === last) return
        last = state.active
        listener(last)
      }),
    )
  }

  // Missing until the extension saves its first value (the Record type alone would claim it always exists).
  const savedData = (): Record<string, unknown> | undefined => store.get().settings.extensionData[extensionId]

  const ctx: ExtensionContext = {
    addHomeShelf,
    onNavigate: fn => track(spotify.onNavigate(guard(fn))),
    navigate: path => spotify.navigate(path),
    spotify: { query: (operation, variables) => spotify.query(operation, variables) },
    settings: {
      get: key => savedData()?.[key],
      set: (key, value) => {
        if (Object.is(savedData()?.[key], value)) return
        store.editSettings(draft => {
          draft.extensionData[extensionId] = { ...draft.extensionData[extensionId], [key]: value }
        })
      },
    },
    theme: { get: () => store.get().active, subscribe: subscribeTheme },
  }

  return {
    ctx,
    dispose() {
      if (disposed) return
      disposed = true
      for (const release of [...releases].reverse()) {
        try {
          release()
        } catch (error) {
          console.error(`[spotify-custom] extension "${extensionId}" cleanup failed`, error)
        }
      }
      releases.clear()
    },
  }
}
