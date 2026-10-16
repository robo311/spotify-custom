// The song menu items we know by key, and the built-in layouts. A key is the `menuAction` prop Spotify puts on each
// of its menu items (language-independent). Labels here are only for the studio: the menu itself shows Spotify's own
// (localised) label and icon. Items we don't list still show up, wherever the layout puts leftovers.
import type { MenuEntry, MenuPreset } from '../types'

export interface MenuItemDef {
  key: string
  /** Studio name (English, like the rest of the studio). */
  label: string
  /** Opens a submenu (ours for add-to-playlist, Spotify's mirrored for the others). */
  submenu?: true
  /** Only in some menus (e.g. your own playlists, the queue): shown greyed in the studio when not seen yet. */
  contextual?: true
}

export const MENU_ITEMS: readonly MenuItemDef[] = [
  { key: 'add-to-playlist', label: 'Add to playlist', submenu: true },
  // Spotify calls it 'delete' (your own playlists only).
  { key: 'delete', label: 'Remove from this playlist', contextual: true },
  { key: 'add-to-liked-songs', label: 'Add to Liked Songs' },
  { key: 'add-to-queue', label: 'Add to queue' },
  { key: 'go-to-album', label: 'Go to album' },
  { key: 'go-to-artist', label: 'Go to artist' },
  { key: 'go-to-radio', label: 'Go to song radio' },
  { key: 'show-credits', label: 'Show credits' },
  { key: 'sleep-timer', label: 'Sleep timer', submenu: true },
  { key: 'start-jam', label: 'Start a Jam' },
  { key: 'share', label: 'Share', submenu: true },
  { key: 'remove-from-queue', label: 'Remove from queue', contextual: true },
  { key: 'exclude-from-taste-profile', label: 'Exclude from your taste profile' },
  // Spotify's editorial playlists only.
  { key: 'hide-in-playlist', label: 'Hide in this playlist', contextual: true },
  // Albums (Spotify gives it no menuAction; capture.ts names it).
  { key: 'hide-in-context', label: 'Hide on this album', contextual: true },
]

const item = (key: string): MenuEntry => ({ kind: 'item', key })
const SEPARATOR: MenuEntry = { kind: 'separator' }

/**
 * Spotify's own order (song menu in a list, 1.3.4), as a layout: the starting point when someone edits the Stock
 * preset. Contextual items sit where Spotify shows them.
 */
export const STOCK: readonly MenuEntry[] = [
  item('add-to-playlist'),
  item('delete'),
  item('add-to-liked-songs'),
  item('add-to-queue'),
  item('remove-from-queue'),
  item('hide-in-playlist'),
  item('hide-in-context'),
  item('exclude-from-taste-profile'),
  item('start-jam'),
  item('sleep-timer'),
  SEPARATOR,
  item('go-to-radio'),
  item('go-to-artist'),
  item('go-to-album'),
  item('show-credits'),
  SEPARATOR,
  item('share'),
]

/** The Spotify Custom layout: collect first, then go somewhere, then play/share, then remove. */
export const OURS: readonly MenuEntry[] = [
  item('add-to-playlist'),
  item('delete'),
  item('add-to-liked-songs'),
  item('add-to-queue'),
  SEPARATOR,
  item('go-to-album'),
  item('go-to-artist'),
  item('go-to-radio'),
  item('show-credits'),
  SEPARATOR,
  item('sleep-timer'),
  item('start-jam'),
  item('share'),
  SEPARATOR,
  item('remove-from-queue'),
  item('exclude-from-taste-profile'),
  item('hide-in-playlist'),
  item('hide-in-context'),
]

/** The layout for a preset; null = Spotify's own order. An empty custom layout means "not edited yet" → ours. */
export function presetLayout(preset: MenuPreset, custom: readonly MenuEntry[]): readonly MenuEntry[] | null {
  if (preset === 'stock') return null
  if (preset === 'custom' && custom.length > 0) return custom
  return OURS
}
