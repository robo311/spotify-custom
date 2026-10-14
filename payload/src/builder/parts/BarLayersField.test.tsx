import { h, render } from 'preact'
import { act } from 'preact/test-utils'
import type { AppState, BarLayer, Store, Theme } from '../../types'
import { BuilderContext, type UiSnapshot } from '../context'
import { observable } from '../lib/observable'
import { lookup } from '../lib/record'
import { BAR_LAYER_MAX_CHARS, defaultBarLayer } from '../../theme/model'
import { BarLayersField } from './BarLayersField'

const files = vi.hoisted(() => ({ pickFile: vi.fn<() => Promise<File | null>>() }))
const art = vi.hoisted(() => ({ bannerToDataUrl: vi.fn<(file: Blob, budget: number) => Promise<string>>() }))
vi.mock('../lib/files', () => files)
vi.mock('../../art', async importOriginal => ({ ...(await importOriginal<object>()), bannerToDataUrl: art.bannerToDataUrl }))

const sync = (fn: () => void) => void act(fn)
const flush = () => act(async () => await new Promise(r => setTimeout(r, 0)))
const WEBP = 'data:image/webp;base64,UklGRg=='
const layer = (id: string, over: Partial<BarLayer> = {}): BarLayer => ({ ...defaultBarLayer(id), name: id, src: { data: WEBP }, ...over })

function mount(initial: BarLayer[] = [], uiState: Partial<UiSnapshot> = {}) {
  const theme = { palette: { surface: '#000000' }, parts: initial.length ? { topBar: { layers: initial } } : {} } as unknown as Theme
  const state = observable({ active: theme } as unknown as AppState)
  const edit = vi.fn((fn: (t: Theme) => void) => {
    fn(theme)
    state.set({ ...state.get(), active: { ...theme } })
  })
  const store = { get: () => state.get(), subscribe: (fn: (s: AppState) => void) => state.subscribe(fn), edit } as unknown as Store
  const host = document.createElement('div')
  const root = host.attachShadow({ mode: 'open' })
  const ui = observable<UiSnapshot>({ open: true, tab: 'topbar', picking: false, editingArtwork: null, ...uiState })
  sync(() => render(h(BuilderContext.Provider, { value: { store, ui, root } }, h(BarLayersField, { partId: 'topBar' })), root))
  const button = (label: string) => {
    const found = [...root.querySelectorAll('button')].find(b => b.textContent.trim() === label || b.getAttribute('aria-label') === label)
    if (!found) throw new Error(`no button "${label}"`)
    return found
  }
  const slider = (label: string) => {
    const l = [...root.querySelectorAll('label')].find(el => el.textContent === label)
    const input = root.getElementById(l?.htmlFor ?? '')
    if (!(input instanceof HTMLInputElement)) throw new Error(`no slider "${label}"`)
    return input
  }
  const layers = () => lookup(theme.parts, 'topBar')?.layers ?? []
  return { root, ui, button, slider, layers }
}

async function upload(t: ReturnType<typeof mount>, data = WEBP, name = 'moon.png') {
  files.pickFile.mockResolvedValue(new File(['x'], name, { type: 'image/png' }))
  art.bannerToDataUrl.mockResolvedValue(data)
  sync(() => t.button('Add picture').click())
  await flush()
}

describe('BarLayersField', () => {
  beforeEach(() => {
    files.pickFile.mockReset()
    art.bannerToDataUrl.mockReset()
  })

  it('suggests a picture size and offers only uploading while empty', () => {
    const { root } = mount()
    expect(root.textContent).toMatch(/2400 × 160 px/)
    expect([...root.querySelectorAll('button')].map(b => b.textContent.trim())).toEqual(['Add picture'])
  })

  it('adds the first picture filling the bar and later ones free to place, each selected once added', async () => {
    const t = mount()
    await upload(t)
    expect(t.layers()).toEqual([{ ...defaultBarLayer('layer-1'), name: 'moon', src: { data: WEBP } }])
    await upload(t, WEBP, 'cloud.webp')
    expect(t.layers()[1]).toMatchObject({ id: 'layer-2', name: 'cloud', fit: 'free' })
    expect(t.ui.get().layer).toEqual({ part: 'topBar', id: 'layer-2' })
  })

  it('stops at five pictures', () => {
    const t = mount(['a', 'b', 'c', 'd', 'e'].map(id => layer(id)))
    expect(t.button('Add picture').disabled).toBe(true)
  })

  it('encodes within what is left of the theme’s picture allowance, and says when there is no room', async () => {
    const big = 'data:image/webp;base64,' + 'A'.repeat(220_000)
    const t = mount([layer('a', { src: { data: big } }), layer('b', { src: { data: big } }), layer('c', { src: { data: big } })])
    await upload(t)
    expect(art.bannerToDataUrl).not.toHaveBeenCalled()
    expect(t.root.querySelector('[role="alert"]')?.textContent).toMatch(/no room/i)
  })

  it('explains instead of saving a picture that is still too big', async () => {
    const t = mount()
    await upload(t, 'data:image/webp;base64,' + 'A'.repeat(BAR_LAYER_MAX_CHARS))
    expect(t.layers()).toEqual([])
    expect(t.root.querySelector('[role="alert"]')?.textContent).toMatch(/too detailed/)
  })

  it('lists layers top first; hides, reorders and deletes them', () => {
    const t = mount([layer('sky'), layer('moon')])
    const names = () => [...t.root.querySelectorAll('.b-layer__name')].map(el => el.textContent)
    expect(names()).toEqual(['moon', 'sky'])
    sync(() => t.button('Hide sky').click())
    expect(t.layers()[0]?.hidden).toBe(true)
    sync(() => t.button('Move sky up').click())
    expect(t.layers().map(l => l.id)).toEqual(['moon', 'sky'])
    sync(() => t.button('Delete moon').click())
    expect(t.layers().map(l => l.id)).toEqual(['sky'])
  })

  it('edits the selected layer: fit re-centres it, sliders and fade change only it', () => {
    const t = mount([layer('sky'), layer('moon', { fit: 'free', x: 130 })], { layer: { part: 'topBar', id: 'moon' } })
    const opacity = t.slider('Opacity')
    opacity.value = '30'
    sync(() => opacity.dispatchEvent(new Event('input', { bubbles: true })))
    expect(t.layers()[1]?.opacity).toBe(30)
    expect(t.layers()[0]?.opacity).toBe(100)
    sync(() => t.button('Both').click())
    expect(t.layers()[1]?.fade).toBe('both')
    sync(() => t.button('Fill').click())
    expect(t.layers()[1]).toMatchObject({ fit: 'fill', x: 50, size: 100 })
  })

  it('selects a layer by clicking its row', () => {
    const t = mount([layer('sky'), layer('moon')])
    sync(() => t.button('sky').click())
    expect(t.ui.get().layer).toEqual({ part: 'topBar', id: 'sky' })
  })

  it('starts arranging this bar on the real bar', () => {
    const t = mount([layer('sky')], { picking: true })
    sync(() => t.button('Arrange on the bar').click())
    expect(t.ui.get()).toMatchObject({ arranging: 'topBar', picking: false })
  })
})
