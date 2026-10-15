import { describe, expect, it } from 'vitest'
import { mapRootlist, shareUrl } from './platform'

// Trimmed from RootlistAPI.getContents() on Spotify 1.3.4 (names and ids replaced).
const ROOT = {
  type: 'folder',
  name: '<root>',
  items: [
    { type: 'playlist', uri: 'spotify:playlist:theirs', name: 'Blend', isOwnedBySelf: false, canAdd: false, images: [] },
    {
      type: 'playlist',
      uri: 'spotify:playlist:mine',
      name: 'Mine',
      isOwnedBySelf: true,
      canAdd: true,
      images: [
        { url: 'spotify:image:large', width: 640 },
        { url: 'spotify:image:small', width: 60 },
      ],
    },
    {
      type: 'folder',
      uri: 'spotify:user:me:folder:a',
      name: 'Main',
      items: [{ type: 'playlist', uri: 'spotify:playlist:collab', name: 'Collab', isOwnedBySelf: false, canAdd: true, images: [{ url: 'javascript:x' }] }],
    },
    { type: 'folder', uri: 'spotify:user:me:folder:b', name: 'Only followed', items: [{ type: 'playlist', uri: 'spotify:playlist:x', name: 'X', isOwnedBySelf: false }] },
    'junk',
  ],
}

describe('mapRootlist', () => {
  it('keeps playlists you can add to, with their smallest cover, inside their folders', () => {
    expect(mapRootlist(ROOT)).toEqual([
      { kind: 'playlist', uri: 'spotify:playlist:mine', name: 'Mine', image: 'https://i.scdn.co/image/small' },
      {
        kind: 'folder',
        uri: 'spotify:user:me:folder:a',
        name: 'Main',
        children: [{ kind: 'playlist', uri: 'spotify:playlist:collab', name: 'Collab', image: null }],
      },
    ])
  })

  it('survives a shape it does not know', () => {
    expect(mapRootlist(null)).toEqual([])
    expect(mapRootlist({ items: 'x' })).toEqual([])
  })
})

describe('shareUrl', () => {
  it('turns a URI into the open.spotify.com link', () => {
    expect(shareUrl('spotify:track:abc')).toBe('https://open.spotify.com/track/abc')
    expect(shareUrl('nope')).toBeNull()
  })
})
