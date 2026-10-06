// Keeps Home in line with the user's config: marks native shelves with their key, mounts extension shelves,
// applies hide/order CSS, and reports the shelves it sees. Re-runs (batched per frame) whenever Spotify
// re-renders the main view.
import type { HomeConfig, ShelfDef, ShelfInfo } from '../types'
import { compileHomeCss } from './css'
import { shelfIdentity, shelfTitle } from './keys'
import { HOME_PAGE, OBSERVE_SCOPE, SHELF, SHELF_KEY_ATTR } from './selectors'
import { createShelfHost, type ShelfHost } from './shelf-host'

export interface HomeController {
  /** Re-apply hide/order after config change. */
  refresh(): void
  /** Mount a custom (extension) shelf on Home; key = 'ext:' + def.id, participates in hide/order. Returns unmount. */
  addShelf(def: ShelfDef): () => void
  dispose(): void
}

const STYLE_ID = 'sc-home'

export function startHome(opts: { getConfig: () => HomeConfig; onShelves: (s: ShelfInfo[]) => void }): HomeController {
  const hosts = new Map<string, ShelfHost>()
  const style = document.createElement('style')
  style.id = STYLE_ID
  document.head.append(style)

  let lastReported = ''
  const report = (shelves: ShelfInfo[]) => {
    const json = JSON.stringify(shelves)
    if (json === lastReported) return
    lastReported = json
    opts.onShelves(shelves)
  }

  const scan = () => {
    const home = document.querySelector(HOME_PAGE)
    // Away from Home: keep the last known list so the builder can still edit it.
    if (!home) return

    const natives = [...home.querySelectorAll(SHELF)]
    const shelves: ShelfInfo[] = []
    const seen = new Set<string>()
    for (const host of hosts.values()) {
      shelves.push({ key: host.key, title: host.title, stable: true })
      seen.add(host.key)
    }
    for (const shelf of natives) {
      const identity = shelfIdentity(shelf)
      if (!identity) continue
      if (shelf.getAttribute(SHELF_KEY_ATTR) !== identity.key) shelf.setAttribute(SHELF_KEY_ATTR, identity.key)
      if (seen.has(identity.key)) continue
      seen.add(identity.key)
      shelves.push({ key: identity.key, title: shelfTitle(shelf), stable: identity.stable })
    }

    const firstNative = natives.at(0)
    const container = firstNative?.parentElement
    if (firstNative && container) {
      for (const host of hosts.values()) {
        if (host.element.parentElement !== container) container.insertBefore(host.element, firstNative)
      }
    }
    report(shelves)
  }

  let frame = 0
  const scheduleScan = () => {
    if (frame === 0) {
      frame = requestAnimationFrame(() => {
        frame = 0
        scan()
      })
    }
  }

  const observer = new MutationObserver(scheduleScan)
  const scope = document.querySelector(OBSERVE_SCOPE) ?? document.body
  observer.observe(scope, { childList: true, subtree: true })

  const refresh = () => {
    style.textContent = compileHomeCss(opts.getConfig())
  }
  refresh()
  scan()

  return {
    refresh,
    addShelf(def) {
      hosts.get(def.id)?.dispose()
      const host = createShelfHost(def)
      hosts.set(def.id, host)
      scan()
      return () => {
        if (hosts.get(def.id) !== host) return
        hosts.delete(def.id)
        host.dispose()
        scan()
      }
    },
    dispose() {
      observer.disconnect()
      if (frame !== 0) cancelAnimationFrame(frame)
      for (const host of hosts.values()) host.dispose()
      hosts.clear()
      style.remove()
      for (const el of document.querySelectorAll(`[${SHELF_KEY_ATTR}]`)) el.removeAttribute(SHELF_KEY_ATTR)
    },
  }
}
