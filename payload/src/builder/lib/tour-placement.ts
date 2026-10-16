// Where the guided tour's card goes relative to the control it explains: beside it first (most targets live in the
// tall drawer, so above/below would cover the drawer itself), then below or above (wide targets), kept on screen.
import type { Box } from './pick'

const GAP = 16 // between the card and its target
const EDGE = 12 // minimum distance from the window edge
const BOTTOM = 40 // untargeted cards float this far above the bottom edge

interface Size {
  width: number
  height: number
}

export function placeTourCard(target: Box | null, card: Size, viewport: Size): { x: number; y: number } {
  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max))
  const clampX = (x: number) => clamp(x, EDGE, viewport.width - card.width - EDGE)
  const clampY = (y: number) => clamp(y, EDGE, viewport.height - card.height - EDGE)
  if (!target) return { x: clampX((viewport.width - card.width) / 2), y: clampY(viewport.height - card.height - BOTTOM) }

  const left = target.x - GAP - card.width
  if (left >= EDGE) return { x: left, y: clampY(target.y) }
  const right = target.x + target.width + GAP
  if (right + card.width <= viewport.width - EDGE) return { x: right, y: clampY(target.y) }
  const below = target.y + target.height + GAP
  if (below + card.height <= viewport.height - EDGE) return { x: clampX(target.x), y: below }
  return { x: clampX(target.x), y: clampY(target.y - GAP - card.height) }
}

/** The part of `box` inside every one of `clips` (the scroll areas around it); null when none of it shows. */
export function clipBox(box: Box, clips: readonly Box[]): Box | null {
  let left = box.x
  let top = box.y
  let right = box.x + box.width
  let bottom = box.y + box.height
  for (const c of clips) {
    left = Math.max(left, c.x)
    top = Math.max(top, c.y)
    right = Math.min(right, c.x + c.width)
    bottom = Math.min(bottom, c.y + c.height)
  }
  return right > left && bottom > top ? { x: left, y: top, width: right - left, height: bottom - top } : null
}
