import { describe, expect, it } from 'vitest'
import type { PlaylistMenuSettings } from '../types'
import type { PlaylistNode } from '../spotify'
import { filterPlaylists, flatten, orderPlaylists } from './playlists'

const pl = (name: string): PlaylistNode => ({ kind: 'playlist', uri: `spotify:playlist:${name}`, name, image: null })
const folder = (name: string, children: PlaylistNode[]): PlaylistNode => ({ kind: 'folder', uri: `spotify:folder:${name}`, name, children })

// Library order: Zed, [Mix: beta, Álpha], gamma
const LIBRARY: PlaylistNode[] = [pl('Zed'), folder('Mix', [pl('beta'), pl('Álpha')]), pl('gamma')]

const settings = (s: Partial<PlaylistMenuSettings>): PlaylistMenuSettings => ({
  sort: 'library', order: [], pinned: [], covers: true, folders: true, ...s,
})

const names = (nodes: PlaylistNode[]): string[] =>
  nodes.map(n => (n.kind === 'folder' ? `${n.name}[${names(n.children).join(',')}]` : n.name))

describe('orderPlaylists', () => {
  it('keeps the library tree as is', () => {
    const o = orderPlaylists(LIBRARY, settings({}))
    expect(o.pinned).toEqual([])
    expect(names(o.rest)).toEqual(['Zed', 'Mix[beta,Álpha]', 'gamma'])
  })

  it('flattens folders when they are off', () => {
    expect(names(orderPlaylists(LIBRARY, settings({ folders: false })).rest)).toEqual(['Zed', 'beta', 'Álpha', 'gamma'])
  })

  it('sorts A–Z inside each folder, ignoring case and accents', () => {
    expect(names(orderPlaylists(LIBRARY, settings({ sort: 'name' })).rest)).toEqual(['gamma', 'Mix[Álpha,beta]', 'Zed'])
    expect(names(orderPlaylists(LIBRARY, settings({ sort: 'name', folders: false })).rest)).toEqual(['Álpha', 'beta', 'gamma', 'Zed'])
  })

  it('follows the custom order, unlisted ones after in library order', () => {
    const o = orderPlaylists(LIBRARY, settings({ sort: 'custom', folders: false, order: ['spotify:playlist:gamma', 'spotify:playlist:beta'] }))
    expect(names(o.rest)).toEqual(['gamma', 'beta', 'Zed', 'Álpha'])
  })

  it('puts pinned playlists first in pinned order, out of their folders, dropping folders left empty', () => {
    const o = orderPlaylists([pl('Zed'), folder('Solo', [pl('one')])], settings({ pinned: ['spotify:playlist:one', 'spotify:playlist:gone', 'spotify:playlist:Zed'] }))
    expect(names(o.pinned)).toEqual(['one', 'Zed'])
    expect(o.rest).toEqual([])
  })
})

describe('filterPlaylists', () => {
  it('matches anywhere in the name, ignoring case and accents, pinned first, folders flattened', () => {
    const o = orderPlaylists(LIBRARY, settings({ pinned: ['spotify:playlist:gamma'] }))
    expect(names(filterPlaylists(o, 'A'))).toEqual(['gamma', 'beta', 'Álpha'])
    expect(names(filterPlaylists(o, ' alp '))).toEqual(['Álpha'])
    expect(filterPlaylists(o, 'nothing')).toEqual([])
  })
})

it('flatten lists every playlist depth first', () => {
  expect(names(flatten(LIBRARY))).toEqual(['Zed', 'beta', 'Álpha', 'gamma'])
})
