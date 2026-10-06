// Where the studio panel sits: docked to the right edge, or floating anywhere in the window. Pure geometry so
// dragging, snapping, docking and window resizes behave predictably and are tested.

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** The area the panel must stay inside (viewport minus a margin). */
export interface Bounds {
  left: number
  top: number
  right: number
  bottom: number
}

export type Placement = { mode: 'docked' } | { mode: 'floating'; x: number; y: number; height: number }

export const MARGIN = 8
export const SNAP_DISTANCE = 16 // magnetic pull towards window edges
export const DOCK_ZONE = 40 // dropping this close to the right edge docks the panel
export const MIN_HEIGHT = 320

/** A panel undocked from full height becomes this share of the window, so it floats free and shows Spotify behind it. */
export const FLOATING_HEIGHT_RATIO = 0.72

export function floatingHeight(currentHeight: number, viewportHeight: number): number {
  return Math.max(MIN_HEIGHT, Math.min(currentHeight, Math.round(viewportHeight * FLOATING_HEIGHT_RATIO)))
}

export function viewportBounds(width: number, height: number): Bounds {
  return { left: MARGIN, top: MARGIN, right: width - MARGIN, bottom: height - MARGIN }
}

/** Keeps a rect fully inside the bounds, shrinking its height if the window is too short. */
export function clampRect(r: Rect, b: Bounds): Rect {
  const height = Math.max(Math.min(r.height, b.bottom - b.top), Math.min(MIN_HEIGHT, b.bottom - b.top))
  const width = Math.min(r.width, b.right - b.left)
  return {
    width,
    height,
    x: Math.min(Math.max(r.x, b.left), b.right - width),
    y: Math.min(Math.max(r.y, b.top), b.bottom - height),
  }
}

/** Pulls a rect's edges onto nearby window edges, so it settles neatly instead of floating 3px off. */
export function snapRect(r: Rect, b: Bounds, distance = SNAP_DISTANCE): Rect {
  const snap = (pos: number, size: number, min: number, max: number) => {
    if (Math.abs(pos - min) <= distance) return min
    if (Math.abs(pos + size - max) <= distance) return max - size
    return pos
  }
  return { ...r, x: snap(r.x, r.width, b.left, b.right), y: snap(r.y, r.height, b.top, b.bottom) }
}

export function inDockZone(r: Rect, b: Bounds, zone = DOCK_ZONE): boolean {
  return b.right - (r.x + r.width) <= zone
}

/** The docked rect: right edge, between the top bar and the player bar. */
export function dockedRect(width: number, viewportWidth: number, insets: { top: number; bottom: number }, viewportHeight: number): Rect {
  return { x: viewportWidth - MARGIN - width, y: insets.top, width, height: Math.max(0, viewportHeight - insets.top - insets.bottom) }
}

/** Resizing from the left edge keeps the right edge where it is. */
export function resizeFromLeft(r: Rect, pointerX: number, minWidth: number, maxWidth: number): Rect {
  const right = r.x + r.width
  const width = Math.min(maxWidth, Math.max(minWidth, right - pointerX))
  return { ...r, x: right - width, width }
}

/** Resizing from the bottom-right corner keeps the top-left corner where it is. */
export function resizeFromCorner(r: Rect, pointer: { x: number; y: number }, minWidth: number, maxWidth: number, b: Bounds): Rect {
  return {
    ...r,
    width: Math.min(maxWidth, Math.max(minWidth, pointer.x - r.x), b.right - r.x),
    height: Math.min(Math.max(MIN_HEIGHT, pointer.y - r.y), b.bottom - r.y),
  }
}

export function isPlacement(value: unknown): value is Placement {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (v.mode === 'docked') return true
  return v.mode === 'floating' && [v.x, v.y, v.height].every(n => typeof n === 'number' && Number.isFinite(n))
}
