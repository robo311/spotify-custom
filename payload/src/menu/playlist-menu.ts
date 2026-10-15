// Our "Add to playlist" menu, as levels of a menu stack: the playlists from Spotify's library ordered by the user's
// settings, folders as nested submenus (or flat), a search field when there are many. Picking one adds the songs and
// confirms with a toast.
import type { PlaylistMenuSettings } from '../types'
import type { PlaylistNode } from '../spotify'
import type { Entry, Level, PanelRow } from './model'
import { filterPlaylists, flatten, orderPlaylists, SEARCH_THRESHOLD, type OrderedPlaylists } from './playlists'
import type { Anchor, Rect } from './position'
import type { MenuStack } from './stack'
import { showToast } from './toast'

export interface PlaylistApi {
  loadPlaylists(): Promise<PlaylistNode[]>
  addToPlaylist(playlistUri: string, uris: string[]): Promise<void>
}

export interface PlaylistMenuOptions {
  uris: string[]
  settings: PlaylistMenuSettings
  api: PlaylistApi
  /** The parent row's entry id when this is a submenu. */
  from?: string
  /** A playlist was picked: the owner closes the menu (the songs are being added). */
  picked(): void
}

const LABEL = 'Add to playlist'

export function showPlaylistMenu(stack: MenuStack, depth: number, anchor: Anchor, options: PlaylistMenuOptions): void {
  const { settings, api } = options
  const byUri = new Map<string, PlaylistNode>()

  const entry = (node: PlaylistNode): Entry =>
    node.kind === 'folder'
      ? { id: node.uri, label: node.name, submenu: true, icon: settings.covers ? { kind: 'folder' } : undefined }
      : { id: node.uri, label: node.name, icon: settings.covers ? { kind: 'cover', src: node.image } : undefined }

  const items = (nodes: readonly PlaylistNode[]): PanelRow[] => nodes.map(n => ({ kind: 'item', entry: entry(n) }))

  const add = (e: Entry) => {
    const node = byUri.get(e.id)
    if (node?.kind !== 'playlist') return
    options.picked()
    api.addToPlaylist(node.uri, options.uris).then(
      () => showToast(`Added to ${node.name}`, true),
      (err: unknown) => {
        console.warn('[spotify-custom] add to playlist failed', err)
        showToast(`Couldn't add to ${node.name}`, false)
      },
    )
  }

  /** The level at depth `d` showing `nodes` (a folder's submenu). */
  const level = (nodes: readonly PlaylistNode[], at: Anchor, label: string, d: number): Level => ({
    rows: items(nodes),
    anchor: at,
    label,
    activate: add,
    open: (e, rect) => openFolder(e, rect, d),
  })

  const openFolder = (e: Entry, rect: Rect, d: number) => {
    const folder = byUri.get(e.id)
    if (folder?.kind === 'folder') stack.set(d + 1, level(folder.children, { kind: 'beside', rect }, folder.name, d + 1), e.id)
  }

  const index = (nodes: readonly PlaylistNode[]) => {
    for (const n of nodes) {
      byUri.set(n.uri, n)
      if (n.kind === 'folder') index(n.children)
    }
  }

  let topRows: PanelRow[] = []
  let ordered: OrderedPlaylists = { pinned: [], rest: [] }

  const query = (text: string) => {
    if (!text.trim()) {
      stack.update(depth, { rows: topRows, status: null })
      return
    }
    const found = filterPlaylists(ordered, text)
    stack.update(depth, { rows: items(found), status: found.length ? null : 'No playlists match' })
  }

  const top: Level = { rows: [], anchor, label: LABEL, status: 'Loading playlists…', activate: add, open: (e, rect) => openFolder(e, rect, depth), query }
  const shown = stack.set(depth, top, options.from)
  if (!shown) return

  api.loadPlaylists().then(
    nodes => {
      ordered = orderPlaylists(nodes, settings)
      const { pinned, rest } = ordered
      index(pinned)
      index(rest)
      topRows = [...items(pinned), ...(pinned.length && rest.length ? [{ kind: 'separator' } as const] : []), ...items(rest)]
      stack.update(depth, {
        rows: topRows,
        status: topRows.length ? null : 'No playlists to add to',
        search: flatten(nodes).length > SEARCH_THRESHOLD,
      })
    },
    (err: unknown) => {
      console.warn('[spotify-custom] loading playlists failed', err)
      stack.update(depth, { status: "Couldn't load your playlists" })
    },
  )
}
