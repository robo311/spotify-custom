import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import type { Store } from '../../types'
import { BuilderContext, type UiSnapshot } from '../context'
import { observable } from '../lib/observable'
import { TOUR_STEPS } from './steps'
import { startTour } from './tour'
import { TourLayer } from './TourLayer'

const sync = (fn: () => void) => void act(fn)

function mount(initial: Partial<UiSnapshot> = {}) {
  const host = document.createElement('div')
  document.body.append(host)
  const root = host.attachShadow({ mode: 'open' })
  // A stand-in for the studio: the first step's target exists, the rest don't.
  const header = document.createElement('header')
  header.className = 'b-header'
  root.append(header)
  const mountPoint = document.createElement('div')
  root.append(mountPoint)
  const ui = observable<UiSnapshot>({ open: true, tab: 'look', picking: false, editingArtwork: null, ...initial })
  sync(() => render(h(BuilderContext.Provider, { value: { store: {} as Store, ui, root } }, h(TourLayer, {})), mountPoint))
  const button = (label: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === label)
  const click = (label: string) => sync(() => button(label)?.click())
  const card = () => root.querySelector('[role="dialog"]')
  const spotlight = () => root.querySelector('.b-tour__spot')
  const unmount = () => {
    render(null, mountPoint)
    host.remove()
  }
  return { root, ui, button, click, card, spotlight, unmount }
}

describe('startTour', () => {
  it('opens the studio on the first step', () => {
    const ui = observable<UiSnapshot>({ open: false, tab: 'advanced', picking: true, editingArtwork: null })
    startTour(ui)
    expect(ui.get()).toMatchObject({ open: true, tab: TOUR_STEPS[0].tab, picking: false, tour: 0 })
  })
})

describe('TourLayer', () => {
  it('renders nothing while no tour is running', () => {
    const t = mount()
    expect(t.card()).toBeNull()
    t.unmount()
  })

  it('shows the step with its position and spotlights its target', () => {
    const t = mount({ tour: 0 })
    expect(t.card()?.textContent).toContain(TOUR_STEPS[0].title)
    expect(t.card()?.textContent).toContain(`1 / ${TOUR_STEPS.length}`)
    expect(t.spotlight()).not.toBeNull()
    expect(t.button('Back')?.disabled).toBe(true)
    t.unmount()
  })

  it('moves forward and back, switching to each step’s tab', () => {
    const t = mount({ tour: 0 })
    t.click('Next')
    expect(t.ui.get()).toMatchObject({ tour: 1, tab: TOUR_STEPS[1].tab })
    expect(t.card()?.textContent).toContain(TOUR_STEPS[1].title)
    t.click('Back')
    expect(t.ui.get().tour).toBe(0)
    t.unmount()
  })

  it('still shows a step whose target is missing, without a spotlight', () => {
    const t = mount({ tour: 1 })
    expect(t.card()?.textContent).toContain(TOUR_STEPS[1].title)
    expect(t.spotlight()).toBeNull()
    t.unmount()
  })

  it('leaves pick mode when moving on', () => {
    const t = mount({ tour: 2, picking: true })
    t.click('Next')
    expect(t.ui.get().picking).toBe(false)
    t.unmount()
  })

  it('ends on Done at the last step, and on Skip', () => {
    const t = mount({ tour: TOUR_STEPS.length - 1 })
    t.click('Done')
    expect(t.ui.get().tour).toBeUndefined()
    expect(t.card()).toBeNull()
    sync(() => t.ui.set(s => ({ ...s, tour: 3, picking: true })))
    t.click('Skip tour')
    expect(t.ui.get()).toMatchObject({ tour: undefined, picking: false, open: true })
    t.unmount()
  })

  it('ends on Esc, but leaves Esc to pick mode while picking', () => {
    const t = mount({ tour: 2, picking: true })
    const esc = () => sync(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })))
    esc()
    expect(t.ui.get().tour).toBe(2)
    sync(() => t.ui.set(s => ({ ...s, picking: false })))
    esc()
    expect(t.ui.get().tour).toBeUndefined()
    expect(t.ui.get().open).toBe(true)
    t.unmount()
  })

  it('ends when the studio closes', () => {
    const t = mount({ tour: 1 })
    sync(() => t.ui.set(s => ({ ...s, open: false })))
    expect(t.ui.get().tour).toBeUndefined()
    t.unmount()
  })
})
