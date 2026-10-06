import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import type { AppState, Store } from '../../types'
import { BuilderContext, type UiSnapshot } from '../context'
import { observable } from '../lib/observable'
import { SaveIndicator } from './SaveIndicator'

const sync = (fn: () => void) => void act(fn)

function mount(status: AppState['saveStatus'], retrySave: () => void = () => undefined) {
  const state = observable({ saveStatus: status } as AppState)
  const store = { get: () => state.get(), subscribe: (fn: (s: AppState) => void) => state.subscribe(fn), retrySave } as unknown as Store
  const host = document.createElement('div')
  const root = host.attachShadow({ mode: 'open' })
  const ui = observable<UiSnapshot>({ open: true, tab: 'start', picking: false, editingArtwork: null })
  sync(() => render(h(BuilderContext.Provider, { value: { store, ui, root } }, h(SaveIndicator, {})), root))
  const setStatus = (s: AppState['saveStatus']) => sync(() => state.set({ saveStatus: s } as AppState))
  return { root, setStatus }
}

describe('SaveIndicator', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows Saving… while a write is pending', () => {
    expect(mount('pending').root.textContent).toContain('Saving…')
  })

  it('announces Saved after a save, then settles to a quiet check', () => {
    const { root, setStatus } = mount('pending')
    setStatus('saved')
    const el = () => root.querySelector<HTMLElement>('.b-save')
    expect(el()?.dataset.settled).toBe('false')
    sync(() => vi.advanceTimersByTime(2000))
    expect(el()?.dataset.settled).toBe('true')
  })

  it('stays quiet when already saved on open', () => {
    expect(mount('saved').root.querySelector<HTMLElement>('.b-save')?.dataset.settled).toBe('true')
  })

  it('explains local-only saving in the tooltip', () => {
    const el = mount('local').root.querySelector('.b-save')
    expect(el?.textContent).toContain('Not connected')
    expect(el?.getAttribute('title')).toContain('until Spotify restarts')
  })

  it('offers Retry on errors, and only on errors', () => {
    const retry = vi.fn()
    const root = mount('error', retry).root
    expect(root.textContent).toContain('Couldn’t save')
    sync(() => root.querySelector<HTMLButtonElement>('.b-save__retry')?.click())
    expect(retry).toHaveBeenCalledOnce()
    expect(mount('saved').root.querySelector('.b-save__retry')).toBeNull()
  })
})
