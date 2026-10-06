import { describe, expect, it } from 'vitest'
import { COALESCE_MS, History } from './history'

describe('History', () => {
  it('undoes and redoes snapshots in order', () => {
    const h = new History<number>()
    h.record(1)
    h.record(2)
    expect(h.undo(3)).toBe(2)
    expect(h.undo(2)).toBe(1)
    expect(h.canUndo).toBe(false)
    expect(h.redo(1)).toBe(2)
    expect(h.redo(2)).toBe(3)
    expect(h.canRedo).toBe(false)
  })

  it('collapses edits with the same key inside the window into one step', () => {
    const h = new History<string>()
    h.record('a', 'accent', 0)
    h.record('b', 'accent', COALESCE_MS - 1)
    h.record('c', 'accent', 2 * COALESCE_MS - 2)
    expect(h.undo('d')).toBe('a')
    expect(h.canUndo).toBe(false)
  })

  it('starts a new step when the key changes or the window passes', () => {
    const h = new History<string>()
    h.record('a', 'accent', 0)
    h.record('b', 'radius', 10)
    h.record('c', 'radius', 10 + COALESCE_MS)
    expect(h.undo('d')).toBe('c')
    expect(h.undo('c')).toBe('b')
    expect(h.undo('b')).toBe('a')
  })

  it('drops the redo stack on a new edit and respects the limit', () => {
    const h = new History<number>(2)
    h.record(1)
    h.record(2)
    h.record(3)
    expect(h.undo(4)).toBe(3)
    h.record(9)
    expect(h.canRedo).toBe(false)
    expect(h.undo(10)).toBe(9)
    expect(h.undo(9)).toBe(2)
    expect(h.undo(2)).toBeUndefined()
  })
})
