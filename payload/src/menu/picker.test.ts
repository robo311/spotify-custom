import { afterEach, expect, it } from 'vitest'
import type { PlaylistNode } from '../spotify'
import { closePlaylistPicker, openPlaylistPicker } from './picker'
import { panels, press, row, settle } from './test-dom'

afterEach(() => {
  closePlaylistPicker()
  document.body.replaceChildren()
})

const NAMES = ['Road trip', 'Focus', 'Gym', 'Chill', 'Party', 'Rainy day', 'Sleep', 'Workout', 'Dinner']
const nodes: PlaylistNode[] = NAMES.map(name => ({ kind: 'playlist', uri: `spotify:playlist:${name}`, name, image: null }))
const settings = () => ({ sort: 'name' as const, order: [], pinned: ['spotify:playlist:Sleep'], covers: true, folders: true })

it('lists playlists (pinned first, then A–Z), filters as you type, and adds on Enter', async () => {
  const added: [string, string[]][] = []
  const api = { loadPlaylists: () => Promise.resolve(nodes), addToPlaylist: (p: string, u: string[]) => (added.push([p, u]), Promise.resolve()) }
  openPlaylistPicker({ x: 10, y: 10 }, ['spotify:track:1'], settings, api)
  await settle()
  expect(panels('sc-menu-picker')[0]).toEqual(['Sleep', '---', 'Chill', 'Dinner', 'Focus', 'Gym', 'Party', 'Rainy day', 'Road trip', 'Workout'])
  // More than 8 playlists: letters go to the search field instead of jumping.
  expect(document.getElementById('sc-menu-picker')?.shadowRoot?.querySelector('input')).not.toBeNull()
  press('r')
  press('o')
  await settle()
  expect(panels('sc-menu-picker')[0]).toEqual(['Road trip'])
  press('Enter')
  await settle()
  expect(added).toEqual([['spotify:playlist:Road trip', ['spotify:track:1']]])
  expect(document.getElementById('sc-menu-picker')).toBeNull()
})

it('closes on Escape and on a press outside', async () => {
  const api = { loadPlaylists: () => Promise.resolve(nodes.slice(0, 2)), addToPlaylist: () => Promise.resolve() }
  openPlaylistPicker({ x: 10, y: 10 }, ['spotify:track:1'], settings, api)
  await settle()
  expect(row('sc-menu-picker', 0, 'Road trip')).toBeTruthy()
  press('Escape')
  expect(document.getElementById('sc-menu-picker')).toBeNull()

  openPlaylistPicker({ x: 10, y: 10 }, ['spotify:track:1'], settings, api)
  document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
  expect(document.getElementById('sc-menu-picker')).toBeNull()
})
