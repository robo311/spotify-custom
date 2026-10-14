import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import type { Store } from '../../types'
import { BuilderContext, type UiSnapshot } from '../context'
import { observable } from '../lib/observable'
import { useShortcuts } from './use-shortcuts'

const sync = (fn: () => void) => void act(fn)
const esc = () => new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, composed: true })

function Probe() {
  useShortcuts(true)
  return h('input', { id: 'ours' })
}

const cleanups: (() => void)[] = []
afterEach(() => {
  for (const fn of cleanups.splice(0)) fn()
})

function mount() {
  const host = document.createElement('div')
  document.body.append(host)
  const root = host.attachShadow({ mode: 'open' })
  const ui = observable<UiSnapshot>({ open: true, tab: 'themes', picking: false, editingArtwork: null })
  sync(() => render(h(BuilderContext.Provider, { value: { store: {} as Store, ui, root } }, h(Probe, {})), root))
  const spotify = document.createElement('div')
  spotify.innerHTML = '<input id="search"><div role="dialog"><button id="in-dialog"></button></div><button id="plain"></button>'
  document.body.append(spotify)
  cleanups.push(() => {
    sync(() => render(null, root))
    host.remove()
    spotify.remove()
  })
  const open = () => ui.get().open
  return { root, open }
}

describe('useShortcuts: Esc', () => {
  it('closes the drawer from our own UI, even from a text field', () => {
    const { root, open } = mount()
    sync(() => root.querySelector('#ours')?.dispatchEvent(esc()))
    expect(open()).toBe(false)
  })

  it('closes the drawer when focus is on nothing in particular', () => {
    const { open } = mount()
    sync(() => document.querySelector('#plain')?.dispatchEvent(esc()))
    expect(open()).toBe(false)
  })

  it("leaves Esc in Spotify's own search box to Spotify", () => {
    const { open } = mount()
    const e = esc()
    sync(() => document.querySelector('#search')?.dispatchEvent(e))
    expect(open()).toBe(true)
    expect(e.defaultPrevented).toBe(false)
  })

  it("leaves Esc inside Spotify's dialogs and menus to Spotify", () => {
    const { open } = mount()
    sync(() => document.querySelector('#in-dialog')?.dispatchEvent(esc()))
    expect(open()).toBe(true)
  })

  it('ignores Esc that something else already handled', () => {
    const { open } = mount()
    const plain = document.querySelector('#plain')
    plain?.addEventListener('keydown', e => e.preventDefault())
    sync(() => plain?.dispatchEvent(esc()))
    expect(open()).toBe(true)
  })
})
