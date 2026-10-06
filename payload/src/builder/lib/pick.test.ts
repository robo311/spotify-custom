import type { PartDef } from '../../types'
import { leaderLine, libraryEntryAt, placePopover, resolvePick, scrollableAncestor, type PickResolvers } from './pick'

const part = (id: string): PartDef => ({ id, label: id, description: '', selectors: [], props: [], hideable: false, gradient: true, compile: () => '' })

describe('resolvePick', () => {
  const overlay = document.createElement('div')
  const bar = document.createElement('footer')
  const button = document.createElement('button')
  bar.append(button)
  const playerBar = part('playerBar')
  const findPartAt = vi.fn((el: Element) => (bar.contains(el) ? playerBar : null))
  const partElements = (id: string) => (id === 'playerBar' ? [bar] : [])
  const isOwn = (el: Element) => el === overlay
  const folderRow = document.createElement('div')
  const folderTitle = document.createElement('p')
  folderRow.append(folderTitle)
  bar.append(folderRow)
  const findLibraryItemAt = (el: Element) => (folderRow.contains(el) ? { uri: 'spotify:user:me:folder:1', element: folderRow } : null)
  const resolvers: PickResolvers = { isOwn, findLibraryItemAt, findPartAt, partElements }

  it('skips our own overlay and resolves the part instance containing the hit', () => {
    expect(resolvePick([overlay, button, bar], resolvers)).toEqual({ kind: 'part', part: playerBar, element: bar })
    expect(findPartAt).toHaveBeenCalledWith(button)
  })

  it('prefers a library item over the part around it', () => {
    expect(resolvePick([folderTitle, folderRow, bar], resolvers)).toEqual({ kind: 'library-item', uri: 'spotify:user:me:folder:1', element: folderRow })
  })

  it('returns null when nothing curated is under the pointer', () => {
    expect(resolvePick([overlay, document.body], resolvers)).toBeNull()
  })

  it('returns null when only our overlay is hit', () => {
    expect(resolvePick([overlay], resolvers)).toBeNull()
  })

  it('returns null if the part has no matching element (stale registry)', () => {
    expect(resolvePick([button], { ...resolvers, partElements: () => [] })).toBeNull()
  })
})

describe('libraryEntryAt', () => {
  // A library row (data-uri marks rows here; the real resolver is the library module's) inside a list.
  const list = document.createElement('div')
  const row = document.createElement('div')
  row.dataset.uri = 'spotify:collection:tracks'
  const title = document.createElement('p')
  const text = document.createElement('span')
  title.append(text)
  row.append(title)
  list.append(row)
  const itemAt = (el: Element) => {
    const r = el.closest<HTMLElement>('[data-uri]')
    return r?.dataset.uri ? { uri: r.dataset.uri } : null
  }

  it('resolves the item and spotlights its whole row', () => {
    expect(libraryEntryAt(text, itemAt)).toEqual({ uri: 'spotify:collection:tracks', element: row })
  })

  it('returns null outside library items', () => {
    expect(libraryEntryAt(list, itemAt)).toBeNull()
  })
})

describe('placePopover', () => {
  const viewport = { width: 1000, height: 800 }
  const pop = { width: 300, height: 200 }

  it('prefers below the target', () => {
    expect(placePopover({ x: 100, y: 100, width: 50, height: 40 }, pop, viewport)).toEqual({ x: 100, y: 152 })
  })

  it('flips above when there is no room below', () => {
    expect(placePopover({ x: 100, y: 700, width: 50, height: 60 }, pop, viewport)).toEqual({ x: 100, y: 488 })
  })

  it('keeps inside the right edge', () => {
    expect(placePopover({ x: 950, y: 100, width: 40, height: 40 }, pop, viewport).x).toBe(688)
  })

  it('overlaps the target when it is taller than the viewport allows either way', () => {
    expect(placePopover({ x: 0, y: 0, width: 1000, height: 800 }, pop, viewport)).toEqual({ x: 12, y: 12 })
  })
})

describe('leaderLine', () => {
  const pop = { x: 100, y: 300, width: 320, height: 400 }

  it('runs straight down from a part above the popover to its top edge', () => {
    expect(leaderLine({ x: 150, y: 200, width: 60, height: 40 }, pop)).toEqual({ x1: 180, y1: 240, x2: 180, y2: 300 })
  })

  it('runs up from a part below the popover to its bottom edge, kept within the popover', () => {
    expect(leaderLine({ x: 0, y: 760, width: 1200, height: 80 }, pop)).toEqual({ x1: 260, y1: 760, x2: 260, y2: 700 })
  })

  it('stays clear of the rounded corners', () => {
    expect(leaderLine({ x: 0, y: 200, width: 40, height: 40 }, pop)?.x1).toBe(124)
  })

  it('draws nothing when the popover overlaps the part', () => {
    expect(leaderLine({ x: 100, y: 350, width: 50, height: 50 }, pop)).toBeNull()
  })
})

describe('scrollableAncestor', () => {
  const outer = document.createElement('div')
  const inner = document.createElement('div')
  const leaf = document.createElement('span')
  inner.append(leaf)
  outer.append(inner)

  it('finds the nearest scrollable container of the element under the pointer', () => {
    expect(scrollableAncestor(leaf, el => el === outer)).toBe(outer)
    expect(scrollableAncestor(leaf, el => el === inner || el === outer)).toBe(inner)
  })

  it('returns null when nothing scrolls', () => {
    expect(scrollableAncestor(leaf, () => false)).toBeNull()
    expect(scrollableAncestor(null, () => true)).toBeNull()
  })
})
