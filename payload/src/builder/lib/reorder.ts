// Ordering for things Spotify shows in its own order (Home shelves, Now playing panel sections):
// merges the saved order with what is on screen now.

export interface Keyed {
  key: string
}

/** Items named in `order` first (in that order, if present), then the rest in Spotify's natural order. */
export function orderByKeys<T extends Keyed>(items: readonly T[], order: readonly string[]): T[] {
  const byKey = new Map(items.map(s => [s.key, s]))
  const ordered = order.flatMap(key => {
    const item = byKey.get(key)
    return item ? [item] : []
  })
  const placed = new Set(ordered.map(s => s.key))
  return [...ordered, ...items.filter(s => !placed.has(s.key))]
}

/** Returns a copy of list with the item at `from` moved to index `to` (clamped). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list]
  if (from < 0 || from >= next.length) return next
  const [item] = next.splice(from, 1) as [T]
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item)
  return next
}

/**
 * The saved order after a move: the visible list's new order, then remembered keys for items not on screen now
 * (they may come back).
 */
export function nextOrder(previous: readonly string[], visibleAfterMove: readonly Keyed[]): string[] {
  const visible = new Set(visibleAfterMove.map(s => s.key))
  return [...visibleAfterMove.map(s => s.key), ...previous.filter(k => !visible.has(k))]
}
