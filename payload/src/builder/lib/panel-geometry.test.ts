import { MIN_HEIGHT, clampRect, floatingHeight, dockedRect, inDockZone, isPlacement, resizeFromCorner, resizeFromLeft, snapRect, viewportBounds } from './panel-geometry'

const b = viewportBounds(1000, 800) // 8..992 × 8..792

describe('clampRect', () => {
  it('keeps the panel inside the window', () => {
    expect(clampRect({ x: -50, y: 900, width: 300, height: 400 }, b)).toEqual({ x: 8, y: 392, width: 300, height: 400 })
    expect(clampRect({ x: 900, y: -5, width: 300, height: 400 }, b)).toEqual({ x: 692, y: 8, width: 300, height: 400 })
  })

  it('shrinks to fit a window that got smaller, but not below the minimum', () => {
    const small = viewportBounds(500, 500)
    expect(clampRect({ x: 100, y: 0, width: 384, height: 900 }, small)).toEqual({ x: 100, y: 8, width: 384, height: 484 })
    expect(clampRect({ x: 0, y: 0, width: 384, height: 100 }, b).height).toBe(MIN_HEIGHT)
  })
})

describe('snapRect', () => {
  it('pulls edges within the snap distance onto the window edges', () => {
    expect(snapRect({ x: 20, y: 790 - 400 - 10, width: 300, height: 400 }, b)).toEqual({ x: 8, y: 392, width: 300, height: 400 })
  })

  it('leaves the panel alone in the middle', () => {
    const r = { x: 300, y: 200, width: 300, height: 300 }
    expect(snapRect(r, b)).toEqual(r)
  })
})

describe('docking', () => {
  it('detects a drop near the right edge', () => {
    expect(inDockZone({ x: 600, y: 100, width: 360, height: 400 }, b)).toBe(true)
    expect(inDockZone({ x: 400, y: 100, width: 360, height: 400 }, b)).toBe(false)
  })

  it('docks between the top bar and the player bar', () => {
    expect(dockedRect(384, 1000, { top: 72, bottom: 96 }, 800)).toEqual({ x: 608, y: 72, width: 384, height: 632 })
  })

  it('never gets a negative height in a tiny window', () => {
    expect(dockedRect(384, 1000, { top: 72, bottom: 96 }, 80).height).toBe(0)
  })
})

describe('resizing', () => {
  const r = { x: 500, y: 100, width: 384, height: 500 }

  it('from the left edge keeps the right edge fixed', () => {
    const next = resizeFromLeft(r, 450, 340, 640)
    expect(next.x + next.width).toBe(884)
    expect(next.width).toBe(434)
    expect(resizeFromLeft(r, 0, 340, 640).width).toBe(640)
  })

  it('from the corner keeps the top-left fixed and respects limits', () => {
    expect(resizeFromCorner(r, { x: 950, y: 700 }, 340, 640, b)).toEqual({ x: 500, y: 100, width: 450, height: 600 })
    expect(resizeFromCorner(r, { x: 2000, y: 2000 }, 340, 640, b)).toEqual({ x: 500, y: 100, width: 492, height: 692 })
    expect(resizeFromCorner(r, { x: 0, y: 0 }, 340, 640, b)).toEqual({ x: 500, y: 100, width: 340, height: MIN_HEIGHT })
  })
})

describe('isPlacement', () => {
  it('accepts docked and well-formed floating placements only', () => {
    expect(isPlacement({ mode: 'docked' })).toBe(true)
    expect(isPlacement({ mode: 'floating', x: 1, y: 2, height: 400 })).toBe(true)
    expect(isPlacement({ mode: 'floating', x: 1 })).toBe(false)
    expect(isPlacement('docked')).toBe(false)
  })
})

describe('floatingHeight', () => {
  it('shortens a full-height panel when it starts floating, within limits', () => {
    expect(floatingHeight(956, 1116)).toBe(804)
    expect(floatingHeight(500, 1116)).toBe(500)
    expect(floatingHeight(956, 400)).toBe(MIN_HEIGHT)
  })
})
