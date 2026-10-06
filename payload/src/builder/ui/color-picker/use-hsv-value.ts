// The picker's working Okhsv value, kept in sync with the hex it edits. Edits made here keep their exact
// handle positions; outside changes (undo, preset switch, eyedropper) are adopted, keeping hue on greys.
import { useState } from 'preact/hooks'
import { hexToHsv, hsvToHex, type Hsv } from '../../lib/okhsv'

const FALLBACK: Hsv = { h: 260, s: 0.7, v: 0.9 }

export function useHsvValue(hex: string): [Hsv, (next: Hsv) => string] {
  const [state, setState] = useState(() => ({ hex, hsv: hexToHsv(hex) ?? FALLBACK }))

  let current = state
  if (state.hex !== hex) {
    current = { hex, hsv: hexToHsv(hex, state.hsv) ?? state.hsv }
    setState(current)
  }

  const set = (next: Hsv): string => {
    const nextHex = hsvToHex(next)
    setState({ hex: nextHex, hsv: next })
    return nextHex
  }

  return [current.hsv, set]
}
