// Where the drawer may sit: below Spotify's top bar and above its player bar, so both stay visible and usable
// (including our own entry button, which then doubles as the drawer's toggle).
import { useEffect, useState } from 'preact/hooks'
import { NAV_BAR, NOW_PLAYING_BAR } from '../selectors'

const GAP = 8
const FALLBACK = { top: 64 + GAP, bottom: 88 + GAP }

export interface DrawerInsets {
  top: number
  bottom: number
}

function measure(): DrawerInsets {
  const nav = document.querySelector(NAV_BAR)?.getBoundingClientRect()
  const player = document.querySelector(NOW_PLAYING_BAR)?.getBoundingClientRect()
  return {
    top: nav && nav.bottom > 0 ? nav.bottom + GAP : FALLBACK.top,
    bottom: player && player.top > 0 ? Math.max(GAP, window.innerHeight - player.top + GAP) : FALLBACK.bottom,
  }
}

export function useDrawerInsets(): DrawerInsets {
  const [insets, setInsets] = useState(measure)

  useEffect(() => {
    const update = () => {
      const next = measure()
      setInsets(prev => (prev.top === next.top && prev.bottom === next.bottom ? prev : next))
    }
    const observer = new ResizeObserver(update)
    for (const selector of [NAV_BAR, NOW_PLAYING_BAR]) {
      const el = document.querySelector(selector)
      if (el) observer.observe(el)
    }
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  return insets
}
