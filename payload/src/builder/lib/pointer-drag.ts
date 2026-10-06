// Follows one pointer from press to release with window listeners. Unlike element pointer capture, this keeps
// working when Preact re-renders the pressed element mid-drag (every drag here edits state as it moves).

export interface PointerDragHandlers {
  onMove: (e: PointerEvent) => void
  onEnd?: (e: PointerEvent) => void
}

export function startPointerDrag(down: PointerEvent, { onMove, onEnd }: PointerDragHandlers): void {
  const id = down.pointerId
  const move = (e: PointerEvent) => {
    if (e.pointerId === id) onMove(e)
  }
  const end = (e: PointerEvent) => {
    if (e.pointerId !== id) return
    window.removeEventListener('pointermove', move, true)
    window.removeEventListener('pointerup', end, true)
    window.removeEventListener('pointercancel', end, true)
    onEnd?.(e)
  }
  window.addEventListener('pointermove', move, true)
  window.addEventListener('pointerup', end, true)
  window.addEventListener('pointercancel', end, true)
}
