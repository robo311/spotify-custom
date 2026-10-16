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

/** The top bar's search form with its suggestions open: a search term, a song and a playlist (Spotify 1.3.4). */
export const SEARCH_FORM_HTML = `
<div id="global-nav-bar" data-testid="global-nav-bar"><form role="search" data-encore-id="formInputIcon">
  <input data-testid="search-input" role="combobox" type="search">
</form></div>`

export const SEARCH_DROPDOWN_HTML = `
<div id="search-dropdown" role="listbox" data-testid="search-dropdown"><ul role="grid" data-encore-id="typeList">
  <div data-encore-id="listRow" role="row" aria-rowindex="0" aria-selected="false">
    <div data-testid="mouse-only-link"></div>
    <div><div role="gridcell"><a href="/search/endless%20love" tabindex="-1">endless love</a></div></div>
  </div>
  <div data-encore-id="listRow" role="row" aria-rowindex="1" aria-selected="false" draggable="true">
    <div data-testid="mouse-only-link"></div>
    <div><div><img data-testid="entity-image" alt=""><div role="gridcell"><button data-encore-id="buttonTertiary" tabindex="-1"></button></div></div></div>
    <div><div><div role="gridcell"><a href="/track/54E6zLaoW4ofXKaXhLVu3G" tabindex="-1"><span data-encore-id="listRowTitle">Andless</span></a></div>
      <p data-encore-id="listRowSubtitle"><span>Song</span> • <a href="/artist/5Z71xE9prhpHrqL5thVMyK" tabindex="-1">tripleS</a></p></div>
    <div id="song-trailing"><div role="gridcell" id="song-menu"><button aria-haspopup="menu" data-testid="more-button" tabindex="-1"></button></div>
      <div role="gridcell"><button id="song-save" aria-checked="true" data-encore-id="buttonTertiary" tabindex="-1"></button></div></div></div>
  </div>
  <div data-encore-id="listRow" role="row" aria-rowindex="2" aria-selected="false" draggable="true">
    <div data-testid="mouse-only-link"></div>
    <div><div><div role="gridcell"><a href="/playlist/02X91JXgs29SxLGnZo3s3T" tabindex="-1"><span data-encore-id="listRowTitle">TripleS</span></a></div></div>
    <div><div role="gridcell"><button aria-haspopup="menu" data-testid="more-button" tabindex="-1"></button></div>
      <div role="gridcell"><button id="playlist-save" aria-checked="false" data-encore-id="buttonTertiary" tabindex="-1"></button></div></div></div>
  </div>
</ul></div>`

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
    shortcuts: { rows: [], queue: [], playerBar: [], search: [], ...shortcuts },
    hideSpotifyAdd: [],
  }
}
