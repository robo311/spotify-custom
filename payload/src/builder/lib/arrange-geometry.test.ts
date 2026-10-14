import { describe, expect, it } from 'vitest'
import type { BarLayer } from '../../types'
import { BAR_LAYER_SIZE, BAR_LAYER_X, BAR_LAYER_Y, defaultBarLayer } from '../../theme/model'
import { dragLayer, nudgeLayer, resizeLayer, topLayerAt, wheelLayer } from './arrange-geometry'

const bar = { width: 1000, height: 64 }
const layer = (over: Partial<BarLayer> = {}): BarLayer => ({ ...defaultBarLayer('a'), src: { builtin: 'planet' }, fit: 'free', ...over })

describe('dragLayer', () => {
  it('moves free and tiled layers with the pointer, in % of the bar', () => {
    expect(dragLayer(layer({ x: 50, y: 50 }), 100, 32, bar)).toEqual({ x: 60, y: 100 })
    expect(dragLayer(layer({ fit: 'tile', x: 0, y: 50 }), -50, 0, bar)).toEqual({ x: -5, y: 50 })
  })

  it('lets a free layer go well past the edges, up to the overflow limits', () => {
    expect(dragLayer(layer({ x: 50, y: 50 }), 5000, 5000, bar)).toEqual({ x: BAR_LAYER_X.max, y: BAR_LAYER_Y.max })
    expect(dragLayer(layer({ x: 50, y: 50 }), -5000, -5000, bar)).toEqual({ x: BAR_LAYER_X.min, y: BAR_LAYER_Y.min })
  })

  it('pans a fill layer the way the picture moves: dragging right shows more of its left side', () => {
    // 2000×200 picture covering 1000×64: scaled to 1000×100, so 36 px of vertical overflow and none horizontally.
    const picture = { width: 2000, height: 200 }
    expect(dragLayer(layer({ fit: 'fill', x: 50, y: 50 }), 100, 18, bar, picture)).toEqual({ x: 50, y: 0 })
    // Zoomed 2×: there is room to pan horizontally now.
    const moved = dragLayer(layer({ fit: 'fill', x: 50, y: 50, size: 200 }), 100, 0, bar, picture)
    expect(moved.x).toBeLessThan(50)
  })

  it('rounds to a tenth of a percent', () => {
    expect(dragLayer(layer({ x: 50, y: 50 }), 1, 1, bar)).toEqual({ x: 50.1, y: 51.6 })
  })
})

describe('resizeLayer', () => {
  it('scales by how far the pointer moved from the centre, within the size limits', () => {
    expect(resizeLayer(layer({ size: 100 }), 100, 50, 100)).toBe(200)
    expect(resizeLayer(layer({ size: 100 }), 100, 100, 1)).toBe(BAR_LAYER_SIZE.free.min)
    expect(resizeLayer(layer({ size: 500 }), 500, 10, 100)).toBe(BAR_LAYER_SIZE.free.max)
  })
})

describe('wheelLayer', () => {
  it('grows on scroll up, shrinks on scroll down, and zooms fill layers within their range', () => {
    expect(wheelLayer(layer({ size: 100 }), -100)).toBeGreaterThan(100)
    expect(wheelLayer(layer({ size: 100 }), 100)).toBeLessThan(100)
    expect(wheelLayer(layer({ fit: 'fill', size: 100 }), 500)).toBe(BAR_LAYER_SIZE.fill.min)
  })
})

describe('nudgeLayer', () => {
  it('nudges by 1 % or 10 % with Shift, opposite for fill (it pans the picture)', () => {
    expect(nudgeLayer(layer({ x: 50, y: 50 }), 'ArrowRight', false)).toEqual({ x: 51, y: 50 })
    expect(nudgeLayer(layer({ x: 50, y: 50 }), 'ArrowUp', true)).toEqual({ x: 50, y: 40 })
    expect(nudgeLayer(layer({ fit: 'fill', x: 50, y: 50 }), 'ArrowRight', false)).toEqual({ x: 49, y: 50 })
    expect(nudgeLayer(layer({ fit: 'fill', x: 100, y: 50 }), 'ArrowLeft', false)).toEqual({ x: 100, y: 50 })
  })
})

describe('topLayerAt', () => {
  const boxes = [
    { id: 'sky', rect: { left: 0, top: 0, right: 1000, bottom: 64 } },
    { id: 'moon', rect: { left: 400, top: -20, right: 480, bottom: 60 } },
  ]

  it('finds the topmost layer under the pointer, including parts outside the bar', () => {
    expect(topLayerAt(boxes, 420, 30, null)).toBe('moon')
    expect(topLayerAt(boxes, 420, -10, null)).toBe('moon')
    expect(topLayerAt(boxes, 100, 30, null)).toBe('sky')
    expect(topLayerAt(boxes, 100, 300, null)).toBeNull()
  })

  it('keeps the selected layer when the pointer is on it, so a layer under another can still be dragged', () => {
    expect(topLayerAt(boxes, 420, 30, 'sky')).toBe('sky')
  })
})
