// Builder UI preferences (not part of any theme): panel size and placement, last tab, recent colours.
import type { TabId } from '../context'
import { isPlacement, type Placement } from './panel-geometry'

const KEY = 'sc:builder'

export interface BuilderPrefs {
  width: number
  tab: TabId
  recentColors: string[]
  placement: Placement
}

export const DRAWER_MIN = 340
export const DRAWER_MAX = 640
const DEFAULTS: BuilderPrefs = { width: 384, tab: 'start', recentColors: [], placement: { mode: 'docked' } }

export function loadPrefs(): BuilderPrefs {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    if (typeof raw !== 'object' || raw === null) return DEFAULTS
    const p = raw as Partial<Record<keyof BuilderPrefs, unknown>>
    return {
      width: typeof p.width === 'number' ? clampWidth(p.width) : DEFAULTS.width,
      tab: typeof p.tab === 'string' ? (p.tab as TabId) : DEFAULTS.tab,
      recentColors: Array.isArray(p.recentColors) ? p.recentColors.filter((c): c is string => typeof c === 'string').slice(0, 10) : [],
      placement: isPlacement(p.placement) ? p.placement : DEFAULTS.placement,
    }
  } catch {
    return DEFAULTS
  }
}

export function savePrefs(patch: Partial<BuilderPrefs>): void {
  localStorage.setItem(KEY, JSON.stringify({ ...loadPrefs(), ...patch }))
}

export function clampWidth(width: number): number {
  return Math.round(Math.min(DRAWER_MAX, Math.max(DRAWER_MIN, width)))
}

/** Most-recent-first list without duplicates, capped at 10. */
export function pushRecent(list: readonly string[], color: string): string[] {
  return [color, ...list.filter(c => c !== color)].slice(0, 10)
}
