// Payload entry. Injected by the helper at document start (and into an already-loaded page).
// Wires the modules together; each module owns its own behaviour.
import type { AppState, ScGlobal, Store } from './types'
import { createBridge } from './core/bridge'
import { createStore } from './core/store'
import { startEffects } from './theme/effects'
import { startLyricsLibrary, startPartsRuntime, startPlayingRow, watchPanelSections, watchPartStatus } from './parts'
import { startHome } from './home'
import { startLyricsColumn } from './nowplaying'
import { startCanvasCover } from './canvas'
import { startLibrary } from './library'
import { mountBuilder } from './builder'
import { startExtensions, type ExtensionHost } from './ext'
import { installSpotifyHooks } from './spotify'
import { idleAudioChannel, startReactive } from './audio'

const BUILD_ID = __BUILD_ID__

function whenUiReady(): Promise<void> {
  const ready = () => document.querySelector('[data-testid="root"]') && document.body
  if (ready()) return Promise.resolve()
  return new Promise(resolve => {
    const mo = new MutationObserver(() => {
      if (ready()) {
        mo.disconnect()
        resolve()
      }
    })
    mo.observe(document, { childList: true, subtree: true })
  })
}

/**
 * Modules may assume <html> exists. When injected as a new-document script we run before the parser
 * has created it, so wait for it: it appears before any of Spotify's own scripts run.
 */
function whenDocumentElement(run: () => void) {
  // lib.dom types documentElement as non-null, which is false at document start.
  const html = (): HTMLElement | null => document.documentElement
  if (html()) {
    run()
    return
  }
  const mo = new MutationObserver(() => {
    if (html()) {
      mo.disconnect()
      run()
    }
  })
  mo.observe(document, { childList: true })
}

/** Calls fn whenever the selected slice of state changes identity (the store keeps identity for unchanged slices). */
function onSliceChange(store: Store, select: (s: AppState) => unknown, fn: () => void): () => void {
  let last = select(store.get())
  return store.subscribe(s => {
    const next = select(s)
    if (next !== last) {
      last = next
      fn()
    }
  })
}

function boot() {
  const prev = window.__sc
  if (prev?.version === BUILD_ID) return
  prev?.dispose()

  installSpotifyHooks()

  const bridge = createBridge()
  const store = createStore(bridge)
  const disposers: (() => void)[] = []
  let host: ExtensionHost | null = null
  let disposed = false

  const sc: ScGlobal = {
    version: BUILD_ID,
    dispose() {
      disposed = true
      for (const d of disposers.reverse()) {
        try {
          d()
        } catch (e) {
          console.error('[spotify-custom] dispose', e)
        }
      }
      disposers.length = 0
      store.dispose()
    },
    bridge,
    store,
    registerExtension: def => host?.register(def),
    audio: idleAudioChannel,
    update: s => {
      store.setUpdate(s)
    },
  }
  window.__sc = sc
  window.SC = { registerExtension: def => { sc.registerExtension(def) } }

  // Theme first, as early as possible, to avoid a flash of the default look.
  const initialised = store.init()

  Promise.all([initialised, whenUiReady()]).then(() => {
    if (disposed) return
    disposers.push(
      watchPartStatus(s => store.setPartStatus(s)),
      watchPanelSections(s => store.setPanelSections(s)),
      startPartsRuntime(),
      startPlayingRow(),
    )

    const lyricsLibrary = startLyricsLibrary(() => store.get().active.layout.lyricsKeepLibrary)
    const lyricsColumn = startLyricsColumn(() => store.get().active.layout.lyricsNowPlaying)
    disposers.push(
      onSliceChange(store, s => s.active.layout, () => {
        lyricsLibrary.refresh()
        lyricsColumn.refresh()
      }),
      () => lyricsLibrary.dispose(),
      () => lyricsColumn.dispose(),
    )

    const canvasCover = startCanvasCover(() => store.get().active)
    disposers.push(onSliceChange(store, s => s.active, () => canvasCover.refresh()), () => canvasCover.dispose())

    const home = startHome({ getConfig: () => store.get().settings.home, onShelves: s => store.setShelves(s) })
    disposers.push(onSliceChange(store, s => s.settings.home, () => home.refresh()), () => home.dispose())

    const library = startLibrary({ getStyles: () => store.get().settings.artworkStyles, onItems: f => store.setLibraryItems(f) })
    disposers.push(onSliceChange(store, s => s.settings.artworkStyles, () => library.refresh()), () => library.dispose())

    host = startExtensions({
      store,
      home,
      userFiles: store.helperState()?.extensions ?? [],
      onChange: list => store.setExtensions(list),
    })
    const h = host
    const reactive = startReactive(store, bridge)
    sc.audio = reactive.channel
    disposers.push(
      () => h.dispose(),
      startEffects(store),
      () => {
        sc.audio = idleAudioChannel
        reactive.dispose()
      },
      mountBuilder(store),
    )
  }).catch((e: unknown) => console.error('[spotify-custom] boot failed', e))
}

whenDocumentElement(boot)
