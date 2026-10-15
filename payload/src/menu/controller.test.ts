import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MenuSettings } from '../types'
import type { PlaylistNode } from '../spotify'
import { startMenu } from './controller'
import type { PlaylistApi } from './playlist-menu'
import { fakeMenu, panels, press, row, settle, shadowOf, type FakeItem } from './test-dom'

const TRACK = 'spotify:track:1'

const settings = (s: Partial<MenuSettings> = {}): MenuSettings => ({
  enabled: true,
  preset: 'ours',
  custom: [],
  playlists: { sort: 'library', order: [], pinned: [], covers: false, folders: true },
  shortcuts: { rows: [], queue: [], playerBar: [] },
  ...s,
})

const songItems = (clicks: Record<string, () => void> = {}): FakeItem[] => [
  { label: 'Add to playlist', chain: [{ menuAction: 'add-to-playlist' }, { uris: [TRACK] }], submenu: true },
  { label: 'Add to queue', chain: [{ menuAction: 'add-to-queue' }, { uri: TRACK }], onClick: clicks.queue },
  { label: 'Go to radio', chain: [{ menuAction: 'go-to-radio', divider: 'before' }] },
  { label: 'Go to album', chain: [{ menuAction: 'go-to-album' }], link: true, onClick: clicks.album },
  { label: 'Something new', chain: [{}] },
]

const api = (nodes: PlaylistNode[] = []): PlaylistApi & { added: [string, string[]][] } => {
  const added: [string, string[]][] = []
  return {
    added,
    loadPlaylists: () => Promise.resolve(nodes),
    addToPlaylist: (uri, uris) => {
      added.push([uri, uris])
      return Promise.resolve()
    },
  }
}

let stop: (() => void) | null = null
afterEach(() => {
  stop?.()
  stop = null
  document.body.replaceChildren()
})

async function open(items: FakeItem[], s = settings(), a = api()) {
  const menu = startMenu(() => s, a)
  stop = () => menu.dispose()
  const root = fakeMenu(items)
  document.body.append(root)
  await settle()
  return { menu, root }
}

describe('startMenu', () => {
  it("draws a song menu in our layout and hides Spotify's (still mounted)", async () => {
    const { root } = await open(songItems())
    expect(root.hasAttribute('data-sc-menu-hidden')).toBe(true)
    expect(document.getElementById('sc-menu-hide')).not.toBeNull()
    // The unknown item follows Go to album, which Spotify shows just before it.
    expect(panels('sc-menu')).toEqual([['Add to playlist', 'Add to queue', '---', 'Go to album', 'Something new', 'Go to radio']])
  })

  it("keeps Spotify's order and dividers for other menus", async () => {
    await open([
      { label: 'Save', chain: [{ menuAction: 'add-to-library', uri: 'spotify:album:1' }] },
      { label: 'Profile', chain: [{ menuAction: 'add-to-profile', divider: 'both' }] },
      { label: 'Download', chain: [{ menuAction: 'download' }] },
    ])
    expect(panels('sc-menu')).toEqual([['Save', '---', 'Profile', '---', 'Download']])
  })

  it("runs Spotify's own item on click and closes our panel", async () => {
    const album = vi.fn()
    await open(songItems({ album }))
    row('sc-menu', 0, 'Go to album').click()
    expect(album).toHaveBeenCalledOnce()
    expect(document.getElementById('sc-menu')).toBeNull()
  })

  it('moves with the keyboard and runs the active item on Enter', async () => {
    const queue = vi.fn()
    await open(songItems({ queue }))
    press('ArrowDown')
    press('ArrowDown')
    const e = press('Enter')
    expect(e.defaultPrevented).toBe(true)
    expect(queue).toHaveBeenCalledOnce()
  })

  it("closes when Spotify's menu goes away, and asks Spotify to close on Escape", async () => {
    const { root } = await open(songItems())
    const escape = vi.fn()
    root.querySelector('ul')?.addEventListener('keydown', (e: KeyboardEvent) => {
      escape(e.key)
    })
    press('Escape')
    expect(document.getElementById('sc-menu')).toBeNull()
    expect(escape).toHaveBeenCalledWith('Escape')

    const second = fakeMenu(songItems())
    document.body.append(second)
    await settle()
    expect(document.getElementById('sc-menu')).not.toBeNull()
    second.remove()
    await settle()
    expect(document.getElementById('sc-menu')).toBeNull()
  })

  it('opens our playlist submenu and adds the songs, with a toast', async () => {
    const a = api([
      { kind: 'playlist', uri: 'spotify:playlist:a', name: 'Alpha', image: null },
      { kind: 'folder', uri: 'spotify:folder:f', name: 'Folder', children: [{ kind: 'playlist', uri: 'spotify:playlist:b', name: 'Beta', image: null }] },
    ])
    await open(songItems(), settings(), a)
    row('sc-menu', 0, 'Add to playlist').click()
    await settle()
    expect(panels('sc-menu')[1]).toEqual(['Alpha', 'Folder'])
    row('sc-menu', 1, 'Folder').click()
    await settle()
    expect(panels('sc-menu')[2]).toEqual(['Beta'])
    row('sc-menu', 2, 'Beta').click()
    await settle()
    expect(a.added).toEqual([['spotify:playlist:b', [TRACK]]])
    expect(document.getElementById('sc-menu')).toBeNull()
    expect(shadowOf('sc-menu-toast')?.textContent).toContain('Added to Beta')
  })

  it('mirrors one of Spotify’s submenus and runs its items', async () => {
    const copy = vi.fn()
    const items = songItems()
    let sub = null as HTMLElement | null
    items.push({
      label: 'Share',
      chain: [{ menuAction: 'share', divider: 'before' }, { setIsOpen: (o: boolean) => {
        if (o && !sub) document.body.append((sub = fakeMenu([{ label: 'Copy link', chain: [{ menuAction: 'copy-link' }], onClick: copy }], 1)))
      } }],
      submenu: true,
    })
    await open(items)
    row('sc-menu', 0, 'Share').click()
    await settle()
    expect(sub?.hasAttribute('data-sc-menu-hidden')).toBe(true)
    expect(panels('sc-menu')[1]).toEqual(['Copy link'])
    row('sc-menu', 1, 'Copy link').click()
    expect(copy).toHaveBeenCalledOnce()
  })

  it('mirrors a submenu Spotify mounts inside its parent row (1.3.4: Share, Sleep timer), keeping Spotify hidden', async () => {
    const copy = vi.fn()
    const items = songItems()
    let sub = null as HTMLElement | null
    items.push({
      label: 'Share',
      chain: [{ menuAction: 'share', divider: 'before' }, { setIsOpen: (o: boolean) => {
        const li = [...document.querySelectorAll('#context-menu li')].find(l => l.textContent.includes('Share'))
        if (o && !sub && li) li.append((sub = fakeMenu([{ label: 'Copy link', chain: [{ menuAction: 'copy-link' }], onClick: copy }], 1)))
      } }],
      submenu: true,
    })
    const { root } = await open(items)
    row('sc-menu', 0, 'Share').click()
    await settle()
    expect(panels('sc-menu')[1]).toEqual(['Copy link'])
    expect(root.hasAttribute('data-sc-menu-hidden')).toBe(true) // not given up on
    row('sc-menu', 1, 'Copy link').click()
    expect(copy).toHaveBeenCalledOnce()
  })

  it("leaves Spotify's menus alone while off, and unhides on dispose", async () => {
    let s = settings({ enabled: false })
    const menu = startMenu(() => s, api())
    stop = () => menu.dispose()
    const root = fakeMenu(songItems())
    document.body.append(root)
    await settle()
    expect(document.getElementById('sc-menu')).toBeNull()
    expect(root.hasAttribute('data-sc-menu-hidden')).toBe(false)
    root.remove()

    s = settings()
    menu.refresh()
    const next = fakeMenu(songItems())
    document.body.append(next)
    await settle()
    expect(next.hasAttribute('data-sc-menu-hidden')).toBe(true)
    menu.dispose()
    expect(next.hasAttribute('data-sc-menu-hidden')).toBe(false)
    expect(document.getElementById('sc-menu')).toBeNull()
    expect(document.getElementById('sc-menu-hide')).toBeNull()
  })
})
