import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import type { AppState, BarLayer, Store, Theme } from '../../types'
import { BuilderContext, type UiSnapshot } from '../context'
import { observable } from '../lib/observable'
import { lookup } from '../lib/record'
import { defaultBarLayer } from '../../theme/model'
import { ArrangeLayer } from './ArrangeLayer'
import type * as BarLayers from '../../bar-layers'

interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}
const rects = vi.hoisted(() => new Map<string, Rect>())
const previews = vi.hoisted(() => [] as BarLayer[])
vi.mock('../../bar-layers', async importOriginal => {
  const real = await importOriginal<typeof BarLayers>()
  const fake = (r: Rect) => ({ getBoundingClientRect: () => ({ ...r, width: r.right - r.left, height: r.bottom - r.top }) }) as unknown as HTMLElement
  return {
    ...real,
    layerElement: (_part: string, id: string) => {
      const r = rects.get(id)
      return r ? fake(r) : null
    },
    previewLayer: (_part: string, layer: BarLayer) => previews.push(layer),
  }
})

const sync = (fn: () => void) => void act(fn)
const frames = () => act(async () => await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))))
const layer = (id: string, over: Partial<BarLayer> = {}): BarLayer => ({ ...defaultBarLayer(id), name: id, src: { builtin: 'planet' }, ...over })
const pointer = (type: string, x: number, y: number) => new PointerEvent(type, { clientX: x, clientY: y, button: 0, pointerId: 1, bubbles: true, composed: true })

async function mount(uiState: Partial<UiSnapshot> = {}) {
  previews.length = 0
  rects.clear()
  rects.set('sky', { left: 0, top: 0, right: 1000, bottom: 64 })
  rects.set('moon', { left: 470, top: 0, right: 530, bottom: 64 })
  document.body.innerHTML = '<div data-testid="global-nav-bar"></div>'
  const bar = document.querySelector('[data-testid="global-nav-bar"]')
  if (bar) bar.getBoundingClientRect = () => ({ left: 0, top: 0, right: 1000, bottom: 64, width: 1000, height: 64 }) as DOMRect

  const theme = { id: 'mine', layout: { hidden: [] }, iconOverrides: {}, parts: { topBar: { layers: [layer('sky'), layer('moon', { fit: 'free' })] } } } as unknown as Theme
  const state = observable({ active: theme, activeIsPreset: false, userThemes: [theme] } as unknown as AppState)
  const edit = vi.fn((fn: (t: Theme) => void, _opts?: { coalesceKey?: string }) => {
    const next = structuredClone(state.get().active)
    fn(next)
    state.set({ ...state.get(), active: next })
  })
  const store = { get: () => state.get(), subscribe: (fn: (s: AppState) => void) => state.subscribe(fn), edit } as unknown as Store
  const host = document.createElement('div')
  document.body.append(host)
  const root = host.attachShadow({ mode: 'open' })
  const ui = observable<UiSnapshot>({ open: true, tab: 'topbar', picking: false, editingArtwork: null, arranging: 'topBar', ...uiState })
  sync(() => render(h(BuilderContext.Provider, { value: { store, ui, root } }, h(ArrangeLayer, { partId: 'topBar' })), root))
  await frames()
  const layers = () => lookup(store.get().active.parts, 'topBar')?.layers ?? []
  const box = (id: string) => {
    const el = root.querySelector(`[data-layer="${id}"]`)
    if (!el) throw new Error(`no box ${id}`)
    return el
  }
  const button = (text: string) => {
    const el = [...root.querySelectorAll('button')].find(b => b.textContent.trim() === text)
    if (!el) throw new Error(`no button ${text}`)
    return el
  }
  return { root, ui, edit, layers, box, button, unmount: () => sync(() => render(null, root)) }
}

describe('ArrangeLayer', () => {
  it('frames every visible layer, lists them top first and pauses window dragging until it closes', async () => {
    const t = await mount()
    expect(t.box('sky')).toBeTruthy()
    expect(t.box('moon')).toBeTruthy()
    expect([...t.root.querySelectorAll('.b-arr__chip')].map(c => c.textContent)).toEqual(['moon', 'sky'])
    expect(document.getElementById('sc-pick-no-drag')).not.toBeNull()
    t.unmount()
    expect(document.getElementById('sc-pick-no-drag')).toBeNull()
  })

  it('starts with the top layer selected', async () => {
    const t = await mount()
    expect(t.ui.get().layer).toEqual({ part: 'topBar', id: 'moon' })
  })

  it('previews a drag live and saves it once on release, as one undo step', async () => {
    const t = await mount()
    sync(() => t.box('moon').dispatchEvent(pointer('pointerdown', 500, 32)))
    sync(() => window.dispatchEvent(pointer('pointermove', 550, 32)))
    sync(() => window.dispatchEvent(pointer('pointermove', 600, 64)))
    expect(previews.at(-1)).toMatchObject({ id: 'moon', x: 60, y: 100 })
    expect(t.edit).not.toHaveBeenCalled()
    sync(() => window.dispatchEvent(pointer('pointerup', 600, 64)))
    expect(t.edit).toHaveBeenCalledTimes(1)
    expect(t.edit.mock.calls[0]?.[1]).toEqual({ coalesceKey: 'layers.topBar.moon.move' })
    expect(t.layers()[1]).toMatchObject({ x: 60, y: 100 })
  })

  it('selects the layer under the pointer', async () => {
    const t = await mount()
    sync(() => t.box('sky').dispatchEvent(pointer('pointerdown', 100, 32)))
    sync(() => window.dispatchEvent(pointer('pointerup', 100, 32)))
    expect(t.ui.get().layer?.id).toBe('sky')
  })

  it('resizes the selected free layer from a corner', async () => {
    const t = await mount()
    const handle = t.box('moon').querySelector('[data-corner="se"]')
    if (!handle) throw new Error('no handle')
    sync(() => handle.dispatchEvent(pointer('pointerdown', 530, 64)))
    sync(() => window.dispatchEvent(pointer('pointermove', 560, 96)))
    sync(() => window.dispatchEvent(pointer('pointerup', 560, 96)))
    expect(t.layers()[1]?.size).toBeGreaterThan(150)
  })

  it('nudges the selected layer with the arrow keys', async () => {
    const t = await mount()
    sync(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
    sync(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true })))
    expect(t.layers()[1]).toMatchObject({ x: 51, y: 60 })
  })

  it('Cancel puts the layers back as they were and closes; Done keeps them', async () => {
    const t = await mount()
    sync(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
    sync(() => t.button('Cancel').click())
    expect(t.layers()[1]?.x).toBe(50)
    expect(t.ui.get().arranging).toBeUndefined()

    const u = await mount()
    sync(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
    sync(() => u.button('Done').click())
    expect(u.layers()[1]?.x).toBe(51)
    expect(u.ui.get().arranging).toBeUndefined()
  })

  it('Esc closes and keeps the changes', async () => {
    const t = await mount()
    sync(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
    sync(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(t.ui.get().arranging).toBeUndefined()
    expect(t.layers()[1]?.x).toBe(51)
  })
})
