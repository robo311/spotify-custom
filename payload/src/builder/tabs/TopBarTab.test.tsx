import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { defaultLayout, defaultSearchDropdown } from '../../theme/model'
import { PRESETS } from '../../theme/presets'
import type { AppState, SearchDropdownLayout, Store, Theme } from '../../types'
import { BuilderContext, type UiSnapshot } from '../context'
import { mountSpotifySearch } from '../fixtures/spotify-search'
import { observable } from '../lib/observable'
import { TopBarTab } from './TopBarTab'

const sync = (fn: () => void) => void act(fn)

function mount(searchDropdown: Partial<SearchDropdownLayout> = {}) {
  const base = PRESETS[0]
  const theme: Theme = { ...structuredClone(base), layout: { ...defaultLayout(), searchDropdown: { ...defaultSearchDropdown(), ...searchDropdown } } }
  const state = observable({ active: theme, helper: { connected: false }, partStatus: {}, iconPacks: [] } as unknown as AppState)
  const edit = vi.fn((fn: (t: Theme) => void) => fn(theme))
  const store = { get: () => state.get(), subscribe: (fn: (s: AppState) => void) => state.subscribe(fn), edit } as unknown as Store
  const host = document.createElement('div')
  document.body.append(host)
  const root = host.attachShadow({ mode: 'open' })
  const ui = observable<UiSnapshot>({ open: true, tab: 'topbar', picking: false, editingArtwork: null })
  sync(() => render(h(BuilderContext.Provider, { value: { store, ui, root } }, h(TopBarTab, {})), root))
  const section = () => {
    const el = root.querySelector('[data-section="searchDropdown"]')
    if (!el) throw new Error('no search suggestions section')
    return el
  }
  const click = (selector: string, text: string) => {
    const el = [...section().querySelectorAll<HTMLElement>(selector)].find(e => e.textContent.trim().startsWith(text))
    if (!el) throw new Error(`no ${text}`)
    sync(() => el.click())
  }
  const sliders = () => [...section().querySelectorAll('.b-slider__label')].map(l => l.textContent)
  const point = (id: string) => {
    const el = root.querySelector(`[data-section="${id}"]`)
    sync(() => el?.dispatchEvent(new Event('pointerover', { bubbles: true, composed: true })))
  }
  return { theme, section, click, sliders, point, ui }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('TopBarTab search suggestions', () => {
  it('sets the row spacing and hides the hints and type labels', () => {
    const t = mount()
    t.click('button', 'Dense')
    t.click('.b-toggle', 'Hide the key hints')
    t.click('.b-toggle', 'Hide “Song •”')
    expect(t.theme.layout.searchDropdown).toMatchObject({ density: 'dense', hideHints: true, hideTypeLabel: true })
  })

  it("offers the height slider once the dropdown has its own height, starting from Spotify's", () => {
    const t = mount()
    expect(t.sliders()).not.toContain('Height')
    t.click('.b-toggle', 'Own height')
    expect(t.theme.layout.searchDropdown.maxHeight).toBe(398)
    expect(mount({ maxHeight: 500 }).sliders()).toContain('Height')
  })

  it('opens the suggestions while you work in the section, and closes them when you move on', () => {
    const search = mountSpotifySearch()
    const t = mount()
    t.point('searchDropdown')
    expect(search.isOpen()).toBe(true)
    t.click('button', 'Dense')
    expect(search.isOpen()).toBe(true)
    t.point('searchBox')
    expect(search.isOpen()).toBe(false)
  })

  it('lets go when the studio closes (it stays mounted to animate out)', () => {
    const search = mountSpotifySearch()
    const t = mount()
    t.point('searchDropdown')
    expect(search.isOpen()).toBe(true)
    sync(() => t.ui.set(s => ({ ...s, open: false })))
    expect(search.isOpen()).toBe(false)
  })

  it("resets the layout with the part's colours", () => {
    const t = mount({ density: 'compact', imageSize: 32 })
    const reset = t.section().querySelector<HTMLElement>('[aria-label="Reset search suggestions"]')
    sync(() => reset?.click())
    expect(t.theme.layout.searchDropdown).toEqual(defaultSearchDropdown())
  })
})
