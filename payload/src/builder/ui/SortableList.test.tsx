import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import type { Store } from '../../types'
import { BuilderContext, type UiSnapshot } from '../context'
import { observable } from '../lib/observable'
import { SortableList, type SortableItem } from './SortableList'

/** Preact's act flushes synchronous updates immediately; its return type also admits async callbacks. */
const sync = (fn: () => void) => void act(fn)

const items: SortableItem[] = [
  { key: 'a', title: 'Alpha' },
  { key: 'b', title: 'Beta', note: 'Changes daily' },
  { key: 'c', title: 'Gamma' },
]

function mount(props: Partial<Parameters<typeof SortableList>[0]> = {}) {
  const host = document.createElement('div')
  document.body.append(host)
  const root = host.attachShadow({ mode: 'open' })
  const onReorder = vi.fn()
  const onToggleHidden = vi.fn()
  const env = { store: {} as Store, ui: observable<UiSnapshot>({ open: true, tab: 'home', picking: false, editingArtwork: null }), root }
  sync(() => {
    render(h(BuilderContext.Provider, { value: env }, h(SortableList, { label: 'Things', items, hidden: ['c'], onReorder, onToggleHidden, ...props })), root)
  })
  return { root, onReorder, onToggleHidden }
}

describe('SortableList', () => {
  it('renders titles, notes and hidden state', () => {
    const { root } = mount()
    const rows = [...root.querySelectorAll('li')]
    expect(rows.map(r => r.querySelector('.b-sort__title')?.textContent)).toEqual(['Alpha', 'Beta', 'Gamma'])
    expect(rows[1].textContent).toContain('Changes daily')
    expect(rows.map(r => r.dataset.hidden)).toEqual(['false', 'false', 'true'])
  })

  it('moves an item with Alt+arrow keys', () => {
    const { root, onReorder } = mount()
    const handle = root.querySelectorAll<HTMLElement>('.b-sort__handle')[0]
    sync(() => {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }))
    })
    expect((onReorder.mock.calls[0]?.[0] as SortableItem[]).map(i => i.key)).toEqual(['b', 'a', 'c'])
  })

  it('ignores plain arrows (so the list stays scrollable) and never moves past the top', () => {
    const { root, onReorder } = mount()
    const handles = root.querySelectorAll<HTMLElement>('.b-sort__handle')
    sync(() => {
      handles[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      handles[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true }))
    })
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('toggles visibility', () => {
    const { root, onToggleHidden } = mount()
    const buttons = root.querySelectorAll<HTMLButtonElement>('.b-icon-btn')
    sync(() => buttons[2].click())
    expect(onToggleHidden).toHaveBeenCalledWith('c', false)
  })
})
