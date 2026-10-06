// Mounts the full-viewport, click-through layer that holds the drawer and the pick-mode spotlight.
import type { Store } from '../../types'
import type { UiSnapshot } from '../context'
import type { Observable } from '../lib/observable'
import { createShadowMount } from '../lib/shadow-host'
import { App } from './App'

export function mountDrawer(store: Store, ui: Observable<UiSnapshot>): () => void {
  const mount = createShadowMount('builder', 'div', store, ui, <App />)
  Object.assign(mount.host.style, { position: 'fixed', inset: '0', zIndex: '2147483000', pointerEvents: 'none' })
  document.body.append(mount.host)
  return () => mount.unmount()
}
