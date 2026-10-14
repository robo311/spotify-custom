import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import type { AppState, Store, UpdateStatus } from '../../types'
import { BuilderContext, type UiSnapshot } from '../context'
import { observable } from '../lib/observable'
import { UpdateButton } from './UpdateButton'

const sync = (fn: () => void) => void act(fn)

function mount(update: UpdateStatus, installUpdate: () => void = () => undefined) {
  const state = observable({ update } as AppState)
  const store = { get: () => state.get(), subscribe: (fn: (s: AppState) => void) => state.subscribe(fn), installUpdate } as unknown as Store
  const host = document.createElement('div')
  const root = host.attachShadow({ mode: 'open' })
  const ui = observable<UiSnapshot>({ open: false, tab: 'themes', picking: false, editingArtwork: null })
  sync(() => render(h(BuilderContext.Provider, { value: { store, ui, root } }, h(UpdateButton, {})), root))
  const button = () => root.querySelector<HTMLButtonElement>('button')
  const setUpdate = (u: UpdateStatus) => sync(() => state.set({ update: u } as AppState))
  return { root, button, setUpdate }
}

const AVAILABLE: UpdateStatus = { state: 'available', current: '0.2.0', latest: '0.3.0' }

describe('UpdateButton (top bar)', () => {
  it('renders nothing when up to date', () => {
    expect(mount({ state: 'none', current: '0.2.0' }).button()).toBeNull()
  })

  it('names the new version and installs on click', () => {
    const install = vi.fn()
    const { button } = mount(AVAILABLE, install)
    expect(button()?.textContent.trim()).toBe('Update 0.3.0')
    sync(() => button()?.click())
    expect(install).toHaveBeenCalledOnce()
  })

  it('is disabled while installing', () => {
    const { button } = mount({ ...AVAILABLE, state: 'installing' })
    expect(button()?.textContent.trim()).toBe('Updating…')
    expect(button()?.disabled).toBe(true)
  })

  it('offers a retry after a failure, with the reason on hover', () => {
    const install = vi.fn()
    const { button } = mount({ ...AVAILABLE, state: 'failed', message: 'Checksum mismatch' }, install)
    expect(button()?.textContent.trim()).toBe('Update failed · retry')
    expect(button()?.title).toContain('Checksum mismatch')
    sync(() => button()?.click())
    expect(install).toHaveBeenCalledOnce()
  })

  it('disappears once the update is done', () => {
    const { button, setUpdate } = mount(AVAILABLE)
    setUpdate({ state: 'none', current: '0.3.0' })
    expect(button()).toBeNull()
  })
})
