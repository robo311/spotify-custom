// Spotify's own services (queue, Liked Songs, playlists, clipboard), for actions we run without its menu. They live
// in a registry on the `platform` prop of a provider near the top of the React tree, keyed by symbols whose
// descriptions are the service names (verified on Spotify 1.3.4). Every call is best-effort: callers handle rejections.
import { findInFiber, isRecord, rootFiber } from './fiber'

interface Registry {
  _map: Map<symbol, unknown>
  resolve(key: symbol): unknown
}

const isRegistry = (v: unknown): v is Registry =>
  isRecord(v) && v._map instanceof Map && typeof v.resolve === 'function'

let registry: Registry | null = null
let warned = false

function findRegistry(): Registry | null {
  registry ??= findInFiber(rootFiber(), props => {
    const platform = props.platform
    if (!isRecord(platform) || typeof platform.getRegistry !== 'function') return null
    const reg: unknown = (platform.getRegistry as () => unknown)()
    return isRegistry(reg) ? reg : null
  })
  if (!registry && !warned) {
    warned = true
    console.warn("[spotify-custom] Spotify's services not found; menu shortcuts and the playlist menu are unavailable")
  }
  return registry
}

type Service = Record<string, (...args: unknown[]) => unknown>

function service(name: string, methods: readonly string[]): Service {
  const reg = findRegistry()
  if (!reg) throw new Error('Spotify services unavailable')
  for (const key of reg._map.keys()) {
    if (key.description !== name) continue
    const s = reg.resolve(key)
    if (isRecord(s) && methods.every(m => typeof s[m] === 'function')) {
      // Bound so the methods keep their `this`.
      return Object.fromEntries(methods.map(m => [m, (s[m] as (...a: unknown[]) => unknown).bind(s)]))
    }
  }
  throw new Error(`Spotify ${name} unavailable`)
}

// ---- playlists (pure mapping of RootlistAPI.getContents) ----

export type PlaylistNode =
  | { kind: 'playlist'; uri: string; name: string; image: string | null }
  | { kind: 'folder'; uri: string; name: string; children: PlaylistNode[] }

const text = (v: unknown): string => (typeof v === 'string' ? v : '')

/** spotify:image:<id> → CDN URL; anything else but https is dropped (it ends up in src attributes). */
function imageUrl(images: unknown): string | null {
  if (!Array.isArray(images)) return null
  // Smallest first is what a menu row needs; Spotify lists them in no fixed order.
  const urls = images
    .filter(isRecord)
    .map(i => ({ url: text(i.url), width: typeof i.width === 'number' ? i.width : Infinity }))
    .sort((a, b) => a.width - b.width)
  for (const { url } of urls) {
    const id = /^spotify:image:([A-Za-z0-9]+)$/.exec(url)?.[1]
    if (id) return `https://i.scdn.co/image/${id}`
    if (url.startsWith('https://')) return url
  }
  return null
}

/**
 * Pure: the rootlist tree → the playlists you can add songs to (your own and collaborative ones), folders kept in
 * place; folders left empty by that filter are dropped.
 */
export function mapRootlist(node: unknown): PlaylistNode[] {
  if (!isRecord(node) || !Array.isArray(node.items)) return []
  const out: PlaylistNode[] = []
  for (const item of node.items) {
    if (!isRecord(item)) continue
    if (item.type === 'folder') {
      const children = mapRootlist(item)
      if (children.length > 0) out.push({ kind: 'folder', uri: text(item.uri), name: text(item.name), children })
    } else if (item.type === 'playlist' && (item.isOwnedBySelf === true || item.canAdd === true) && text(item.uri)) {
      out.push({ kind: 'playlist', uri: text(item.uri), name: text(item.name), image: imageUrl(item.images) })
    }
  }
  return out
}

export async function loadPlaylists(): Promise<PlaylistNode[]> {
  return mapRootlist(await service('RootlistAPI', ['getContents']).getContents())
}

/** Adds songs at the end of a playlist. */
export async function addToPlaylist(playlistUri: string, uris: string[]): Promise<void> {
  await service('PlaylistAPI', ['add']).add(playlistUri, uris, { after: 'end' })
}

// ---- queue, Liked Songs, links ----

export async function addToQueue(uris: string[]): Promise<void> {
  await service('PlayerAPI', ['addToQueue']).addToQueue(uris.map(uri => ({ uri })))
}

/** Queue entries are told apart by uid (the same song can be queued twice). */
export async function removeFromQueue(items: { uri: string; uid: string }[]): Promise<void> {
  await service('PlayerAPI', ['removeFromQueue']).removeFromQueue(items)
}

export async function isLiked(uris: string[]): Promise<boolean[]> {
  const result = await service('LibraryAPI', ['contains']).contains(...uris)
  return Array.isArray(result) ? uris.map((_, i) => result[i] === true) : uris.map(() => false)
}

export async function setLiked(uris: string[], liked: boolean): Promise<void> {
  const lib = service('LibraryAPI', ['add', 'remove'])
  await (liked ? lib.add({ uris }) : lib.remove({ uris }))
}

/** spotify:track:ID → https://open.spotify.com/track/ID, the link Spotify's "Copy song link" gives. */
export function shareUrl(uri: string): string | null {
  const [scheme, type, id] = uri.split(':')
  return scheme === 'spotify' && type && id ? `https://open.spotify.com/${type}/${id}` : null
}

export async function copyLink(uri: string): Promise<void> {
  const url = shareUrl(uri)
  if (!url) throw new Error(`no link for ${uri}`)
  await service('ClipboardAPI', ['copy']).copy(url)
}
