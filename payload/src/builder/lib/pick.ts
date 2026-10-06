// Pick mode hit-testing: which curated part is under the pointer, and which of its elements to spotlight.
import type { PartDef } from '../../types'

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

/** What pick mode can select: a curated part, or one library item (folder / Liked Songs; more specific, so checked first). */
export type PickTarget =
  | { kind: 'part'; part: PartDef; element: Element } // element = the part instance under the pointer (spotlit)
  | { kind: 'library-item'; uri: string; element: Element }

export interface PickResolvers {
  isOwn: (el: Element) => boolean
  findLibraryItemAt: (el: Element) => { uri: string; element: Element } | null
  findPartAt: (el: Element) => PartDef | null
  partElements: (id: string) => Element[]
}

/**
 * Resolves what is under the pointer from an elementsFromPoint() stack.
 * Our own overlay elements are skipped so the spotlight never picks itself.
 */
export function resolvePick(stack: readonly Element[], r: PickResolvers): PickTarget | null {
  const hit = stack.find(el => !r.isOwn(el))
  if (!hit) return null
  const item = r.findLibraryItemAt(hit)
  if (item) return { kind: 'library-item', ...item }
  const part = r.findPartAt(hit)
  if (!part) return null
  const element = r.partElements(part.id).find(el => el === hit || el.contains(hit))
  return element ? { kind: 'part', part, element } : null
}

/**
 * The library item under el, with the element to spotlight: the outermost ancestor that still belongs to the same
 * item (its whole row or card). itemAt is the library module's resolver, so selectors live in one place.
 */
export function libraryEntryAt(el: Element, itemAt: (el: Element) => { uri: string } | null): { uri: string; element: Element } | null {
  const item = itemAt(el)
  if (!item) return null
  let entry = el
  while (entry.parentElement && itemAt(entry.parentElement)?.uri === item.uri) entry = entry.parentElement
  return { uri: item.uri, element: entry }
}

/** Where to place a popover next to a target box, kept inside the viewport. */
export function placePopover(target: Box, popover: { width: number; height: number }, viewport: { width: number; height: number }, gap = 12): { x: number; y: number } {
  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max))
  const fitsBelow = target.y + target.height + gap + popover.height <= viewport.height
  const fitsAbove = target.y - gap - popover.height >= 0
  const y = fitsBelow ? target.y + target.height + gap : fitsAbove ? target.y - gap - popover.height : clamp(target.y, gap, viewport.height - popover.height - gap)
  const x = clamp(target.x, gap, viewport.width - popover.width - gap)
  return { x, y }
}

/**
 * A vertical leader from the picked part to its popover (design-tool style), or null when they overlap. It leaves
 * from the part's centre when that lines up with the popover, else from the popover's middle (wide parts like the
 * player bar), always clear of the popover's rounded corners.
 */
export function leaderLine(part: Box, pop: Box, corner = 24): { x1: number; y1: number; x2: number; y2: number } | null {
  const below = pop.y >= part.y + part.height
  const above = pop.y + pop.height <= part.y
  if (!below && !above) return null
  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)
  const lo = Math.max(part.x, pop.x + corner)
  const hi = Math.min(part.x + part.width, pop.x + pop.width - corner)
  const centre = part.x + part.width / 2
  const x =
    centre >= pop.x + corner && centre <= pop.x + pop.width - corner ? centre : lo <= hi ? clamp(pop.x + pop.width / 2, lo, hi) : pop.x + corner
  return below ? { x1: x, y1: part.y + part.height, x2: x, y2: pop.y } : { x1: x, y1: part.y, x2: x, y2: pop.y + pop.height }
}

/** The nearest element (el or an ancestor) that can scroll, so wheel input can be forwarded while picking. */
export function scrollableAncestor(el: Element | null, canScroll: (el: Element) => boolean): Element | null {
  for (let node = el; node; node = node.parentElement) if (canScroll(node)) return node
  return null
}

/** Real-DOM test for scrollability: overflowing content plus an overflow style that allows scrolling. */
export function isScrollable(el: Element): boolean {
  const { overflowY, overflowX } = getComputedStyle(el)
  const scrolls = (v: string) => v === 'auto' || v === 'scroll' || v === 'overlay'
  return (scrolls(overflowY) && el.scrollHeight > el.clientHeight) || (scrolls(overflowX) && el.scrollWidth > el.clientWidth)
}
