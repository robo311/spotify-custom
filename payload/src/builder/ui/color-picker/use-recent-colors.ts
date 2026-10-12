// Recently used colours, shared by every picker and remembered across sessions.
// Remembering is debounced so dragging through hundreds of colours records only where the drag ended.
import { useEffect, useRef, useState } from 'preact/hooks'
import { loadPrefs, pushRecent, savePrefs } from '../../lib/prefs'

const SETTLE_MS = 700

function save(hex: string): string[] {
  const next = pushRecent(loadPrefs().recentColors, hex)
  savePrefs({ recentColors: next })
  return next
}

export function useRecentColors(): [string[], (hex: string) => void] {
  const [recent, setRecent] = useState(() => loadPrefs().recentColors)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const pendingRef = useRef<string | null>(null)

  // A picker closing mid-settle still records where the drag ended.
  useEffect(
    () => () => {
      clearTimeout(timerRef.current)
      if (pendingRef.current !== null) save(pendingRef.current)
    },
    [],
  )

  const remember = (hex: string) => {
    pendingRef.current = hex
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      pendingRef.current = null
      setRecent(save(hex))
    }, SETTLE_MS)
  }

  return [recent, remember]
}
