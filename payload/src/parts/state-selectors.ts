// Spotify's state attributes on <html> (lyrics view opening, open, closing; right panel open), written so styling
// them stays cheap. Before matching a rule, Chrome rejects it if an ancestor it names (by id, class, tag or attribute
// name) is missing, but it can't look inside :is(): `:root:is([a], [b]) X` is therefore matched in full against
// every element on every style recalc, while `:root[a] X, :root[b] X` is rejected at once while the state is off.
// Measured on Spotify (20 rules): +10.1 ms per full recalc → +0.6 ms. The selector constants keep the readable :is()
// form; rendering expands them. Pure.
import { LYRICS_OPEN_STATES, LYRICS_CLOSING_STATES, LYRICS_VIEW_CLOSING, LYRICS_VIEW_OPEN, RIGHT_PANEL_OPEN, RIGHT_PANEL_STATES } from './selectors'

interface StateGroup {
  written: string
  each: readonly string[]
}

const GROUPS: readonly StateGroup[] = [
  { written: LYRICS_VIEW_OPEN, each: LYRICS_OPEN_STATES.map(s => `:root${s}`) },
  { written: LYRICS_VIEW_CLOSING, each: LYRICS_CLOSING_STATES.map(s => `:root${s}`) },
  { written: RIGHT_PANEL_OPEN, each: RIGHT_PANEL_STATES },
]

/** Pure: splits a selector list at its top-level commas (not those inside :is(), :not(), attribute values…). */
export function splitSelectorList(list: string): string[] {
  const parts: string[] = []
  let depth = 0
  let quote: string | null = null
  let start = 0
  for (let i = 0; i < list.length; i++) {
    const c = list[i]
    if (quote) {
      if (c === quote) quote = null
    } else if (c === '"' || c === "'") quote = c
    else if (c === '(' || c === '[') depth++
    else if (c === ')' || c === ']') depth--
    else if (c === ',' && depth === 0) {
      parts.push(list.slice(start, i).trim())
      start = i + 1
    }
  }
  parts.push(list.slice(start).trim())
  return parts.filter(p => p !== '')
}

/** Whether position `at` sits inside a :not(…): there a state can't be split into alternatives. */
function insideNot(selector: string, at: number): boolean {
  const open: boolean[] = []
  for (let i = 0; i < at; i++) {
    if (selector[i] === '(') open.push(selector.endsWith(':not', i))
    else if (selector[i] === ')') open.pop()
  }
  return open.includes(true)
}

function expand(complex: string): string[] {
  for (const group of GROUPS) {
    for (let at = complex.indexOf(group.written); at >= 0; at = complex.indexOf(group.written, at + 1)) {
      if (insideNot(complex, at)) continue
      const before = complex.slice(0, at)
      const after = complex.slice(at + group.written.length)
      return group.each.flatMap(state => expand(before + state + after))
    }
  }
  return [complex]
}

/**
 * Pure: the same selector with every state prefix spelled out as one alternative per state attribute. Matches exactly
 * the same elements with the same specificity (:is() takes its argument's).
 */
export function filterable(selector: string): string {
  if (!selector.includes('[data-cinema-')) return selector
  return splitSelectorList(selector).flatMap(expand).join(',\n')
}
