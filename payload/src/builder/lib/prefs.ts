// Builder UI preferences (not part of any theme): panel size and placement, last tab, recent colours, whether the tour was
// offered, and which What's new showcase was seen.
import { TAB_IDS, type TabId } from '../context'
import { isPlacement, type Placement } from './panel-geometry'

const KEY = 'sc:builder'

export interface BuilderPrefs {
  width: number
  tab: TabId
  recentColors: string[]
  placement: Placement
  tourSeen: boolean // the first-run "take the tour?" prompt was answered (or the studio opened); never shown again
  whatsNewSeen: string | null // id of the last What's new showcase seen (tour/whats-new.ts); lights the sparkle when behind
}

export const DRAWER_MIN = 340
export const DRAWER_MAX = 640
const DEFAULTS: BuilderPrefs = { width: 384, tab: 'themes', recentColors: [], placement: { mode: 'docked' }, tourSeen: false, whatsNewSeen: null }

export function loadPrefs(): BuilderPrefs {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    if (typeof raw !== 'object' || raw === null) return DEFAULTS
    const p = raw as Partial<Record<keyof BuilderPrefs, unknown>>
    return {
      width: typeof p.width === 'number' ? clampWidth(p.width) : DEFAULTS.width,
      tab: isTabId(p.tab) ? p.tab : DEFAULTS.tab,
      recentColors: Array.isArray(p.recentColors) ? p.recentColors.filter((c): c is string => typeof c === 'string').slice(0, 10) : [],
      placement: isPlacement(p.placement) ? p.placement : DEFAULTS.placement,
      tourSeen: p.tourSeen === true,
      whatsNewSeen: typeof p.whatsNewSeen === 'string' ? p.whatsNewSeen : null,
    }
  } catch {
    return DEFAULTS
  }
}

/** Tabs come and go between versions: a saved tab that no longer exists opens the default instead. */
const isTabId = (v: unknown): v is TabId => (TAB_IDS as readonly unknown[]).includes(v)

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
