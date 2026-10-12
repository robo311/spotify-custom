import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import type { Store } from '../../types'
import { BuilderContext, type UiSnapshot } from '../context'
import { observable } from '../lib/observable'
import { loadPrefs, savePrefs } from '../lib/prefs'
import { TourPrompt } from './TourPrompt'

const sync = (fn: () => void) => void act(fn)

function mount({ withEntry = true } = {}) {
  const entry = document.createElement('span')
  entry.id = 'sc-entry'
  if (withEntry) document.body.append(entry)
  const host = document.createElement('div')
  document.body.append(host)
  const root = host.attachShadow({ mode: 'open' })
  const ui = observable<UiSnapshot>({ open: false, tab: 'colours', picking: false, editingArtwork: null })
  sync(() => render(h(BuilderContext.Provider, { value: { store: {} as Store, ui, root } }, h(TourPrompt, {})), root))
  const button = (label: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === label)
  const prompt = () => root.querySelector('[role="dialog"]')
  const unmount = () => {
    render(null, root)
    host.remove()
    entry.remove()
  }
  return { ui, button, prompt, unmount }
}

describe('TourPrompt', () => {
  beforeEach(() => localStorage.clear())

  it('offers the tour by the studio button on first run', () => {
    const t = mount()
    expect(t.prompt()?.textContent).toContain('tour')
    t.unmount()
  })

  it('stays hidden once answered', () => {
    savePrefs({ tourSeen: true })
    const t = mount()
    expect(t.prompt()).toBeNull()
    t.unmount()
  })

  it('stays hidden while the studio button is not in Spotify yet', () => {
    const t = mount({ withEntry: false })
    expect(t.prompt()).toBeNull()
    t.unmount()
  })

  it('Show me opens the studio on the first tour step and remembers the answer', () => {
    const t = mount()
    sync(() => t.button('Show me')?.click())
    expect(t.ui.get()).toMatchObject({ open: true, tour: 0 })
    expect(t.prompt()).toBeNull()
    expect(loadPrefs().tourSeen).toBe(true)
    t.unmount()
  })

  it('Not now hides it for good without starting the tour', () => {
    const t = mount()
    sync(() => t.button('Not now')?.click())
    expect(t.prompt()).toBeNull()
    expect(t.ui.get().tour).toBeUndefined()
    expect(loadPrefs().tourSeen).toBe(true)
    t.unmount()
  })

  it('opening the studio another way counts as an answer', () => {
    const t = mount()
    sync(() => t.ui.set(s => ({ ...s, open: true })))
    expect(t.prompt()).toBeNull()
    expect(loadPrefs().tourSeen).toBe(true)
    t.unmount()
  })
})
