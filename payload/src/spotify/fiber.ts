// Finding Spotify's internal objects in its React tree. Some services (router history, player) are only reachable
// as props of provider components near the top of the tree; a bounded breadth-first walk finds them quickly.
import { REACT_ROOT_SELECTORS } from './selectors'

export interface FiberLike {
  child?: FiberLike | null
  sibling?: FiberLike | null
  memoizedProps?: unknown
}

const MAX_FIBERS = 5000

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function rootFiber(): FiberLike | null {
  for (const selector of REACT_ROOT_SELECTORS) {
    const element = document.querySelector(selector)
    if (!element) continue
    const key = Object.keys(element).find(k => k.startsWith('__reactContainer$'))
    const fiber: unknown = key ? (element as unknown as Record<string, unknown>)[key] : null
    if (isRecord(fiber)) return fiber
  }
  return null
}

/** Breadth-first so shallow provider components are found long before the walk reaches leaf components. */
export function findInFiber<T>(root: FiberLike | null, pick: (props: Record<string, unknown>) => T | null): T | null {
  const queue: FiberLike[] = root ? [root] : []
  for (let visited = 0; queue.length > 0 && visited < MAX_FIBERS; visited++) {
    const fiber = queue.shift()
    if (!fiber) break
    const props = fiber.memoizedProps
    if (isRecord(props)) {
      const found = pick(props)
      if (found !== null) return found
    }
    for (let child = fiber.child; child; child = child.sibling) queue.push(child)
  }
  return null
}
