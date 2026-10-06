// Panel placement behaviour: drag by the header to float it anywhere (edges are magnetic), drop it near the
// right edge or double-click the header to dock it again, resize from the left edge or (floating) the corner.
// Placement and width are remembered between sessions.
import { useState } from 'preact/hooks'
import { DRAWER_MAX, DRAWER_MIN, loadPrefs, savePrefs } from '../lib/prefs'
import { startPointerDrag } from '../lib/pointer-drag'
import {
  clampRect,
  dockedRect,
  floatingHeight,
  inDockZone,
  resizeFromCorner,
  resizeFromLeft,
  snapRect,
  viewportBounds,
  type Placement,
  type Rect,
} from '../lib/panel-geometry'
import { useDrawerInsets } from './use-drawer-insets'
import { useViewport } from './use-viewport'

/** Pointer travel before a header press counts as a drag (so clicks and double-clicks stay clicks). */
const DRAG_THRESHOLD = 4

export interface PanelGeometry {
  rect: Rect
  docked: boolean
  /** True while moving or resizing: position changes must follow the pointer without easing. */
  interacting: boolean
  /** Where the panel would dock, shown while a drag is inside the dock zone. */
  dockPreview: Rect | null
  startMove: (e: PointerEvent) => void
  startResize: (edge: 'left' | 'corner', e: PointerEvent) => void
  resizeBy: (delta: number) => void
  dock: () => void
}

const floating = (r: Rect): Placement => ({ mode: 'floating', x: r.x, y: r.y, height: r.height })

export function usePanelGeometry(): PanelGeometry {
  const insets = useDrawerInsets()
  const viewport = useViewport()
  const [width, setWidth] = useState(() => loadPrefs().width)
  const [placement, setPlacement] = useState<Placement>(() => loadPrefs().placement)
  const [interacting, setInteracting] = useState(false)
  const [dockPreview, setDockPreview] = useState<Rect | null>(null)

  const bounds = viewportBounds(viewport.width, viewport.height)
  const docked = placement.mode === 'docked'
  const dockTarget = (w: number) => dockedRect(w, viewport.width, insets, viewport.height)
  const rect = docked ? dockTarget(width) : clampRect({ x: placement.x, y: placement.y, width, height: placement.height }, bounds)

  const commit = (next: Placement, w: number) => {
    setPlacement(next)
    savePrefs({ placement: next, width: w })
  }

  const startMove = (down: PointerEvent) => {
    if (down.button !== 0) return
    const start = docked ? { ...rect, height: floatingHeight(rect.height, viewport.height) } : rect
    let last = start
    let dockable = false
    let moved = false
    startPointerDrag(down, {
      onMove: e => {
        if (!moved && Math.hypot(e.clientX - down.clientX, e.clientY - down.clientY) < DRAG_THRESHOLD) return
        moved = true
        setInteracting(true)
        const raw = { ...start, x: start.x + e.clientX - down.clientX, y: start.y + e.clientY - down.clientY }
        last = snapRect(clampRect(raw, bounds), bounds)
        dockable = inDockZone(raw, bounds)
        setPlacement(floating(last))
        setDockPreview(dockable ? dockTarget(width) : null)
      },
      onEnd: () => {
        setInteracting(false)
        setDockPreview(null)
        if (moved) commit(dockable ? { mode: 'docked' } : floating(last), width)
      },
    })
  }

  const startResize = (edge: 'left' | 'corner', down: PointerEvent) => {
    if (down.button !== 0) return
    down.preventDefault()
    const start = rect
    let last = start
    setInteracting(true)
    startPointerDrag(down, {
      onMove: e => {
        last =
          edge === 'left'
            ? resizeFromLeft(start, e.clientX, DRAWER_MIN, DRAWER_MAX)
            : resizeFromCorner(start, { x: e.clientX, y: e.clientY }, DRAWER_MIN, DRAWER_MAX, bounds)
        setWidth(last.width)
        if (!docked) setPlacement(floating(last))
      },
      onEnd: () => {
        setInteracting(false)
        commit(docked ? placement : floating(last), last.width)
      },
    })
  }

  const resizeBy = (delta: number) => {
    const next = resizeFromLeft(rect, rect.x - delta, DRAWER_MIN, DRAWER_MAX)
    setWidth(next.width)
    commit(docked ? placement : floating(next), next.width)
  }

  return { rect, docked, interacting, dockPreview, startMove, startResize, resizeBy, dock: () => commit({ mode: 'docked' }, width) }
}
