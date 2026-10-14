import { describe, expect, it } from 'vitest'
import type { BarLayer, Theme } from '../../types'
import { defaultBarLayer } from '../../theme/model'
import { addLayer, layersOf, moveLayer, nextLayerId, removeLayer, setLayerFit, updateLayer, uploadedChars } from './layer-edits'

const PNG = 'data:image/png;base64,iVBORw0KGgo='
const layer = (id: string, over: Partial<BarLayer> = {}): BarLayer => ({ ...defaultBarLayer(id), src: { data: PNG }, ...over })
const theme = (layers?: BarLayer[]) => ({ parts: layers ? { topBar: { layers, text: '#ffffff' } } : {} }) as unknown as Theme
const ids = (t: Theme) => layersOf(t, 'topBar').map(l => l.id)

describe('layer edits', () => {
  it('adds on top, creating the part when needed', () => {
    const t = theme()
    addLayer('topBar', layer('layer-1'))(t)
    addLayer('topBar', layer('layer-2'))(t)
    expect(ids(t)).toEqual(['layer-1', 'layer-2'])
  })

  it('picks the first free id', () => {
    expect(nextLayerId([layer('layer-1'), layer('layer-3')])).toBe('layer-2')
    expect(nextLayerId([])).toBe('layer-1')
  })

  it('updates one layer and leaves the rest of the part alone', () => {
    const t = theme([layer('a'), layer('b')])
    updateLayer('topBar', 'b', { x: 12, hidden: true })(t)
    expect(layersOf(t, 'topBar')[1]).toMatchObject({ id: 'b', x: 12, hidden: true })
    expect(t.parts.topBar.text).toBe('#ffffff')
  })

  it('re-centres a layer when its fit changes, since positions mean different things per fit', () => {
    const t = theme([layer('a', { fit: 'free', x: 140, y: -80, size: 300 })])
    setLayerFit('topBar', 'a', 'fill')(t)
    expect(layersOf(t, 'topBar')[0]).toMatchObject({ fit: 'fill', x: 50, y: 50, size: 100 })
  })

  it('moves a layer up or down the stack, stopping at the ends', () => {
    const t = theme([layer('a'), layer('b'), layer('c')])
    moveLayer('topBar', 'a', 1)(t)
    expect(ids(t)).toEqual(['b', 'a', 'c'])
    moveLayer('topBar', 'c', 1)(t)
    expect(ids(t)).toEqual(['b', 'a', 'c'])
  })

  it('removes a layer, and the list (then the part) once empty', () => {
    const t = theme([layer('a'), layer('b')])
    removeLayer('topBar', 'a')(t)
    expect(ids(t)).toEqual(['b'])
    removeLayer('topBar', 'b')(t)
    expect(t.parts.topBar).toEqual({ text: '#ffffff' })
  })

  it('counts uploaded picture data across the theme, except the layer being replaced', () => {
    const t = theme([layer('a'), layer('b', { src: { builtin: 'planet' } })])
    t.parts.playerBar = { layers: [layer('c')] }
    expect(uploadedChars(t)).toBe(PNG.length * 2)
    expect(uploadedChars(t, { part: 'topBar', id: 'a' })).toBe(PNG.length)
  })
})
