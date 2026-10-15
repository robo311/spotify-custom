import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { OURS, STOCK } from '../../menu'
import type { PlaylistNode } from '../../spotify'
import { defaultMenuSettings, normalizeSettings } from '../../theme/model'
import type { AppState, MenuSettings, Settings, Store } from '../../types'
import { BuilderContext, type UiSnapshot } from '../context'
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
  const root = host.attachShadow({ mode: 'open' })
  const ui = observable<UiSnapshot>({ open: true, tab: 'menu', picking: false, editingArtwork: null })
  sync(() => render(h(BuilderContext.Provider, { value: { store, ui, root } }, h(MenuTab, {})), root))
  const button = (label: string) => {
    const b = [...root.querySelectorAll<HTMLElement>('button')].find(el => el.getAttribute('aria-label') === label || el.textContent.trim() === label)
    if (!b) throw new Error(`no button ${label}`)
    return b
  }
  return { root, menu: () => state.get().settings.menu, click: (label: string) => sync(() => button(label).click()), button }
}

beforeEach(() => {
  loadPlaylists = () => Promise.resolve([])
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
    const input = t.root.querySelector<HTMLInputElement>('input[aria-label="Group name"]')
    if (!input) throw new Error('no group name field')
    expect(input.maxLength).toBe(40)
    input.value = 'Later'
    sync(() => input.dispatchEvent(new Event('input', { bubbles: true })))
    expect(t.menu().custom.at(-1)).toEqual({ kind: 'group', label: 'Later' })
    t.click('Remove group Later')
    expect(t.menu().custom).toHaveLength(OURS.length + 1)
  })

  it('marks items that only appear in some menus', () => {
    const row = [...mount().root.querySelectorAll('.b-mrow__text')].find(r => r.textContent.startsWith('Remove from queue'))
    expect(row?.textContent).toContain('Only in some menus')
  })

  it('offers only the switch while our menu is off', () => {
    const t = mount({ enabled: false })
    expect(t.root.querySelector('[aria-label="Menu rows"]')).toBeNull()
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
