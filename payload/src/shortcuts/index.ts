// Shortcut buttons: one-click song actions (add to queue, like, go to album, …) right on song rows, the queue panel
// and the player bar, so they don't need the ⋯ menu. Each place shows the user's own list (MenuSettings.shortcuts),
// independent of the menu's on/off switch. Public surface used by main.ts.
import type { MenuSettings, ShortcutAction, ShortcutSurface } from '../types'
import { createLikes } from './likes'
import { spotifySource, type ShortcutSource } from './source'
import { startPlayerBar, startQueueRows, startTrackRows } from './surfaces'
import { hideToast } from './toast'

export type { ShortcutSource } from './source'

export interface ShortcutsController {
  /** Re-read the settings (which buttons go where). */
  refresh(): void
  dispose(): void
}

/** Matches theme/model.ts SHORTCUTS_MAX; the settings are already clamped, this only guards the layout. */
const MAX_PER_SURFACE = 3

const STARTERS: Record<ShortcutSurface, typeof startTrackRows> = {
  rows: startTrackRows,
  queue: startQueueRows,
  playerBar: startPlayerBar,
}

export function startShortcuts(getSettings: () => MenuSettings, source: ShortcutSource = spotifySource(getSettings)): ShortcutsController {
  const warned = new Set<string>()
  const warnOnce = (what: string, error: unknown) => {
    if (warned.has(what)) return
    warned.add(what)
    console.warn(`[spotify-custom] shortcut ${what} failed`, error)
  }
  const likes = createLikes(source, e => warnOnce('liked state', e))
  const running = new Map<ShortcutSurface, { key: string; stop: () => void }>()

  const refresh = () => {
    const lists = getSettings().shortcuts
    for (const surface of Object.keys(STARTERS) as ShortcutSurface[]) {
      const actions: ShortcutAction[] = lists[surface].slice(0, MAX_PER_SURFACE)
      const key = actions.join(',')
      const current = running.get(surface)
      if (current?.key === key) continue
      current?.stop()
      running.delete(surface)
      if (actions.length === 0) continue
      const stop = STARTERS[surface]({ actions, source, likes, onError: (action, e) => warnOnce(action, e) })
      running.set(surface, { key, stop })
    }
  }
  refresh()

  return {
    refresh,
    dispose() {
      for (const { stop } of running.values()) stop()
      running.clear()
      likes.dispose()
      hideToast()
    },
  }
}
