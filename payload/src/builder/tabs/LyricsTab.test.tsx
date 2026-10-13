import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { defaultLayout, defaultLyrics, defaultLyricsAnimation } from '../../theme/model'
import { PRESETS } from '../../theme/presets'
import type { AppState, Store, Theme } from '../../types'
import { BuilderContext, type UiSnapshot } from '../context'
import { observable } from '../lib/observable'
import { LyricsTab } from './LyricsTab'

const sync = (fn: () => void) => void act(fn)

function mount(on: boolean, layout: Partial<Theme['layout']> = {}) {
  const base = PRESETS[0]
  const theme: Theme = { ...structuredClone(base), layout: { ...defaultLayout(), ...layout }, lyrics: { ...defaultLyrics(), animated: { ...defaultLyricsAnimation(), on } } }
  const state = observable({ active: theme, helper: { connected: false } } as AppState)
  const edit = vi.fn((fn: (t: Theme) => void) => fn(theme))
  const store = { get: () => state.get(), subscribe: (fn: (s: AppState) => void) => state.subscribe(fn), edit } as unknown as Store
  const host = document.createElement('div')
  const root = host.attachShadow({ mode: 'open' })
  const ui = observable<UiSnapshot>({ open: true, tab: 'lyrics', picking: false, editingArtwork: null })
  sync(() => render(h(BuilderContext.Provider, { value: { store, ui, root } }, h(LyricsTab, {})), root))
  const switches = () => [...root.querySelectorAll<HTMLElement>('[role="switch"]')].map(s => s.closest('.b-toggle')?.textContent ?? '')
  const toggle = (label: string) => {
    const row = [...root.querySelectorAll<HTMLElement>('.b-toggle')].find(r => r.textContent.startsWith(label))
    if (!row) throw new Error(`no toggle ${label}`)
    sync(() => row.click())
  }
  return { theme, switches, toggle }
}

describe('LyricsTab animated lyrics', () => {
  it('offers only the main switch while animated lyrics are off, and turns them on', () => {
    const { theme, switches, toggle } = mount(false)
    expect(switches().some(s => s.startsWith('Animated lyrics'))).toBe(true)
    expect(switches().some(s => s.startsWith('Glow'))).toBe(false)
    toggle('Animated lyrics')
    expect(theme.lyrics.animated.on).toBe(true)
  })

  it('offers each effect once they are on', () => {
    const { theme, switches, toggle } = mount(true)
    for (const label of ['Word by word', 'Glow', 'Lift', 'Blur the rest', 'Gradient fill']) expect(switches().some(s => s.startsWith(label))).toBe(true)
    toggle('Blur the rest')
    expect(theme.lyrics.animated.blurRest).toBe(true)
  })
})

describe('LyricsTab lyrics page edges', () => {
  it('floats the Now playing column and queue, and the library only while it is kept', () => {
    const { theme, switches, toggle } = mount(false)
    expect(switches().some(s => s.startsWith('Floating library'))).toBe(false)
    toggle('Floating Now playing and queue')
    expect(theme.layout.lyricsPanelFloating).toBe(true)

    const kept = mount(false, { lyricsKeepLibrary: true })
    kept.toggle('Floating library')
    expect(kept.theme.layout.lyricsLibraryFloating).toBe(true)
  })
})
