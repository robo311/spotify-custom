// Which song a row shows, with its album, first artist and queue uid. The DOM doesn't say (titles are localised), but
// Spotify's row components carry the song as props a few levels up the React tree, in a few shapes (verified on
// Spotify 1.3.4): `{ uri }` on the row; `{ item: { uri, uid, album, artists } }` (Liked Songs, playlists) or
// `{ uri, albumUri, artists }` (album pages) on the row's context-menu element; `{ uri, uid }` further up.
// Links in the row fill in what the props lack (artist pages carry only uri and uid).
import { ALBUM_LINK, ARTIST_LINK, PANEL_ROW_TITLE } from './selectors'

export interface Song {
  uri: string
  /** Tells queue entries apart (the same song can be queued twice). */
  uid: string | null
  albumUri: string | null
  artistUri: string | null
}

/** The album page's row keeps its full track props 16 levels above the row element. */
const MAX_DEPTH = 18

type Props = Record<string, unknown>

const record = (v: unknown): Props | null => (typeof v === 'object' && v !== null ? (v as Props) : null)
const uriOf = (v: unknown, type: string): string | null => (typeof v === 'string' && v.startsWith(`spotify:${type}:`) ? v : null)

function firstArtist(artists: unknown): string | null {
  const list: unknown = Array.isArray(artists) ? artists : record(artists)?.items
  if (!Array.isArray(list)) return null
  for (const artist of list) {
    const uri = uriOf(record(artist)?.uri, 'artist')
    if (uri) return uri
  }
  return null
}

/** The places in one component's props where Spotify puts a track. */
function candidates(props: Props): Props[] {
  const menu = record(record(props.menu)?.props)
  return [props, record(props.item), record(props.track), menu, record(menu?.item)].filter((c): c is Props => c !== null)
}

/** Pure: walks up from a fiber; the first track found is the row's, and only props about that track are read. */
export function songFromFiber(start: unknown): Song | null {
  let song: Song | null = null
  let fiber = record(start)
  for (let depth = 0; fiber && depth < MAX_DEPTH; depth++) {
    const props = record(fiber.memoizedProps)
    for (const c of props ? candidates(props) : []) {
      const uri = uriOf(c.uri, 'track')
      if (!uri || (song && uri !== song.uri)) continue
      song ??= { uri, uid: null, albumUri: null, artistUri: null }
      song.uid ??= typeof c.uid === 'string' && c.uid !== '' ? c.uid : null
      song.albumUri ??= uriOf(c.albumUri, 'album') ?? uriOf(record(c.album)?.uri, 'album') ?? uriOf(record(c.albumOfTrack)?.uri, 'album')
      song.artistUri ??= firstArtist(c.artists)
    }
    if (song?.uid && song.albumUri && song.artistUri) break
    fiber = record(fiber.return)
  }
  return song
}

function fiberOf(element: Element): unknown {
  const key = Object.keys(element).find(k => k.startsWith('__reactFiber$'))
  return key ? (element as unknown as Props)[key] : null
}

/** /album/ID?… → spotify:album:ID */
function linkUri(element: Element, selector: string, type: string): string | null {
  const id = /^\/[a-z]+\/([A-Za-z0-9]+)/.exec(element.querySelector(selector)?.getAttribute('href') ?? '')?.[1]
  return id ? `spotify:${type}:${id}` : null
}

export function songOfElement(element: Element): Song | null {
  let song = songFromFiber(fiberOf(element))
  if (!song) {
    const uri = /spotify:track:[A-Za-z0-9]+/.exec(element.querySelector(PANEL_ROW_TITLE)?.id ?? '')?.[0]
    if (!uri) return null
    song = { uri, uid: null, albumUri: null, artistUri: null }
  }
  song.albumUri ??= linkUri(element, ALBUM_LINK, 'album')
  song.artistUri ??= linkUri(element, ARTIST_LINK, 'artist')
  return song
}
