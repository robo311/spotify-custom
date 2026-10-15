// Pure: where a menu panel goes. A root panel opens at a point (the cursor) and flips up/left near the window edges;
// a submenu opens beside its row, flips to the left side when there is no room on the right, and slides up to fit.

export interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

export type Anchor = { kind: 'point'; x: number; y: number } | { kind: 'beside'; rect: Rect }

export interface Size {
  width: number
  height: number
}

/** Keeps panels off the window edges. */
export const MARGIN = 8
/** A submenu overlaps its parent a little, so the pointer path between them stays short. */
const OVERLAP = 4
/** The submenu's first row lines up with its trigger row (the panel's padding). */
const PAD = 4

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, Math.max(min, max)))

export function place(size: Size, anchor: Anchor, viewport: Size): { x: number; y: number; flippedUp: boolean } {
  const maxX = viewport.width - MARGIN - size.width
  const maxY = viewport.height - MARGIN - size.height
  if (anchor.kind === 'point') {
    const x = anchor.x > maxX ? anchor.x - size.width : anchor.x
    const flippedUp = anchor.y > maxY && anchor.y - size.height >= MARGIN
    const y = flippedUp ? anchor.y - size.height : anchor.y
    return { x: clamp(x, MARGIN, maxX), y: clamp(y, MARGIN, maxY), flippedUp }
  }
  const { rect } = anchor
  const right = rect.right - OVERLAP
  const x = right <= maxX ? right : rect.left + OVERLAP - size.width
  return { x: clamp(x, MARGIN, maxX), y: clamp(rect.top - PAD, MARGIN, maxY), flippedUp: false }
}
