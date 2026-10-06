// Keyboard shortcuts while the drawer is open: undo/redo and Esc. Closed drawer = no listeners at all,
// so Spotify's own shortcuts are never hijacked. Listens in the bubble phase so popovers (capture phase) get Esc first.
import { useEffect } from 'preact/hooks'
import { useEnv } from '../context'

function isEditable(target: EventTarget | undefined): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
}

export function useShortcuts(open: boolean): void {
  const { store, ui } = useEnv()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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
  }, [open, store, ui])
}
