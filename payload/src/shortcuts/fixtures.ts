// Test fixtures: a Liked Songs track row trimmed from Spotify 1.3.4's live DOM (hashed classes, SVGs and localised
// labels dropped), and a fiber chain shaped like the one found above it.
import type { MenuSettings, ShortcutAction, ShortcutSurface } from '../types'

export const TRACK_A = 'spotify:track:2mNGL7mZILSqZHxGboJaO9'
export const TRACK_B = 'spotify:track:203uVLn0YRikqOgI4axq8n'
export const ALBUM = 'spotify:album:61PCQeDaTD2gwfpHFikpbh'
export const ARTIST = 'spotify:artist:3qiHUAX7zY4Qnjx8TNUzVx'

export const TRACK_LIST_HTML = `
<div id="main-view"><main><div role="grid" data-testid="playlist-tracklist">
  <div role="row" aria-rowindex="2" aria-selected="false">
    <div data-testid="tracklist-row" draggable="true" role="presentation">
      <div role="gridcell" aria-colindex="1"><div><span data-encore-id="text">1</span><button tabindex="-1"></button></div></div>
      <div role="gridcell" aria-colindex="2"><img src="spotify:image:ab67616d00004851d581e4b339c05d37a96be5ea" alt=""><div>
        <div data-encore-id="text" dir="auto">COMË N GO</div>
        <span data-encore-id="text"><div data-encore-id="text"><a href="/artist/3qiHUAX7zY4Qnjx8TNUzVx" tabindex="-1">Yeat</a></div></span>
      </div></div>
      <div role="gridcell" aria-colindex="3"><span data-encore-id="text"><a href="/album/61PCQeDaTD2gwfpHFikpbh" tabindex="-1">DANGEROUS SUMMER</a></span></div>
      <div role="gridcell" aria-colindex="4"><span data-encore-id="text">3 hours ago</span></div>
      <div role="gridcell" aria-colindex="5">
        <button id="spotify-add" aria-checked="true" data-encore-id="buttonTertiary" tabindex="-1"><span aria-hidden="true"></span></button>
        <div data-encore-id="text">3:19</div>
        <button aria-haspopup="menu" data-testid="more-button" data-encore-id="buttonTertiary" tabindex="-1"><span aria-hidden="true"></span></button>
      </div>
    </div>
  </div>
</div></main></div>`

/** Gives an element a React fiber whose chain carries `uri` (and the menu item with uid / album / artists). */
export function setRowSong(row: Element, uri: string, extra: { uid?: string; album?: string; artist?: string } = {}): void {
  const menuItem = { uri, uid: extra.uid, album: extra.album ? { uri: extra.album } : undefined, artists: extra.artist ? [{ uri: extra.artist }] : [] }
  let fiber: unknown = { memoizedProps: { menu: { props: { item: menuItem } } }, return: null }
  fiber = { memoizedProps: { uri, contextUri: 'spotify:collection:tracks' }, return: fiber }
  fiber = { memoizedProps: { 'data-testid': 'tracklist-row' }, return: fiber }
  for (const key of Object.keys(row).filter(k => k.startsWith('__reactFiber$'))) Reflect.deleteProperty(row, key)
  Object.assign(row, { [`__reactFiber$${Math.random().toString(36).slice(2)}`]: fiber })
}

export function menuSettings(shortcuts: Partial<Record<ShortcutSurface, ShortcutAction[]>>): MenuSettings {
  return {
    enabled: false,
    preset: 'stock',
    custom: [],
    playlists: { sort: 'library', order: [], pinned: [], covers: true, folders: true },
    shortcuts: { rows: [], queue: [], playerBar: [], ...shortcuts },
  }
}
