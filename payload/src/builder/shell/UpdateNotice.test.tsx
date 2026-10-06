import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import type { AppState, Store, UpdateStatus } from '../../types'
import { BuilderContext, type UiSnapshot } from '../context'
import { observable } from '../lib/observable'
import { UpdateNotice } from './UpdateNotice'

const sync = (fn: () => void) => void act(fn)

function mount(update: UpdateStatus, installUpdate: () => void = () => undefined) {
  const state = observable({ update } as AppState)
  const store = { get: () => state.get(), subscribe: (fn: (s: AppState) => void) => state.subscribe(fn), installUpdate } as unknown as Store
  const host = document.createElement('div')
  const root = host.attachShadow({ mode: 'open' })
  const ui = observable<UiSnapshot>({ open: true, tab: 'start', picking: false, editingArtwork: null })
  sync(() => render(h(BuilderContext.Provider, { value: { store, ui, root } }, h(UpdateNotice, {})), root))
  const button = () => root.querySelector<HTMLButtonElement>('button')
  const setUpdate = (u: UpdateStatus) => sync(() => state.set({ update: u } as AppState))
  return { root, button, setUpdate }
}

const AVAILABLE: UpdateStatus = { state: 'available', current: '0.1.0', latest: '0.2.0' }

describe('UpdateNotice', () => {
  it('renders nothing when up to date', () => {
    expect(mount({ state: 'none', current: '0.1.0' }).root.childElementCount).toBe(0)
  })

  it('names the new version and installs on Update', () => {
    const install = vi.fn()
    const { root, button } = mount(AVAILABLE, install)
    expect(root.textContent).toContain('Spotify Custom 0.2.0 is available')
    expect(button()?.textContent).toBe('Update')
    sync(() => button()?.click())
    expect(install).toHaveBeenCalledOnce()
  })

  it('disables the button while installing and says a restart is coming', () => {
    const { root, button } = mount({ ...AVAILABLE, state: 'installing' })
    expect(root.textContent).toContain('Updating…')
    expect(root.textContent).toContain('restarts in a moment')
    expect(button()?.disabled).toBe(true)
  })

  it('explains a failure and offers Try again', () => {
    const install = vi.fn()
    const { root, button } = mount({ ...AVAILABLE, state: 'failed', message: 'Checksum mismatch' }, install)
    expect(root.textContent).toContain('Couldn’t update')
    expect(root.querySelector('[title="Checksum mismatch"]')).not.toBeNull()
    expect(button()?.textContent).toBe('Try again')
    sync(() => button()?.click())
    expect(install).toHaveBeenCalledOnce()
  })

  it('hides again once the update is done', () => {
    const { root, setUpdate } = mount(AVAILABLE)
    setUpdate({ state: 'none', current: '0.2.0' })
    expect(root.childElementCount).toBe(0)
  })
})
