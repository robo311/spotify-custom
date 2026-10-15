// Pure edits behind the Menu tab: the right-click menu layout (a built-in preset forks into Custom on the first edit),
// shortcut buttons per place, and the order of the "Add to playlist" submenu. Callers run them inside
// store.editSettings on the draft.
import { MENU_ITEMS, presetLayout, STOCK, type MenuItemDef } from '../../../menu'
import type { PlaylistNode } from '../../../spotify'
import { MENU_GROUP_LABEL_MAX, SHORTCUT_ACTIONS, SHORTCUTS_MAX } from '../../../theme/model'
import type { MenuEntry, MenuSettings, PlaylistMenuSettings, ShortcutAction, ShortcutSurface } from '../../../types'
import { moveItem, nextOrder } from '../../lib/reorder'

// ---------- layout ----------

/** The layout the menu uses now. Stock is Spotify's own order, shown here as our copy of it (with its dividers). */
export function shownLayout(menu: MenuSettings): readonly MenuEntry[] {
  return presetLayout(menu.preset, menu.custom) ?? STOCK
}

/** Applies an edit to the layout on screen; a built-in preset is copied into Custom first and Custom chosen. */
export function editLayout(menu: MenuSettings, mutate: (layout: MenuEntry[]) => void): void {
  if (menu.preset !== 'custom' || menu.custom.length === 0) {
    menu.custom = structuredClone(shownLayout(menu)) as MenuEntry[]
    menu.preset = 'custom'
  }
  mutate(menu.custom)
}

/** Back to the Spotify Custom layout; the Custom layout is discarded. */
export function resetLayout(menu: MenuSettings): void {
  menu.preset = 'ours'
  menu.custom = []
}

export const addSeparator = (layout: MenuEntry[]): void => void layout.push({ kind: 'separator' })

export const addGroup = (layout: MenuEntry[], label: string): void => void layout.push({ kind: 'group', label: label.slice(0, MENU_GROUP_LABEL_MAX) })

export const addItem = (layout: MenuEntry[], key: string): void => void layout.push({ kind: 'item', key })

/** Removes a separator or group. Items stay (hide them instead), so nothing Spotify offers can go missing by accident. */
export function removeEntry(layout: MenuEntry[], index: number): void {
  if (layout[index].kind !== 'item') layout.splice(index, 1)
}

export function setHidden(layout: MenuEntry[], index: number, hidden: boolean): void {
  const entry = layout[index]
  if (entry.kind === 'item') layout[index] = hidden ? { kind: 'item', key: entry.key, hidden: true } : { kind: 'item', key: entry.key }
}

export function setGroupLabel(layout: MenuEntry[], index: number, label: string): void {
  if (layout[index].kind === 'group') layout[index] = { kind: 'group', label: label.slice(0, MENU_GROUP_LABEL_MAX) }
}

export function moveEntry(layout: MenuEntry[], from: number, to: number): void {
  layout.splice(0, layout.length, ...moveItem(layout, from, to))
}

/** Catalog items the layout never mentions (the menu shows them at the end anyway). */
export function missingItems(layout: readonly MenuEntry[]): MenuItemDef[] {
  const mentioned = new Set(layout.flatMap(e => (e.kind === 'item' ? [e.key] : [])))
  return MENU_ITEMS.filter(i => !mentioned.has(i.key))
}

// ---------- shortcuts ----------

/** What a place can offer: removing from the queue only makes sense in the queue. */
export function shortcutChoices(surface: ShortcutSurface): ShortcutAction[] {
  return SHORTCUT_ACTIONS.filter(a => a !== 'remove-from-queue' || surface === 'queue')
}

/** Adds at the end (up to SHORTCUTS_MAX) or removes. */
export function toggleShortcut(list: ShortcutAction[], action: ShortcutAction): void {
  const i = list.indexOf(action)
  if (i >= 0) list.splice(i, 1)
  else if (list.length < SHORTCUTS_MAX) list.push(action)
}

// ---------- Add to playlist ----------

export interface FlatPlaylist {
  uri: string
  name: string
  image: string | null
  folder: string | null // the folder it sits in (innermost), null at the top level
}

/** The library's playlists in library order, folders opened in place. */
export function flattenPlaylists(nodes: readonly PlaylistNode[], folder: string | null = null): FlatPlaylist[] {
  return nodes.flatMap(n =>
    n.kind === 'folder' ? flattenPlaylists(n.children, n.name) : [{ uri: n.uri, name: n.name, image: n.image, folder }],
  )
}

/** The playlists named in `uris`, in that order (URIs not loaded now are skipped). */
function named(list: readonly FlatPlaylist[], uris: readonly string[]): FlatPlaylist[] {
  const byUri = new Map(list.map(p => [p.uri, p]))
  return uris.flatMap(uri => byUri.get(uri) ?? [])
}

/** Pinned first (in pin order), then the rest by the chosen sort. */
export function orderPlaylists(list: readonly FlatPlaylist[], settings: PlaylistMenuSettings): FlatPlaylist[] {
  const pinned = new Set(settings.pinned)
  const rest = list.filter(p => !pinned.has(p.uri))
  const placed = new Set(settings.order)
  const sorted =
    settings.sort === 'name'
      ? [...rest].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      : settings.sort === 'custom'
        ? [...named(rest, settings.order), ...rest.filter(p => !placed.has(p.uri))]
        : rest
  return [...named(list, settings.pinned), ...sorted]
}

export function togglePin(settings: PlaylistMenuSettings, uri: string): void {
  settings.pinned = settings.pinned.includes(uri) ? settings.pinned.filter(u => u !== uri) : [...settings.pinned, uri]
}

/** After a drag in the custom sort: pinned keep their new relative order, and so does the rest (→ `order`). */
export function reorderPlaylists(settings: PlaylistMenuSettings, visibleAfterMove: readonly FlatPlaylist[]): void {
  const pinned = new Set(settings.pinned)
  const keyed = visibleAfterMove.map(p => ({ key: p.uri }))
  settings.pinned = nextOrder(settings.pinned, keyed.filter(p => pinned.has(p.key)))
  settings.order = nextOrder(settings.order, keyed.filter(p => !pinned.has(p.key)))
}
