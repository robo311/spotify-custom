// Pure: the user's playlists (Spotify's library tree) → what our "Add to playlist" menu lists, following the
// playlist menu settings (sort, pinned, folders), plus the search filter.
import type { PlaylistMenuSettings } from '../types'
import type { PlaylistNode } from '../spotify'

type Playlist = Extract<PlaylistNode, { kind: 'playlist' }>

export interface OrderedPlaylists {
  /** Pinned playlists, in the pinned order (taken out of their folders). */
  pinned: Playlist[]
  /** Everything else: a tree when folders are on, else one flat list. */
  rest: PlaylistNode[]
}

/** Above this many playlists the menu gets a search field. */
export const SEARCH_THRESHOLD = 8

export function flatten(nodes: readonly PlaylistNode[]): Playlist[] {
  return nodes.flatMap(n => (n.kind === 'folder' ? flatten(n.children) : [n]))
}

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })

function sortLevel(nodes: PlaylistNode[], settings: PlaylistMenuSettings): PlaylistNode[] {
  if (settings.sort === 'name') return [...nodes].sort((a, b) => collator.compare(a.name, b.name))
  if (settings.sort === 'custom') {
    const rank = new Map(settings.order.map((uri, i) => [uri, i]))
    // Listed first in their custom order; the rest keep library order (Array#sort is stable).
    return [...nodes].sort((a, b) => (rank.get(a.uri) ?? Infinity) - (rank.get(b.uri) ?? Infinity))
  }
  return nodes
}

function arrangeTree(nodes: readonly PlaylistNode[], skip: Set<string>, settings: PlaylistMenuSettings): PlaylistNode[] {
  const out: PlaylistNode[] = []
  for (const node of nodes) {
    if (node.kind === 'playlist') {
      if (!skip.has(node.uri)) out.push(node)
    } else {
      const children = arrangeTree(node.children, skip, settings)
      if (children.length > 0) out.push({ ...node, children })
    }
  }
  return sortLevel(out, settings)
}

export function orderPlaylists(nodes: readonly PlaylistNode[], settings: PlaylistMenuSettings): OrderedPlaylists {
  const all = flatten(nodes)
  const byUri = new Map(all.map(p => [p.uri, p]))
  const pinned: Playlist[] = []
  for (const uri of new Set(settings.pinned)) {
    const p = byUri.get(uri)
    if (p) pinned.push(p)
  }
  const skip = new Set(pinned.map(p => p.uri))
  const rest = settings.folders ? arrangeTree(nodes, skip, settings) : sortLevel(all.filter(p => !skip.has(p.uri)), settings)
  return { pinned, rest }
}

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase()

/** Playlists whose name contains the query (ignoring case and accents), pinned first, folders flattened. */
export function filterPlaylists(ordered: OrderedPlaylists, query: string): Playlist[] {
  const q = fold(query.trim())
  return [...ordered.pinned, ...flatten(ordered.rest)].filter(p => fold(p.name).includes(q))
}
