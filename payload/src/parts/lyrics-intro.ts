// Marks the lyrics view's opening on <html> (LYRICS_INTRO_ATTR) for as long as its first lines cascade in, so the
// cascade plays once per opening. CSS can't tell an opening from Spotify remounting lines on every line change.
import { LYRICS_INTRO_ATTR, LYRICS_INTRO_MS } from './lyrics-motion'

const OPENING_ATTRS = ['data-cinema-npv-duringenter', 'data-cinema-library-npv-duringenter']

export function startLyricsIntro(): () => void {
  const root = document.documentElement
  let timer: ReturnType<typeof setTimeout> | null = null

  const end = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
    root.removeAttribute(LYRICS_INTRO_ATTR)
  }

  const observer = new MutationObserver(records => {
    if (!records.some(r => r.attributeName && root.hasAttribute(r.attributeName))) return
    end()
    root.setAttribute(LYRICS_INTRO_ATTR, '')
    timer = setTimeout(end, LYRICS_INTRO_MS)
  })
  observer.observe(root, { attributes: true, attributeFilter: OPENING_ATTRS })

  return () => {
    observer.disconnect()
    end()
  }
}
