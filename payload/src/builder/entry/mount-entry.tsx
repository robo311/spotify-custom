// Keeps our entry button in Spotify's top-right button group. Spotify (React) may re-render the top bar,
// so a scoped observer re-inserts it; a slow interval covers the top bar itself being replaced.
import type { Store } from '../../types'
import type { UiSnapshot } from '../context'
import type { Observable } from '../lib/observable'
import { createShadowMount } from '../lib/shadow-host'
import { ENTRY_ANCHORS, NAV_BAR } from '../selectors'
import { EntryButton } from './EntryButton'

const RECHECK_MS = 2000

function findAnchor(): Element | null {
  for (const selector of ENTRY_ANCHORS) {
    const el = document.querySelector(selector)
    if (el?.parentElement) return el
  }
  return null
}

export function mountEntry(store: Store, ui: Observable<UiSnapshot>): () => void {
  const mount = createShadowMount('entry', 'span', store, ui, <EntryButton />)
  Object.assign(mount.host.style, { display: 'inline-flex', flex: 'none' })

  let observedBar: Element | null = null
  let frame = 0
  let warned = false

  const place = () => {
    frame = 0
    const anchor = findAnchor()
    if (!anchor) {
      if (!warned) console.warn('[spotify-custom] top bar buttons not found; theme studio button not shown yet')
      warned = true
      return
    }
    if (mount.host.nextElementSibling !== anchor) anchor.before(mount.host)
    const bar = document.querySelector(NAV_BAR)
    if (bar && bar !== observedBar) {
      observer.disconnect()
      observer.observe(bar, { childList: true, subtree: true })
      observedBar = bar
    }
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(place)
  }

  const observer = new MutationObserver(() => {
    if (!mount.host.isConnected || mount.host.nextElementSibling !== findAnchor()) schedule()
  })
  const interval = setInterval(() => {
    if (!mount.host.isConnected || !observedBar?.isConnected) schedule()
  }, RECHECK_MS)

  place()

  return () => {
    observer.disconnect()
    clearInterval(interval)
    cancelAnimationFrame(frame)
    mount.unmount()
  }
}
