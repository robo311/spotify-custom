import { findHistoryInFiber, isSpotifyHistory } from './router'

const history = () => ({ push: vi.fn(), listen: vi.fn(() => () => undefined), location: { pathname: '/' } })

describe('findHistoryInFiber', () => {
  it('finds the router history breadth-first among props', () => {
    const target = history()
    const tree = {
      memoizedProps: { children: [] },
      child: {
        memoizedProps: { store: {} },
        sibling: { memoizedProps: { navigator: target } },
        child: { memoizedProps: { history: history() } },
      },
    }
    expect(findHistoryInFiber(tree)).toBe(target)
  })

  it('returns null when there is no router', () => {
    expect(findHistoryInFiber({ memoizedProps: {}, child: { memoizedProps: { history: {} } } })).toBeNull()
    expect(findHistoryInFiber(null)).toBeNull()
  })
})

describe('isSpotifyHistory', () => {
  it('requires push, listen and a location pathname', () => {
    expect(isSpotifyHistory(history())).toBe(true)
    expect(isSpotifyHistory({ push: vi.fn(), listen: vi.fn() })).toBe(false)
  })
})
