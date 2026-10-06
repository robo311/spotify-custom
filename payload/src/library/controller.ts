// Keeps library artwork applied and reports the customisable items (folders, Liked Songs) the library shows.
// The sidebar list is virtualised, so each scan sees only rendered rows; items seen earlier are remembered.
import type { ArtworkStyle, LibraryItemInfo } from '../types'
import { compileArtworkCss } from './css'
import { artworkIconSvg } from './icons'
import { readLibraryItem } from './keys'
import { LIBRARY_ENTRY, SIDEBAR } from './selectors'

export interface LibraryController {
  /** Re-apply after Settings.artworkStyles changed. */
  refresh(): void
  dispose(): void
}

const STYLE_ID = 'sc-library'

export function startLibrary(opts: {
  getStyles: () => Record<string, ArtworkStyle>
  onItems: (items: LibraryItemInfo[]) => void
}): LibraryController {
  document.getElementById(STYLE_ID)?.remove()
  const style = document.createElement('style')
  style.id = STYLE_ID
  document.head.append(style)

  const known = new Map<string, LibraryItemInfo>() // by uri, in first-seen order
  let lastReported = ''

  const scan = () => {
    const sidebar = document.querySelector(SIDEBAR)
    if (!sidebar) return
    for (const entry of sidebar.querySelectorAll(LIBRARY_ENTRY)) {
      const item = readLibraryItem(entry)
      // An entry that is still rendering may have no title yet; never overwrite a known name with an empty one.
      if (item && (item.name !== '' || !known.has(item.uri))) known.set(item.uri, item)
    }
    const items = [...known.values()]
    const json = JSON.stringify(items)
    if (json === lastReported) return
    lastReported = json
    opts.onItems(items)
  }

  let frame = 0
  const scheduleScan = () => {
    if (frame !== 0) return
    frame = requestAnimationFrame(() => {
      frame = 0
      scan()
    })
  }

  // The sidebar element survives collapse/expand; observing its parent also catches it being re-created.
  const scope = document.querySelector(SIDEBAR)?.parentElement ?? document.body
  const observer = new MutationObserver(scheduleScan)
  observer.observe(scope, { childList: true, subtree: true })

  const refresh = () => {
    style.textContent = compileArtworkCss(opts.getStyles(), artworkIconSvg)
  }
  refresh()
  scan()

  return {
    refresh,
    dispose() {
      observer.disconnect()
      if (frame !== 0) cancelAnimationFrame(frame)
      style.remove()
    },
  }
}
