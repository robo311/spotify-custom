// Keyboard shortcuts while the drawer is open: undo/redo and Esc. Closed drawer = no listeners at all,
// so Spotify's own shortcuts are never hijacked; Esc in Spotify's own fields, dialogs and menus stays Spotify's too.
// Listens in the bubble phase so pick mode and popovers get Esc first.
import { useEffect } from 'preact/hooks'
import { useEnv } from '../context'
import { SPOTIFY_OVERLAYS } from '../selectors'

function isEditable(target: EventTarget | undefined): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
}

/** Esc meant for Spotify: typed in one of its fields (search) or pressed inside one of its dialogs or menus. */
function isSpotifyEscape(e: KeyboardEvent, host: Element): boolean {
  const path = e.composedPath()
  if (path.includes(host)) return false
  const target = path[0]
  return isEditable(target) || (target instanceof Element && target.closest(SPOTIFY_OVERLAYS) !== null)
}

export function useShortcuts(open: boolean): void {
  const { store, ui, root } = useEnv()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (e.defaultPrevented || isSpotifyEscape(e, root.host)) return
        e.preventDefault()
        // Pick mode handles its own Esc (PickLayer), so reaching here means: close the drawer.
        ui.set(s => ({ ...s, open: false }))
        return
      }
      const mod = e.metaKey || e.ctrlKey
      if (!mod || isEditable(e.composedPath()[0])) return
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) store.undo()
      else if ((key === 'z' && e.shiftKey) || key === 'y') store.redo()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, root, store, ui])
}
