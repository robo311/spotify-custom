import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import { PRESETS } from '../../theme/presets'
import type { AppState, Store } from '../../types'
import { BuilderContext, type UiSnapshot } from '../context'
import { observable } from '../lib/observable'
import { Header } from './Header'

function mount(helper: Partial<AppState['helper']>) {
  const state = observable({
    active: structuredClone(PRESETS[0]),
    activeIsPreset: true,
    presets: PRESETS,
    canUndo: false,
    canRedo: false,
    save: { state: 'saved' },
    helper: { connected: true, dataDir: '', platform: 'darwin', version: '0.2.7', ...helper },
  } as unknown as AppState)
  const store = { get: () => state.get(), subscribe: (fn: (s: AppState) => void) => state.subscribe(fn) } as unknown as Store
  const host = document.createElement('div')
  const root = host.attachShadow({ mode: 'open' })
  const ui = observable<UiSnapshot>({ open: true, tab: 'start', picking: false, editingArtwork: null })
  void act(() => render(h(BuilderContext.Provider, { value: { store, ui, root } }, h(Header, { onDragStart: vi.fn() })), root))
  return root
}

describe('Header app version', () => {
  it('shows the running app version', () => {
    expect(mount({}).querySelector('.b-header__version')?.textContent).toBe('v0.2.7')
  })

  it('names local builds and stays out of the way without the app', () => {
    expect(mount({ version: 'dev' }).querySelector('.b-header__version')?.textContent).toBe('dev build')
    expect(mount({ connected: false }).querySelector('.b-header__version')).toBeNull()
  })
})
