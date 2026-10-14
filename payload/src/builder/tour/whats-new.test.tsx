import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import type { AppState, Store } from '../../types'
import { BuilderContext, type UiSnapshot } from '../context'
import { observable } from '../lib/observable'
import { loadPrefs, savePrefs } from '../lib/prefs'
import { WhatsNewButton } from '../entry/WhatsNewButton'
import { TOUR_STEPS } from './steps'
import { startTour } from './tour'
import { TourLayer } from './TourLayer'
import { WHATS_NEW } from './whats-new'

const sync = (fn: () => void) => void act(fn)

function mount(initial: Partial<UiSnapshot> = {}) {
  const host = document.createElement('div')
  document.body.append(host)
  const root = host.attachShadow({ mode: 'open' })
  const ui = observable<UiSnapshot>({ open: false, tab: 'look', picking: false, editingArtwork: null, ...initial })
  const store = { get: () => ({}) as AppState, subscribe: () => () => undefined } as unknown as Store
  sync(() => render(h(BuilderContext.Provider, { value: { store, ui, root } }, h('div', {}, h(WhatsNewButton, {}), h(TourLayer, {}))), root))
  const sparkle = () => {
    const el = root.querySelector<HTMLButtonElement>('.b-new')
    if (!el) throw new Error('no sparkle button')
    return el
  }
  const button = (label: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === label)
  const card = () => root.querySelector('.b-tour__card')
  const unmount = () => {
    render(null, root)
    host.remove()
  }
  return { ui, sparkle, button, card, unmount }
}

describe('What’s new', () => {
  beforeEach(() => localStorage.clear())

  it('describes a release and its steps', () => {
    expect(WHATS_NEW.id).toMatch(/^\d+\.\d+\.\d+$/)
    expect(WHATS_NEW.steps.length).toBeGreaterThan(0)
  })

  it('lights up while this release’s showcase hasn’t been seen', () => {
    const t = mount({ whatsNewSeen: '0.0.1' })
    expect(t.sparkle().classList.contains('is-lit')).toBe(true)
    expect(t.sparkle().title).toContain(WHATS_NEW.label)
    t.unmount()
  })

  it('stays quiet once seen, still offering a replay', () => {
    const t = mount({ whatsNewSeen: WHATS_NEW.id })
    expect(t.sparkle().classList.contains('is-lit')).toBe(false)
    expect(t.sparkle().getAttribute('aria-label')).toMatch(/new in spotify custom/i)
    t.unmount()
  })

  it('click marks it seen, opens the studio and starts the showcase on its first step', () => {
    const t = mount({ whatsNewSeen: null })
    sync(() => t.sparkle().click())
    expect(loadPrefs().whatsNewSeen).toBe(WHATS_NEW.id)
    expect(t.ui.get()).toMatchObject({ open: true, guide: 'whatsNew', tour: 0, tab: WHATS_NEW.steps[0]?.tab, whatsNewSeen: WHATS_NEW.id })
    expect(t.sparkle().classList.contains('is-lit')).toBe(false)
    expect(t.card()?.textContent).toContain(WHATS_NEW.steps[0]?.title)
    expect(t.card()?.textContent).toContain(`1 / ${WHATS_NEW.steps.length}`)
    t.unmount()
  })

  it('walks the showcase’s own steps; Skip ends it and forgets which guide was running', () => {
    const t = mount({ whatsNewSeen: null })
    sync(() => t.sparkle().click())
    sync(() => t.button('Next')?.click())
    expect(t.ui.get()).toMatchObject({ guide: 'whatsNew', tour: 1, tab: WHATS_NEW.steps[1]?.tab })
    sync(() => t.button('Skip')?.click())
    expect(t.ui.get().tour).toBeUndefined()
    expect(t.ui.get().guide).toBeUndefined()
    expect(t.card()).toBeNull()
    t.unmount()
  })

  it('the guided tour still runs its own steps afterwards', () => {
    savePrefs({ whatsNewSeen: WHATS_NEW.id })
    const t = mount({ guide: 'whatsNew', tour: 0 })
    sync(() => startTour(t.ui))
    expect(t.ui.get().guide).toBeUndefined()
    expect(t.card()?.textContent).toContain(TOUR_STEPS[0].title)
    expect(t.card()?.textContent).toContain(`1 / ${TOUR_STEPS.length}`)
    t.unmount()
  })
})
