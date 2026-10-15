import { describe, expect, it } from 'vitest'
import { edge, jump, step } from './nav'

// Add, ---, (disabled), Album, Artist, Share
const ROWS = ['Add', null, null, 'Album', 'Artist', 'Share']

describe('step', () => {
  it('skips rows you cannot land on and wraps around', () => {
    expect(step(ROWS, 0, 1)).toBe(3)
    expect(step(ROWS, 3, -1)).toBe(0)
    expect(step(ROWS, 5, 1)).toBe(0)
    expect(step(ROWS, 0, -1)).toBe(5)
  })

  it('starts at the first or last row when nothing is selected', () => {
    expect(step(ROWS, -1, 1)).toBe(0)
    expect(step(ROWS, -1, -1)).toBe(5)
    expect(step([null, null], -1, 1)).toBe(-1)
  })
})

it('edge finds the first and last selectable rows', () => {
  expect(edge([null, 'a', 'b', null], 'first')).toBe(1)
  expect(edge([null, 'a', 'b', null], 'last')).toBe(2)
})

describe('jump', () => {
  it('cycles through rows starting with a letter, case-insensitively', () => {
    expect(jump(ROWS, 0, 'a')).toBe(3)
    expect(jump(ROWS, 3, 'A')).toBe(4)
    expect(jump(ROWS, 4, 'a')).toBe(0)
  })

  it('stays put when no row matches', () => {
    expect(jump(ROWS, 3, 'z')).toBe(3)
  })
})
