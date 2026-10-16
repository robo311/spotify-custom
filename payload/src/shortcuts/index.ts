// Shortcut buttons: one-click song actions (add to queue, like, go to album, …) right on song rows, the queue panel,
// the player bar and the search suggestions, so they don't need the ⋯ menu. Each place shows the user's own list (MenuSettings.shortcuts),
// independent of the menu's on/off switch. Public surface used by main.ts.
import type { MenuSettings, ShortcutAction, ShortcutSurface, SpotifyAddSurface } from '../types'
import { createLikes } from './likes'
import { SPOTIFY_ADD } from './selectors'
import { spotifySource, type ShortcutSource } from './source'
import { startPlayerBar, startQueueRows, startSearchRows, startTrackRows } from './surfaces'
import { hideToast } from './toast'

export type { ShortcutSource } from './source'
/** Spotify's own icons for Add to queue / Add to playlist (the studio's picker shows the same). */
export { ADD_TO_PLAYLIST_ICON, ADD_TO_QUEUE_ICON } from './icons'

export interface ShortcutsController {
  /** Re-read the settings (which buttons go where). */
  refresh(): void
  dispose(): void
}

/** Matches theme/model.ts SHORTCUTS_MAX; the settings are already clamped, this only guards the layout. */
const MAX_PER_SURFACE = 3

const HIDE_STYLE_ID = 'sc-shortcuts-hide-spotify-add'

/** Hides Spotify's own add button where the user removed it (CSS only; Spotify's node stays). */
function hideSpotifyAdd(surfaces: readonly SpotifyAddSurface[]) {
  let style = document.getElementById(HIDE_STYLE_ID)
  if (surfaces.length === 0) {
    style?.remove()
    return
  }
  if (!style) {
    style = document.createElement('style')
    style.id = HIDE_STYLE_ID
    document.head.append(style)
  }
  style.textContent = `${surfaces.map(s => SPOTIFY_ADD[s]).join(', ')} { display: none !important; }`
}

const STARTERS: Record<ShortcutSurface, typeof startTrackRows> = {
  rows: startTrackRows,
  queue: startQueueRows,
  playerBar: startPlayerBar,
  search: startSearchRows,
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
    const settings = getSettings()
    hideSpotifyAdd(settings.hideSpotifyAdd)
    const lists = settings.shortcuts
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
      hideSpotifyAdd([])
      hideToast()
    },
  }
}
