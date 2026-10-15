import { songFromFiber, songOfElement } from './song'

/** A fiber chain (innermost first) shaped like Spotify's: each entry is one fiber's memoizedProps. */
function chain(...props: unknown[]): unknown {
  let fiber: unknown = null
  for (const p of [...props].reverse()) fiber = { memoizedProps: p, return: fiber }
  return fiber
}

const TRACK = 'spotify:track:2mNGL7mZILSqZHxGboJaO9'
const ALBUM = 'spotify:album:61PCQeDaTD2gwfpHFikpbh'
const ARTIST = 'spotify:artist:3qiHUAX7zY4Qnjx8TNUzVx'
const rowDiv = { 'data-testid': 'tracklist-row', children: [] }
const filler = { children: [] }

describe('songFromFiber', () => {
  it('reads Liked Songs rows: uri on the row, uid / album / artists on the menu item', () => {
    const menu = { props: { item: { uri: TRACK, uid: 'c209', album: { uri: ALBUM, artist: { uri: 'spotify:artist:album-artist' } }, artists: [{ uri: ARTIST }, { uri: 'spotify:artist:x' }] } } }
    const fiber = chain(rowDiv, filler, filler, { uri: TRACK, contextUri: 'spotify:collection:tracks' }, filler, filler, filler, filler, { menu })
    expect(songFromFiber(fiber)).toEqual({ uri: TRACK, uid: 'c209', albumUri: ALBUM, artistUri: ARTIST })
  })

  it('reads album page rows: the menu carries albumUri and artists flat', () => {
    const menu = { props: { uri: TRACK, albumUri: ALBUM, artists: [{ uri: ARTIST, name: 'Yeat' }] } }
    const fiber = chain(rowDiv, filler, filler, { uri: TRACK }, filler, filler, filler, filler, { menu }, filler, filler, filler, filler, filler, filler, filler, { uri: TRACK, uid: 'u1' })
    expect(songFromFiber(fiber)).toEqual({ uri: TRACK, uid: 'u1', albumUri: ALBUM, artistUri: ARTIST })
  })

  it('ignores a different track further up the tree', () => {
    const fiber = chain(rowDiv, { uri: TRACK }, { item: { uri: 'spotify:track:other', uid: 'nope', albumUri: 'spotify:album:nope' } })
    expect(songFromFiber(fiber)).toEqual({ uri: TRACK, uid: null, albumUri: null, artistUri: null })
  })

  it('accepts GraphQL-shaped artists ({ items }) and albumOfTrack', () => {
    const fiber = chain({ track: { uri: TRACK, albumOfTrack: { uri: ALBUM }, artists: { items: [{ uri: ARTIST }] } } })
    expect(songFromFiber(fiber)).toEqual({ uri: TRACK, uid: null, albumUri: ALBUM, artistUri: ARTIST })
  })

  it('returns null without a track (episodes, playlists, nothing)', () => {
    expect(songFromFiber(chain({ uri: 'spotify:episode:1' }, { uri: 'spotify:playlist:2' }))).toBeNull()
    expect(songFromFiber(null)).toBeNull()
  })
})

describe('songOfElement', () => {
  function element(html: string, fiber: unknown): Element {
    document.body.innerHTML = html
    const el = document.body.firstElementChild
    if (!el) throw new Error('no element')
    Object.assign(el, { '__reactFiber$test': fiber })
    return el
  }

  it("fills album and artist from the row's links when the props lack them (artist page top songs)", () => {
    const el = element(
      `<div><a href="/artist/3qiHUAX7zY4Qnjx8TNUzVx">A</a><a href="/album/61PCQeDaTD2gwfpHFikpbh?si=x">B</a></div>`,
      chain(rowDiv, { uri: TRACK }, { menu: { props: { item: { uri: TRACK, uid: 'c209' } } } }),
    )
    expect(songOfElement(el)).toEqual({ uri: TRACK, uid: 'c209', albumUri: ALBUM, artistUri: ARTIST })
  })

  it("falls back to the panel row title's id for the uri", () => {
    const el = element(`<li role="row"><div data-encore-id="listRowTitle" id="listrow-title-${TRACK}">T</div></li>`, null)
    expect(songOfElement(el)).toEqual({ uri: TRACK, uid: null, albumUri: null, artistUri: null })
  })

  it('returns null for an element without a song', () => {
    expect(songOfElement(element('<div></div>', null))).toBeNull()
  })
})
