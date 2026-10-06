import type { ShelfInfo } from '../../types'
import { moveItem, nextOrder, orderByKeys } from './reorder'

const shelf = (key: string): ShelfInfo => ({ key, title: key.toUpperCase(), stable: true })
const keys = (list: ShelfInfo[]) => list.map(s => s.key)

describe('orderByKeys', () => {
  const shelves = ['a', 'b', 'c', 'd'].map(shelf)

  it('keeps natural order without a saved order', () => {
    expect(keys(orderByKeys(shelves, []))).toEqual(['a', 'b', 'c', 'd'])
  })

  it('puts saved keys first, then the rest naturally', () => {
    expect(keys(orderByKeys(shelves, ['c', 'a']))).toEqual(['c', 'a', 'b', 'd'])
  })

  it('ignores saved keys for shelves that are not on Home now', () => {
    expect(keys(orderByKeys(shelves, ['x', 'd']))).toEqual(['d', 'a', 'b', 'c'])
  })
})

describe('moveItem', () => {
  it('moves down and up', () => {
    expect(moveItem([1, 2, 3, 4], 0, 2)).toEqual([2, 3, 1, 4])
    expect(moveItem([1, 2, 3, 4], 3, 0)).toEqual([4, 1, 2, 3])
  })

  it('clamps the target and ignores invalid sources', () => {
    expect(moveItem([1, 2, 3], 0, 99)).toEqual([2, 3, 1])
    expect(moveItem([1, 2, 3], 5, 0)).toEqual([1, 2, 3])
  })

  it('does not mutate the input', () => {
    const list = [1, 2, 3]
    moveItem(list, 0, 2)
    expect(list).toEqual([1, 2, 3])
  })
})

describe('nextOrder', () => {
  it('keeps remembered keys of shelves that are not visible today', () => {
    expect(nextOrder(['gone', 'b'], [shelf('b'), shelf('a')])).toEqual(['b', 'a', 'gone'])
  })
})
