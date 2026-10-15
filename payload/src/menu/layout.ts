// Pure: a menu layout + the items Spotify put in this particular menu → the rows our panel draws.
import type { MenuEntry } from '../types'

/** An item read from Spotify's live menu. `divider` is Spotify's own (before / after / on both sides of the item). */
export interface LiveItem {
  key: string
  divider?: 'before' | 'after' | 'both'
}

export type Row<T> = { kind: 'item'; item: T } | { kind: 'separator' } | { kind: 'group'; label: string }

/** Rows in Spotify's order with its own dividers. */
function stockRows<T extends LiveItem>(live: readonly T[]): Row<T>[] {
  const rows: Row<T>[] = []
  for (const item of live) {
    if (item.divider === 'before' || item.divider === 'both') rows.push({ kind: 'separator' })
    rows.push({ kind: 'item', item })
    if (item.divider === 'after' || item.divider === 'both') rows.push({ kind: 'separator' })
  }
  return rows
}

/**
 * Rows for `layout` (null = Spotify's order). Items this menu doesn't have are skipped; items the layout never
 * mentions follow the item Spotify shows before them (or go last), so nothing Spotify adds later goes missing;
 * hidden items are left out.
 */
export function arrange<T extends LiveItem>(layout: readonly MenuEntry[] | null, live: readonly T[]): Row<T>[] {
  if (layout === null) return tidy(stockRows(live))
  const byKey = new Map<string, T>()
  for (const item of live) if (!byKey.has(item.key)) byKey.set(item.key, item)
  const mentioned = new Set(layout.flatMap(e => (e.kind === 'item' ? [e.key] : [])))
  const rows: Row<T>[] = []
  for (const entry of layout) {
    if (entry.kind !== 'item') rows.push(entry)
    else {
      const item = byKey.get(entry.key)
      if (item && !entry.hidden) rows.push({ kind: 'item', item })
    }
  }
  // Leftovers follow the item Spotify shows just before them (in live order, so a run of them stays together).
  let previous: T | null = null
  for (const item of byKey.values()) {
    if (!mentioned.has(item.key)) {
      const after = previous === null ? -1 : rows.findIndex(r => r.kind === 'item' && r.item === previous)
      if (after === -1) rows.push({ kind: 'item', item })
      else rows.splice(after + 1, 0, { kind: 'item', item })
    }
    previous = item
  }
  return tidy(rows)
}

/** No empty groups, no leading/trailing/double separators, and no separator right before a group (it has its own). */
function tidy<T>(rows: Row<T>[]): Row<T>[] {
  const out: Row<T>[] = []
  let pending: Row<T> | null = null // a separator or group waiting for its first item
  for (const row of rows) {
    if (row.kind === 'item') {
      if (pending && (out.length > 0 || pending.kind === 'group')) out.push(pending)
      pending = null
      out.push(row)
    } else if (row.kind === 'group' || !pending || pending.kind === 'separator') {
      pending = row
    }
  }
  return out
}
