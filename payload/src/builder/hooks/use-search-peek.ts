// While you work in a studio section that changes the search suggestions, they stay open on screen (lib/search-peek).
// Pointing at the section or focusing a control in it opens them; they stay while you look at them in Spotify, and close
// when you move on to another section, the section goes away (another tab), the studio closes (it stays mounted to
// animate out) or `active` turns off.
import { useEffect } from 'preact/hooks'
import { useEnv, useUi } from '../context'
import { peekSearch } from '../lib/search-peek'

export function useSearchPeek(section: string, active: boolean): void {
  const { root } = useEnv()
  const studioOpen = useUi(s => s.open)
  const on = active && studioOpen
  useEffect(() => {
    if (!on) return
    const peek = peekSearch(root)
    let inside = false
    const sectionOf = (e: Event) => e.composedPath().find((n): n is HTMLElement => n instanceof HTMLElement && n.dataset.section !== undefined)
    // Pointer moves open on the way in only; a focused control asks every time, in case Spotify closed them meanwhile.
    const onPointer = (e: Event) => {
      const at = sectionOf(e)
      if (!at) return
      if (at.dataset.section !== section) {
        inside = false
        peek.close()
      } else if (!inside) {
        inside = true
        peek.open()
      }
    }
    const onFocus = (e: Event) => {
      const at = sectionOf(e)
      if (at?.dataset.section === section) peek.open()
      else if (at) peek.close()
    }
    root.addEventListener('pointerover', onPointer)
    root.addEventListener('focusin', onFocus)
    // Turned on from inside the section (a place picked in it): no pointer or focus event is coming, so open now.
    const el = root.querySelector(`[data-section="${section}"]`)
    if (el && (el.matches(':hover') || el.contains(root.activeElement))) {
      inside = true
      peek.open()
    }
    return () => {
      root.removeEventListener('pointerover', onPointer)
      root.removeEventListener('focusin', onFocus)
      peek.close()
    }
  }, [root, section, on])
}
