import { describe, expect, it } from 'vitest'
import { canvasWidthFor } from './canvas-size'

describe('canvasWidthFor', () => {
  it('asks for the width a portrait Canvas needs to cover the box, in device pixels', () => {
    // a wide, short box: its width decides
    expect(canvasWidthFor(320, 384, 2)).toBe(640)
    // the tall column without Up next: covering 773px of height takes 435px of a 9:16 video's width
    expect(canvasWidthFor(320, 773, 1)).toBe(435)
    expect(canvasWidthFor(320, 773, 2)).toBe(870)
  })
})
