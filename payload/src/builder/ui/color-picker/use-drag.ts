// Pointer dragging on a 2D surface, reported as fractions (0–1) of its box. Shared by the field and the hue strip.
import { useState } from 'preact/hooks'
import { startPointerDrag } from '../../lib/pointer-drag'

function fractions(e: PointerEvent, box: DOMRect): { fx: number; fy: number } {
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  return { fx: clamp((e.clientX - box.left) / box.width), fy: clamp((e.clientY - box.top) / box.height) }
}

export function useDrag(onMove: (fx: number, fy: number) => void): [boolean, { onPointerDown: (e: PointerEvent) => void }] {
  const [dragging, setDragging] = useState(false)
  return [
    dragging,
    {
      onPointerDown: e => {
        if (e.button !== 0) return
        e.preventDefault() // no text selection while dragging
        const box = (e.currentTarget as HTMLElement).getBoundingClientRect()
        ;(e.currentTarget as HTMLElement).focus()
        setDragging(true)
        // The latest onMove is captured per drag; it closes over the values at press time, which is what the
        // callers want (hue stays fixed while dragging the field, and vice versa).
        const report = (ev: PointerEvent) => {
          const { fx, fy } = fractions(ev, box)
          onMove(fx, fy)
        }
        report(e)
        startPointerDrag(e, { onMove: report, onEnd: () => setDragging(false) })
      },
    },
  ]
}
