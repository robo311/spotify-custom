import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { OURS, STOCK } from '../../menu'
import type { PlaylistNode } from '../../spotify'
import { defaultMenuSettings, normalizeSettings } from '../../theme/model'
import type { AppState, MenuSettings, Settings, Store } from '../../types'
import { BuilderContext, type UiSnapshot } from '../context'
import { mountSpotifySearch } from '../fixtures/spotify-search'
import { observable } from '../lib/observable'
import { MenuTab } from './MenuTab'

let loadPlaylists: () => Promise<PlaylistNode[]>
vi.mock('../../spotify', () => ({ spotify: { loadPlaylists: () => loadPlaylists() } }))

const sync = (fn: () => void) => void act(fn)
const flush = () => act(async () => await Promise.resolve())

function mount(menu: Partial<MenuSettings> = {}) {
  const state = observable({ settings: { ...normalizeSettings(undefined, 'x'), menu: { ...defaultMenuSettings(), ...menu } } } as AppState)
  const editSettings = vi.fn((fn: (s: Settings) => void) => {
    const draft = structuredClone(state.get().settings)
    fn(draft)
    state.set(s => ({ ...s, settings: normalizeSettings(draft, 'x') }))
  })
  const store = { get: () => state.get(), subscribe: (fn: (s: AppState) => void) => state.subscribe(fn), editSettings } as unknown as Store
  const host = document.createElement('div')
  document.body.append(host)
  const root = host.attachShadow({ mode: 'open' })
  const ui = observable<UiSnapshot>({ open: true, tab: 'menu', picking: false, editingArtwork: null })
  sync(() => render(h(BuilderContext.Provider, { value: { store, ui, root } }, h(MenuTab, {})), root))
  /** Matches in the studio and in the menu editor's own shadow root. */
  const all = <E extends Element = HTMLElement>(selector: string): E[] => {
    const roots: ParentNode[] = [root, ...[...root.querySelectorAll('*')].flatMap(el => (el.shadowRoot ? [el.shadowRoot] : []))]
    return roots.flatMap(r => [...r.querySelectorAll<E>(selector)])
  }
  const button = (label: string) => {
    const b = all('button').find(el => el.getAttribute('aria-label') === label || el.textContent.trim() === label)
    if (!b) throw new Error(`no button ${label}`)
    return b
  }
  return { root, all, menu: () => state.get().settings.menu, click: (label: string) => sync(() => button(label).click()), button }
}

beforeEach(() => {
  loadPlaylists = () => Promise.resolve([])
})
afterEach(() => {
  document.body.innerHTML = ''
})

describe('MenuTab layout', () => {
  it('turns into Custom when a preset is edited', () => {
    const t = mount({ preset: 'stock' })
    t.click('Hide Go to album')
    expect(t.menu().preset).toBe('custom')
    expect(t.menu().custom).toHaveLength(STOCK.length)
    expect(t.menu().custom.find(e => e.kind === 'item' && e.key === 'go-to-album')).toEqual({ kind: 'item', key: 'go-to-album', hidden: true })
  })

  it('adds a separator and a named group, and removes them', () => {
    const t = mount()
    t.click('Add separator')
    t.click('Add group')
    expect(t.menu().custom.slice(OURS.length)).toEqual([{ kind: 'separator' }, { kind: 'group', label: 'New group' }])
    const input = t.all<HTMLInputElement>('input[aria-label="Group name"]').at(0)
    if (!input) throw new Error('no group name field')
    expect(input.maxLength).toBe(40)
    input.value = 'Later'
    sync(() => input.dispatchEvent(new Event('input', { bubbles: true })))
    expect(t.menu().custom.at(-1)).toEqual({ kind: 'group', label: 'Later' })
    t.click('Remove group Later')
    expect(t.menu().custom).toHaveLength(OURS.length + 1)
  })

  it('marks items that only appear in some menus', () => {
    const row = mount().all('.row').find(r => r.textContent.trim().startsWith('Remove from queue'))
    expect(row?.textContent).toContain('Some menus')
  })

  it('edits right in the menu picture: hidden rows stay, faded, so they can come back', () => {
    const t = mount()
    const rows = () => t.all('[aria-label="Menu rows"] .rows > li').map(li => li.textContent.trim() || (li.querySelector('.sep') ? '---' : ''))
    expect(rows().slice(0, 4)).toEqual(['Add to playlist', 'Remove from this playlistSome menus', 'Add to Liked Songs', 'Add to queue'])
    t.click('Hide Add to queue')
    expect(t.all('.row[data-hidden]').map(r => r.textContent.trim())).toEqual(['Add to queue'])
    t.click('Show Add to queue')
    expect(t.menu().custom.find(e => e.kind === 'item' && e.key === 'add-to-queue')).toEqual({ kind: 'item', key: 'add-to-queue' })
  })

  it('moves a row with Alt+arrow on its grip', () => {
    const t = mount()
    const grip = t.all('[aria-label^="Move Add to Liked Songs"]')[0]
    sync(() => grip.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true })))
    expect(t.menu().custom.slice(0, 3)).toEqual([
      { kind: 'item', key: 'add-to-playlist' },
      { kind: 'item', key: 'add-to-liked-songs' },
      { kind: 'item', key: 'delete' },
    ])
  })

  it('offers only the switch while our menu is off', () => {
    const t = mount({ enabled: false })
    expect(t.all('[aria-label="Menu rows"]')).toEqual([])
    sync(() => t.root.querySelector<HTMLElement>('[data-section="menuLayout"] [role="switch"]')?.click())
    expect(t.menu().enabled).toBe(true)
  })

  it('resets a Custom layout back to Spotify Custom', () => {
    const t = mount({ preset: 'custom', custom: [{ kind: 'item', key: 'share' }] })
    t.click('Discard your layout and go back to Spotify Custom')
    expect(t.menu()).toMatchObject({ preset: 'ours', custom: [] })
  })
})

describe('MenuTab shortcuts', () => {
  it('adds up to three buttons in order, then disables adding', () => {
    const t = mount()
    t.click('Like')
    t.click('Go to album')
    expect(t.menu().shortcuts.rows).toEqual(['add-to-queue', 'add-to-liked-songs', 'go-to-album'])
    expect((t.button('Go to artist') as HTMLButtonElement).disabled).toBe(true)
    t.click('Remove Add to queue')
    expect(t.menu().shortcuts.rows).toEqual(['add-to-liked-songs', 'go-to-album'])
  })

  it('offers Remove from queue in the queue only', () => {
    const t = mount()
    expect(() => t.button('Remove from queue')).toThrow()
    t.click('Queue')
    t.click('Remove from queue')
    expect(t.menu().shortcuts.queue).toEqual(['remove-from-queue'])
  })

  it("keeps or hides Spotify's own add button per place (queue rows have none)", () => {
    const t = mount()
    t.click('Song rows') // the section remembers the last place
    t.click('Hide Spotify’s add button')
    expect(t.menu().hideSpotifyAdd).toEqual(['rows'])
    t.click('Player bar')
    t.click('Hide Spotify’s add button')
    expect(t.menu().hideSpotifyAdd).toEqual(['rows', 'playerBar'])
    t.click('Show Spotify’s add button')
    expect(t.menu().hideSpotifyAdd).toEqual(['rows'])
    t.click('Queue')
    expect(() => t.button('Hide Spotify’s add button')).toThrow()
  })

  it('previews the buttons where they go, beside Spotify’s own', () => {
    const t = mount()
    t.click('Song rows')
    const shown = () => [...t.root.querySelectorAll('.b-scut-preview [data-button]')].map(b => b.getAttribute('data-button'))
    expect(shown()).toEqual(['add-to-queue', 'spotify-add', 'more'])
    t.click('Like')
    t.click('Hide Spotify’s add button')
    expect(shown()).toEqual(['add-to-queue', 'add-to-liked-songs', 'more'])
  })

  it('holds the search suggestions open while their buttons are chosen, and lets go for another place', () => {
    const search = mountSpotifySearch()
    const t = mount()
    // You're already in the section when you pick Search: it opens at once, without the pointer coming in again.
    sync(() => t.button('Search').focus())
    t.click('Search')
    expect(search.isOpen()).toBe(true)
    t.click('Song rows')
    expect(search.isOpen()).toBe(false)
  })

  it("sets search suggestions' buttons apart, with Spotify's ✓ after the ⋯", () => {
    const t = mount()
    t.click('Search')
    const shown = () => [...t.root.querySelectorAll('.b-scut-preview [data-button]')].map(b => b.getAttribute('data-button'))
    expect(shown()).toEqual(['more', 'spotify-add'])
    t.click('Copy song link')
    expect(t.menu().shortcuts.search).toEqual(['share'])
    expect(t.menu().shortcuts.rows).toEqual(['add-to-queue'])
    expect(shown()).toEqual(['share', 'more', 'spotify-add'])
    t.click('Hide Spotify’s add button')
    expect(t.menu().hideSpotifyAdd).toEqual(['search'])
  })
})

describe('MenuTab playlists', () => {
  it('lists playlists from Spotify and pins one to the top', async () => {
    loadPlaylists = () =>
      Promise.resolve([
        { kind: 'playlist', uri: 'p:a', name: 'Alpha', image: null },
        { kind: 'folder', uri: 'f', name: 'Mixes', children: [{ kind: 'playlist', uri: 'p:b', name: 'Beta', image: null }] },
      ])
    const t = mount()
    await flush()
    const names = () => [...t.root.querySelectorAll('.b-plrow__name')].map(n => n.textContent)
    expect(names()).toEqual(['Alpha', 'Beta'])
    t.click('Pin Beta to the top')
    expect(t.menu().playlists.pinned).toEqual(['p:b'])
    expect(names()).toEqual(['Beta', 'Alpha'])
  })

  it('says so quietly when Spotify can’t give the playlists', async () => {
    loadPlaylists = () => Promise.reject(new Error('unavailable'))
    const t = mount()
    await flush()
    expect(t.root.querySelector('[data-section="menuPlaylists"] .b-empty')?.textContent).toMatch(/Couldn’t read your playlists/)
  })
})
