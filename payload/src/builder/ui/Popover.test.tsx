import { h, render, type ComponentChildren } from 'preact'
import { act } from 'preact/test-utils'
import type { Store } from '../../types'
import { BuilderContext, type UiSnapshot } from '../context'
import { observable } from '../lib/observable'
import { Popover } from './Popover'

const sync = (fn: () => void) => void act(fn)

// Popovers listen on window: unmount each test's popovers so they don't take the next test's events.
const cleanups: (() => void)[] = []
afterEach(() => {
  for (const fn of cleanups.splice(0)) fn()
})

interface Handlers {
  onClose: () => void
  onEscape?: () => void
}

function mount(handlers: Handlers, anchor = { x: 10, y: 10, width: 50, height: 20 }, children: ComponentChildren = h('button', { id: 'first' }, 'Option')) {
  const host = document.createElement('div')
  document.body.append(host)
  const root = host.attachShadow({ mode: 'open' })
  const ui = observable<UiSnapshot>({ open: true, tab: 'themes', picking: true, editingArtwork: null })
  const env = { store: {} as Store, ui, root }
  const draw = (next: Handlers | null) =>
    sync(() => render(h(BuilderContext.Provider, { value: env }, next && h(Popover, { anchor, label: 'Style it', ...next, children })), root))
  draw(handlers)
  cleanups.push(() => {
    draw(null)
    host.remove()
  })
  return { root, rerender: (next: Handlers) => draw(next) }
}

const esc = () => new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, composed: true })

describe('Popover', () => {
  it('focuses itself rather than its first option (no focus ring that looks like a selection)', () => {
    const { root } = mount({ onClose: vi.fn() })
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

  it('keeps focus on the control being edited when it re-renders with new handlers', () => {
    const { root, rerender } = mount({ onClose: vi.fn(), onEscape: () => undefined })
    const option = root.querySelector<HTMLElement>('#first')
    option?.focus()
    rerender({ onClose: vi.fn(), onEscape: () => undefined })
    expect(root.activeElement).toBe(option)
  })

  it('calls the latest Esc handler after re-rendering', () => {
    const first = vi.fn()
    const latest = vi.fn()
    const { rerender } = mount({ onClose: vi.fn(), onEscape: first })
    rerender({ onClose: vi.fn(), onEscape: latest })
    sync(() => document.body.dispatchEvent(esc()))
    expect(first).not.toHaveBeenCalled()
    expect(latest).toHaveBeenCalledTimes(1)
  })

  it('lets a nested field that handles Esc itself win', () => {
    const onEscape = vi.fn()
    const field = h('input', {
      id: 'hex',
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === 'Escape') e.stopPropagation()
      },
    })
    const { root } = mount({ onClose: vi.fn(), onEscape }, undefined, field)
    sync(() => root.querySelector('#hex')?.dispatchEvent(esc()))
    expect(onEscape).not.toHaveBeenCalled()
    sync(() => root.querySelector('[role="dialog"]')?.dispatchEvent(esc()))
    expect(onEscape).toHaveBeenCalledTimes(1)
  })

  it('does not let Esc inside it reach the rest of the page', () => {
    const below = vi.fn()
    window.addEventListener('keydown', below)
    const { root } = mount({ onClose: vi.fn(), onEscape: vi.fn() })
    sync(() => root.querySelector('[role="dialog"]')?.dispatchEvent(esc()))
    window.removeEventListener('keydown', below)
    expect(below).not.toHaveBeenCalled()
  })

  it('returns focus to the control inside the shadow root that opened it', () => {
    const host = document.createElement('div')
    document.body.append(host)
    const root = host.attachShadow({ mode: 'open' })
    const opener = document.createElement('button')
    root.append(opener)
    opener.focus()
    const ui = observable<UiSnapshot>({ open: true, tab: 'themes', picking: true, editingArtwork: null })
    const mountPoint = document.createElement('div')
    root.append(mountPoint)
    const anchor = { x: 10, y: 10, width: 50, height: 20 }
    sync(() => render(h(BuilderContext.Provider, { value: { store: {} as Store, ui, root } }, h(Popover, { anchor, label: 'Style it', onClose: vi.fn(), children: 'x' })), mountPoint))
    expect(root.activeElement).not.toBe(opener)
    sync(() => render(null, mountPoint))
    expect(root.activeElement).toBe(opener)
    host.remove()
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
    const { root } = mount({ onClose: vi.fn() }, anchor)
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
