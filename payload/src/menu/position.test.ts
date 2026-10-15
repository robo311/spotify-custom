import { describe, expect, it } from 'vitest'
import { place } from './position'

const VIEW = { width: 1000, height: 800 }
const SIZE = { width: 240, height: 300 }

describe('place at a point', () => {
  it('opens down-right of the cursor', () => {
    expect(place(SIZE, { kind: 'point', x: 100, y: 100 }, VIEW)).toEqual({ x: 100, y: 100, flippedUp: false })
  })

  it('flips left and up near the right and bottom edges', () => {
    expect(place(SIZE, { kind: 'point', x: 900, y: 700 }, VIEW)).toEqual({ x: 660, y: 400, flippedUp: true })
  })

  it('clamps a panel taller than the room on either side', () => {
    const tall = { width: 240, height: 700 }
    expect(place(tall, { kind: 'point', x: 100, y: 400 }, VIEW)).toEqual({ x: 100, y: 92, flippedUp: false })
  })
})

describe('place beside a row', () => {
  const rect = { left: 300, right: 540, top: 200, bottom: 232 }

  it('opens to the right, its first row level with the trigger', () => {
    expect(place(SIZE, { kind: 'beside', rect }, VIEW)).toEqual({ x: 536, y: 196, flippedUp: false })
  })

  it('opens to the left without room on the right', () => {
    expect(place(SIZE, { kind: 'beside', rect: { ...rect, left: 700, right: 940 } }, VIEW).x).toBe(464)
  })

  it('slides up to stay inside the window', () => {
    expect(place(SIZE, { kind: 'beside', rect: { ...rect, top: 700, bottom: 732 } }, VIEW).y).toBe(492)
  })
})
