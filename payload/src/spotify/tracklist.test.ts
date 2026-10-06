import { describe, expect, it } from 'vitest'
import { trackUriOfRow } from './tracklist'

/** A DOM element with a React fiber whose ancestors carry the given props (nearest first). */
function rowWithFiber(...propsChain: Record<string, unknown>[]): Element {
  const el = document.createElement('div')
  let fiber: Record<string, unknown> | null = null
  for (const props of [...propsChain].reverse()) fiber = { memoizedProps: props, return: fiber }
  Object.assign(el, { __reactFiber$abc: fiber })
  return el
}

describe('trackUriOfRow', () => {
  it("finds the row's track URI a few components up", () => {
    expect(trackUriOfRow(rowWithFiber({ role: 'row' }, { children: [] }, { uri: 'spotify:track:1', index: 3 }))).toBe('spotify:track:1')
  })

  it('ignores URIs that are not tracks (e.g. the album the list belongs to)', () => {
    expect(trackUriOfRow(rowWithFiber({ uri: 'spotify:album:9' }))).toBeNull()
  })

  it('returns null without a React fiber', () => {
    expect(trackUriOfRow(document.createElement('div'))).toBeNull()
  })
})
