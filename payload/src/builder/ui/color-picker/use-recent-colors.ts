// Recently used colours, shared by every picker and remembered across sessions.
// Remembering is debounced so dragging through hundreds of colours records only where the drag ended.
import { useEffect, useRef, useState } from 'preact/hooks'
import { loadPrefs, pushRecent, savePrefs } from '../../lib/prefs'

const SETTLE_MS = 700

export function useRecentColors(): [string[], (hex: string) => void] {
  const [recent, setRecent] = useState(() => loadPrefs().recentColors)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const remember = (hex: string) => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const next = pushRecent(loadPrefs().recentColors, hex)
      savePrefs({ recentColors: next })
      setRecent(next)
    }, SETTLE_MS)
  }

  return [recent, remember]
}
