// Theme builder: the 🎨 entry button in Spotify's top bar and the studio drawer. Mount/unmount only.
import type { Store } from '../types'
import type { UiSnapshot } from './context'
import { observable } from './lib/observable'
import { loadPrefs } from './lib/prefs'
import { mountDrawer } from './shell/mount-drawer'
import { mountEntry } from './entry/mount-entry'

/** Injects the top-bar button and the theme builder drawer. Returns unmount. */
export function mountBuilder(store: Store): () => void {
  const ui = observable<UiSnapshot>({ open: false, tab: loadPrefs().tab, picking: false, editingArtwork: null })
  const unmountDrawer = mountDrawer(store, ui)
  const unmountEntry = mountEntry(store, ui)
  return () => {
    unmountEntry()
    unmountDrawer()
  }
}
