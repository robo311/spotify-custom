// Live DOM queries for parts: presence (for "not found in this Spotify version" badges), hit testing for
// pick mode, and element lookup for highlight outlines.
import type { PartDef, PartStatus } from '../types'
import { anyOf } from './css'
import { PARTS } from './registry'
import { APP_ROOT } from './selectors'

const ROOT_SELECTOR = new Map(PARTS.map(p => [p.id, anyOf(p.selectors)]))

function selectorOf(part: PartDef): string {
  return ROOT_SELECTOR.get(part.id) ?? anyOf(part.selectors)
}

export function readPartStatus(root: ParentNode = document): PartStatus {
  return Object.fromEntries(PARTS.map(p => [p.id, root.querySelector(selectorOf(p)) ? 'ok' : 'missing']))
}

function sameStatus(a: PartStatus, b: PartStatus): boolean {
  return PARTS.every(p => a[p.id] === b[p.id])
}

/** Calls cb with presence of every part now and whenever it changes (DOM mutations batched per animation frame). */
export function watchPartStatus(cb: (s: PartStatus) => void): () => void {
  let last = readPartStatus()
  cb(last)

  let frame = 0
  const check = () => {
    frame = 0
    const next = readPartStatus()
    if (sameStatus(last, next)) return
    last = next
    cb(next)
  }
  const observer = new MutationObserver(() => {
    if (frame === 0) frame = requestAnimationFrame(check)
  })
  const scope = document.querySelector(APP_ROOT) ?? document.body
  observer.observe(scope, { childList: true, subtree: true })

  return () => {
    observer.disconnect()
    if (frame !== 0) cancelAnimationFrame(frame)
  }
}

/** The innermost curated part containing el (for pick mode). */
export function findPartAt(el: Element): PartDef | null {
  for (let node: Element | null = el; node; node = node.parentElement) {
    const current = node
    const part = PARTS.find(p => current.matches(selectorOf(p)))
    if (part) return part
  }
  return null
}

/** Elements currently matching a part (for highlight outlines). Unknown ids return []. */
export function partElements(id: string): Element[] {
  const selector = ROOT_SELECTOR.get(id)
  return selector ? [...document.querySelectorAll(selector)] : []
}
