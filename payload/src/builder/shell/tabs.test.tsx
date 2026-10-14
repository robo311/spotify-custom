import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { ICON_NAMES, BUILTIN_ICON_PACKS } from '../../icons'
import { LAYOUT_OPTIONS, PARTS } from '../../parts'
import { normalizeSettings } from '../../theme/model'
import { PRESETS } from '../../theme/presets'
import type { AppState, Store, Theme } from '../../types'
import { BuilderContext, TAB_IDS, type TabId, type UiSnapshot } from '../context'
import { goTo } from '../lib/navigate'
import { observable, type Observable } from '../lib/observable'
import { PART_ICONS } from '../parts/PartSection'
import { PART_PLACES } from './part-places'
import { TABS } from './tabs'

const sync = (fn: () => void) => void act(fn)

/** Icons a pack replaces without a button of their own to choose for. */
const PACK_ONLY_ICONS = new Set(['library'])

function appState(): AppState {
  const active: Theme = structuredClone(PRESETS[0])
  return {
    ready: true,
    settings: normalizeSettings(undefined, active.id),
    presets: PRESETS,
    userThemes: [],
    active,
    activeIsPreset: true,
    iconPacks: BUILTIN_ICON_PACKS,
    extensions: [
      { id: 'stats', name: 'Listening stats', builtIn: true, enabled: true },
      { id: 'mine', name: 'Mine', builtIn: false, enabled: false },
    ],
    partStatus: {},
    shelves: [{ key: 'made-for-you', label: 'Made for you', stable: true }],
    panelSections: [{ key: 'about', label: 'About the artist' }],
    libraryItems: [{ uri: 'spotify:collection:tracks', kind: 'liked', name: 'Liked Songs' }],
    canUndo: false,
    canRedo: false,
    saveStatus: 'saved',
    helper: { connected: false, dataDir: '', platform: 'darwin', version: 'dev' },
    update: { state: 'idle' },
  } as unknown as AppState
}

function mount(tab: TabId, ui: Partial<UiSnapshot> = {}): { root: ShadowRoot; ui: Observable<UiSnapshot> } {
  const state = observable(appState())
  const store = { get: () => state.get(), subscribe: (fn: (s: AppState) => void) => state.subscribe(fn), edit: vi.fn(), editSettings: vi.fn(), exportShareCode: () => 'code' } as unknown as Store
  const host = document.createElement('div')
  const root = host.attachShadow({ mode: 'open' })
  const uiState = observable<UiSnapshot>({ open: true, tab, picking: false, editingArtwork: null, ...ui })
  const Tab = (TABS.find(t => t.id === tab) ?? TABS[0]).Component
  sync(() => render(h(BuilderContext.Provider, { value: { store, ui: uiState, root } }, h(Tab, {})), root))
  return { root, ui: uiState }
}

describe('studio tabs', () => {
  it('are the known tabs, grouped theme · areas · more', () => {
    expect(TABS.map(t => t.id)).toEqual([...TAB_IDS])
    const groups = TABS.map(t => t.group)
    expect(groups.join(' ')).toMatch(/^(theme )+(areas )+(more ?)+$/)
  })

  it('place every part in a tab that has a section for it', () => {
    for (const part of PARTS) {
      const tab = PART_PLACES[part.id]
      expect(tab, part.id).toBeDefined()
      if (!tab) continue
      expect(mount(tab).root.querySelector(`[data-section="${part.id}"]`), `${part.id} in ${tab}`).not.toBeNull()
    }
  })

  it('give every section title an icon', () => {
    for (const part of PARTS) expect(PART_ICONS[part.id], part.id).toBeDefined()
    for (const tab of TABS) {
      for (const title of mount(tab.id).root.querySelectorAll('.b-section__title')) {
        expect(title.querySelector('.b-section__icon svg'), `${tab.id}: ${title.textContent}`).not.toBeNull()
      }
    }
  })

  it('offer every part editor, hide switch and button icon exactly once', () => {
    const where = new Map<string, TabId[]>()
    for (const tab of TABS) {
      for (const el of mount(tab.id).root.querySelectorAll<HTMLElement>('[data-part], [data-hide], [data-icon]')) {
        const key = el.dataset.part ? `part:${el.dataset.part}` : el.dataset.hide ? `hide:${el.dataset.hide}` : `icon:${el.dataset.icon}`
        where.set(key, [...(where.get(key) ?? []), tab.id])
      }
    }
    const expected = [
      ...PARTS.map(p => `part:${p.id}`),
      ...LAYOUT_OPTIONS.map(o => `hide:${o.id}`),
      ...ICON_NAMES.filter(n => !PACK_ONLY_ICONS.has(n)).map(n => `icon:${n}`),
    ]
    for (const key of expected) expect(where.get(key) ?? [], key).toHaveLength(1)
    expect([...where.keys()].filter(k => !expected.includes(k))).toEqual([])
  })
})

describe('going to a section', () => {
  it('opens the tab, rings the section and then forgets the request', () => {
    const { root, ui } = mount('nowplaying', { focus: 'npvCards' })
    expect(root.querySelector('[data-section="npvCards"]')?.getAttribute('data-focused')).toBe('true')
    expect(ui.get().focus).toBeUndefined()
  })

  it('switches tab and leaves pick mode', () => {
    const ui = observable<UiSnapshot>({ open: false, tab: 'themes', picking: true, editingArtwork: null })
    goTo(ui, 'player', 'progressBar')
    expect(ui.get()).toMatchObject({ open: true, tab: 'player', focus: 'progressBar', picking: false })
  })

  it('opens Pages on General for the page background, whichever sub-tab was last open', () => {
    const first = mount('pages')
    const albums = [...first.root.querySelectorAll<HTMLElement>('[role="tab"]')].find(b => b.textContent === 'Albums')
    sync(() => albums?.click())
    expect(first.root.querySelector('[data-section="main"]')).toBeNull()
    expect(mount('pages', { focus: 'main' }).root.querySelector('[data-section="main"]')).not.toBeNull()
  })
})
