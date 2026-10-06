// Tracks which curated part (or library item: folder, Liked Songs) is under the pointer while pick mode is on (one hit test per animation frame),
// and swallows Spotify's own clicks for the whole of pick mode, so picking never triggers playback or navigation.
// While `frozen` (an editor popover is open) hit-testing pauses; a click on another part switches the editor to it.
import { useEffect, useState } from 'preact/hooks'
import { findPartAt, partElements } from '../../parts'
import { isOwnElement } from '../lib/shadow-host'
import { libraryItemAt } from '../../library'
import { libraryEntryAt, resolvePick, type Box, type PickResolvers, type PickTarget } from '../lib/pick'

export interface PickHover {
  target: PickTarget
  box: Box
}

const resolvers: PickResolvers = {
  isOwn: isOwnElement,
  findLibraryItemAt: el => libraryEntryAt(el, libraryItemAt),
  findPartAt,
  partElements,
}

function toBox(el: Element): Box {
  const r = el.getBoundingClientRect()
  return { x: r.left, y: r.top, width: r.width, height: r.height }
}

const sameBox = (a: Box, b: Box) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height

/** Keeps the previous hover object while nothing changed, so moving within one part doesn't re-render pick mode. */
function nextHover(prev: PickHover | null, target: PickTarget | null): PickHover | null {
  if (!target) return null
  const box = toBox(target.element)
  if (prev?.target.element === target.element && sameBox(prev.box, box)) return prev
  return { target, box }
}

/** Pointer events that belong to our own UI (drawer, popover, entry button) pass through untouched. */
function isOwnEvent(e: Event): boolean {
  return e.composedPath().some(node => node instanceof Element && isOwnElement(node))
}

export function usePickTarget(frozen: boolean, onPick: (hover: PickHover) => void): { hover: PickHover | null; pointer: { x: number; y: number } } {
  const [hover, setHover] = useState<PickHover | null>(null)
  const [pointer, setPointer] = useState({ x: -100, y: -100 })

  useEffect(() => {
    let frame = 0
    let last = { x: 0, y: 0 }

    const hitTest = () => {
      frame = 0
      const target = resolvePick(document.elementsFromPoint(last.x, last.y), resolvers)
      setHover(prev => nextHover(prev, target))
      setPointer(last)
    }
    const onMove = (e: PointerEvent) => {
      if (frozen) return
      last = { x: e.clientX, y: e.clientY }
      if (!frame) frame = requestAnimationFrame(hitTest)
    }
    const swallow = (e: Event) => {
      if (isOwnEvent(e)) return
      e.preventDefault()
      e.stopPropagation()
    }
    const onClick = (e: MouseEvent) => {
      if (isOwnEvent(e)) return
      swallow(e)
      const target = resolvePick(document.elementsFromPoint(e.clientX, e.clientY), resolvers)
      if (target) onPick({ target, box: toBox(target.element) })
    }

    const blocked = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'dblclick', 'contextmenu'] as const
    window.addEventListener('pointermove', onMove, { capture: true, passive: true })
    window.addEventListener('click', onClick, true)
    for (const type of blocked) window.addEventListener(type, swallow, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove, true)
      window.removeEventListener('click', onClick, true)
      for (const type of blocked) window.removeEventListener(type, swallow, true)
    }
  }, [frozen, onPick])

  return { hover, pointer }
}
