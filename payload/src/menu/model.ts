// What a menu panel shows, whoever fills it (Spotify's items, our playlists, the studio's preview).
import type { Anchor, Rect } from './position'

export type Icon =
  | { kind: 'svg'; node: SVGElement } // a clone of Spotify's own icon
  | { kind: 'cover'; src: string | null } // a playlist cover (null = no image)
  | { kind: 'folder' }

export interface Entry {
  /** Unique within its panel. */
  id: string
  label: string
  icon?: Icon
  disabled?: boolean
  checked?: boolean
  submenu?: boolean
}

export type PanelRow = { kind: 'item'; entry: Entry } | { kind: 'separator' } | { kind: 'group'; label: string }

/** One open panel in a menu stack (index 0 = the menu, then its submenus). */
export interface Level {
  rows: PanelRow[]
  anchor: Anchor
  /** For screen readers (aria-label of the menu). */
  label: string
  /** Shows a search field; typed letters filter instead of jumping. */
  search?: boolean
  /** Shown instead of the rows (loading, nothing found, an error). */
  status?: string | null
  activate(entry: Entry): void
  /** Opens the entry's submenu as the next level (the owner calls stack.set). */
  open?(entry: Entry, rect: Rect): void
  query?(text: string): void
  /** The level was closed (its parent moved elsewhere, or the whole menu closed). */
  closed?(): void
}
