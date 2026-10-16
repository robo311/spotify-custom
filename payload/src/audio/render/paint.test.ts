import { describe, expect, it } from 'vitest'
import { defaultReactiveLook } from '../../theme/model'
import type { AudioLevels } from '../envelope'
import { AUDIO_BANDS } from '../frame'
import { BACKDROP_HEIGHT, BACKDROP_WIDTH, CORE, createBackdropPainter, HALO, lightGeometry } from './backdrop-paint'
import type { PaintContext } from './protocol'
import { createSpectrumPainter } from './spectrum-paint'
import { fakeCanvas } from './test-canvas'

const levels = (v: number, bass = v): AudioLevels => ({ level: v, bass, beat: 0, bands: new Float32Array(AUDIO_BANDS).fill(v) })
const context = (mutate?: (ctx: PaintContext) => void): PaintContext => {
  const ctx: PaintContext = { look: defaultReactiveLook(), accent: '#1ed760', cover: null, reducedMotion: false }
  mutate?.(ctx)
  return ctx
}
/** Applies a canvas transform [a, b, c, d, e, f] to a point. */
const apply = ([a, b, c, d, e, f]: readonly number[], x: number, y: number) => [a * x + c * y + e, b * x + d * y + f]

describe('breathing background geometry', () => {
  it("maps the unit circle onto the CSS gradient's ellipse (radii and centre as shares of the view)", () => {
    const { transform } = lightGeometry(CORE, 200, 100)
    expect(apply(transform, 0, 0)).toEqual([100, 100]) // at 50% 100%
    expect(apply(transform, 1, 0)).toEqual([100 + 0.45 * 200, 100]) // 45% of the width
    expect(apply(transform, 0, -1)).toEqual([100, 100 - 0.35 * 100]) // 35% of the height
  })

  it('fills exactly the whole canvas', () => {
    for (const light of [CORE, HALO]) {
      const { transform, fill } = lightGeometry(light, BACKDROP_WIDTH, BACKDROP_HEIGHT)
      const [x0, y0] = apply(transform, fill.x, fill.y)
      const [x1, y1] = apply(transform, fill.x + fill.width, fill.y + fill.height)
      expect(x0).toBeCloseTo(0)
      expect(y0).toBeCloseTo(0)
      expect(x1).toBeCloseTo(BACKDROP_WIDTH)
      expect(y1).toBeCloseTo(BACKDROP_HEIGHT)
    }
  })
})

describe('breathing background painter', () => {
  it('paints the two lights as a mask, then fills them with the colour', () => {
    const canvas = fakeCanvas()
    const painter = createBackdropPainter(canvas)
    expect([canvas.width, canvas.height]).toEqual([BACKDROP_WIDTH, BACKDROP_HEIGHT])
    painter.paint(levels(0.8), context(c => (c.look.background.intensity = 100)))
    expect(canvas.calls.filter(c => c === 'createRadialGradient')).toHaveLength(2)
    expect(canvas.calls.filter(c => c === 'fillRect')).toHaveLength(3) // halo, core, colour
  })

  it("doesn't repaint an unchanged light, and clears once when it goes dark", () => {
    const canvas = fakeCanvas()
    const painter = createBackdropPainter(canvas)
    const ctx = context()
    painter.paint(levels(0), ctx)
    expect(canvas.calls).toHaveLength(0) // starts dark: nothing to clear
    painter.paint(levels(0.5), ctx)
    const painted = canvas.calls.length
    painter.paint(levels(0.5), ctx)
    expect(canvas.calls).toHaveLength(painted)
    painter.paint(levels(0), ctx)
    painter.paint(levels(0), ctx)
    expect(canvas.calls.slice(painted)).toEqual(['setTransform', 'clearRect'])
  })

  it('repaints when only the colour changes', () => {
    const canvas = fakeCanvas()
    const painter = createBackdropPainter(canvas)
    painter.paint(levels(0.5), context())
    const painted = canvas.calls.length
    painter.paint(levels(0.5), context(c => (c.accent = '#ff0000')))
    expect(canvas.calls.length).toBeGreaterThan(painted)
  })
})

describe('spectrum painter', () => {
  it('sizes the canvas for the device pixel ratio', () => {
    const canvas = fakeCanvas()
    createSpectrumPainter(canvas).size(400, 2)
    expect([canvas.width, canvas.height]).toEqual([800, 72])
  })

  it('draws the played part solid and the rest faded', () => {
    const canvas = fakeCanvas()
    const painter = createSpectrumPainter(canvas)
    painter.size(400, 1)
    painter.played(0.5)
    painter.paint(levels(0.6), context(), 33)
    const solid = canvas.alphas.filter(a => a === 1).length
    expect(solid).toBe(AUDIO_BANDS / 2)
    expect(canvas.alphas.length - solid).toBe(AUDIO_BANDS / 2)
  })

  it('leaves a blank canvas alone while silent (no new frame)', () => {
    const canvas = fakeCanvas()
    const painter = createSpectrumPainter(canvas)
    painter.size(400, 1)
    painter.paint(levels(0), context(), 33)
    expect(canvas.calls).toHaveLength(0)
    painter.paint(levels(0.6), context(), 33)
    painter.paint(levels(0), context(), 33)
    const cleared = canvas.calls.length
    painter.paint(levels(0), context(), 33)
    expect(canvas.calls).toHaveLength(cleared)
  })
})
