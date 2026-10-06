import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import type { Store } from '../../types'
import { BuilderContext, type UiSnapshot } from '../context'
import { observable } from '../lib/observable'
import { Popover } from './Popover'

const sync = (fn: () => void) => void act(fn)

function mount(handlers: { onClose: () => void; onEscape?: () => void }, anchor = { x: 10, y: 10, width: 50, height: 20 }) {
  const host = document.createElement('div')
  document.body.append(host)
  const root = host.attachShadow({ mode: 'open' })
  const ui = observable<UiSnapshot>({ open: true, tab: 'parts', picking: true, editingArtwork: null })
  sync(() =>
    render(
      h(
        BuilderContext.Provider,
        { value: { store: {} as Store, ui, root } },
        h(Popover, { anchor, label: 'Style it', ...handlers, children: h('button', { id: 'first' }, 'Option') }),
      ),
      root,
    ),
  )
  return root
}

describe('Popover', () => {
  it('focuses itself rather than its first option (no focus ring that looks like a selection)', () => {
    const root = mount({ onClose: vi.fn() })
    expect(root.activeElement).toBe(root.querySelector('[role="dialog"]'))
  })

  it('reports Esc separately from pressing outside', () => {
    const onClose = vi.fn()
    const onEscape = vi.fn()
    mount({ onClose, onEscape })
    sync(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
    expect(onEscape).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
    sync(() => document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true })))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('re-places itself when its content grows, so it never runs off the window', () => {
    let resized: (() => void) | null = null
    const RO = globalThis.ResizeObserver
    globalThis.ResizeObserver = class {
      constructor(cb: () => void) {
        resized = cb
      }
      observe = () => undefined
      disconnect = () => undefined
      unobserve = () => undefined
    } as unknown as typeof ResizeObserver
    const height = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(200)
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(300)
    // A part near the bottom of the window (the player bar): the dialog opens above it.
    const anchor = { x: 100, y: innerHeight - 80, width: 400, height: 70 }
    const root = mount({ onClose: vi.fn() }, anchor)
    const dialog = () => root.querySelector<HTMLElement>('[role="dialog"]')
    const top = () => parseFloat(dialog()?.style.top ?? 'NaN')
    expect(top() + 200).toBeLessThanOrEqual(anchor.y)

    height.mockReturnValue(520)
    sync(() => resized?.())
    expect(top() + 520).toBeLessThanOrEqual(anchor.y)
    expect(top()).toBeGreaterThanOrEqual(0)
    globalThis.ResizeObserver = RO
    vi.restoreAllMocks()
  })
})
