// Debounced writes of themes and settings through the bridge. Rapid edits (dragging a slider) become one write.
// Also tracks whether everything the user changed has reached disk (the builder's save indicator).
import type { AppState, Settings, Theme, UserTheme } from '../types'
import type { Bridge } from './bridge'

const THEME_DELAY_MS = 400
const SETTINGS_DELAY_MS = 300

export type SaveStatus = AppState['saveStatus']

export interface Persistence {
  /** pending: queued or in flight · error: the last finished write failed · local: helper not connected · saved. */
  status(): SaveStatus
  /** Called when status() changes. */
  onStatusChange(fn: () => void): void
  saveThemeSoon(theme: UserTheme): void
  saveThemeNow(theme: UserTheme): void
  cancelTheme(id: string): void
  deleteTheme(id: string): void
  saveSettingsSoon(settings: Settings): void
  /** Writes everything pending immediately (before switching themes, on dispose). */
  flush(): void
  /** Writes everything pending now and re-attempts every write that failed. */
  retry(): void
}

/** fileCss belongs to the hand-written theme.css file and must never be written into theme.json. */
function toStoredTheme(theme: UserTheme): Theme {
  const { fileCss: _fileCss, ...stored } = theme
  return stored
}

export function createPersistence(bridge: Bridge): Persistence {
  const pendingThemes = new Map<string, { timer: ReturnType<typeof setTimeout>; theme: UserTheme }>()
  let pendingSettings: { timer: ReturnType<typeof setTimeout>; settings: Settings } | null = null
  let inFlight = 0
  /** Latest failed write per target ("theme:<id>", "settings"), replayed by retry() and by the next write. */
  const failed = new Map<string, { what: string; write: () => Promise<unknown> }>()
  /** Per-target generation, so an older write finishing late can't override a newer one's outcome. */
  const generation = new Map<string, number>()
  let listener: (() => void) | null = null
  let lastStatus: SaveStatus

  const status = (): SaveStatus => {
    if (pendingThemes.size > 0 || pendingSettings || inFlight > 0) return 'pending'
    if (failed.size > 0) return 'error'
    return bridge.connected ? 'saved' : 'local'
  }
  const notify = () => {
    const next = status()
    if (next === lastStatus) return
    lastStatus = next
    listener?.()
  }

  /** Every bridge write goes through here so the status sees it start and finish. */
  const run = (target: string, what: string, write: () => Promise<unknown>) => {
    const gen = (generation.get(target) ?? 0) + 1
    generation.set(target, gen)
    failed.delete(target) // superseded by this attempt
    inFlight++
    write()
      .then(
        () => undefined,
        (e: unknown) => {
          if (generation.get(target) === gen) failed.set(target, { what, write })
          console.error(`[spotify-custom] could not save ${what}`, e)
        },
      )
      .finally(() => {
        inFlight--
        notify()
      })
    notify()
  }

  /** A write is also the moment to re-attempt earlier failures ("keeps retrying on the next change"). */
  const write = (target: string, what: string, op: () => Promise<unknown>) => {
    const retries = [...failed.entries()].filter(([t]) => t !== target)
    run(target, what, op)
    for (const [t, f] of retries) run(t, f.what, f.write)
  }

  const writeTheme = (theme: UserTheme) => {
    pendingThemes.delete(theme.id)
    const stored = toStoredTheme(theme)
    write(`theme:${theme.id}`, `theme "${theme.name}"`, () => bridge.call('saveTheme', stored))
  }
  const writeSettings = (settings: Settings) => {
    pendingSettings = null
    write('settings', 'settings', () => bridge.call('saveSettings', settings))
  }

  /** Drops a queued theme write without reporting a status change (callers re-queue or notify). */
  const unqueueTheme = (id: string) => {
    const p = pendingThemes.get(id)
    if (p) clearTimeout(p.timer)
    pendingThemes.delete(id)
  }
  const cancelTheme = (id: string) => {
    unqueueTheme(id)
    notify()
  }
  function flush() {
    for (const { timer, theme } of [...pendingThemes.values()]) {
      clearTimeout(timer)
      writeTheme(theme)
    }
    if (pendingSettings) {
      clearTimeout(pendingSettings.timer)
      writeSettings(pendingSettings.settings)
    }
  }

  lastStatus = status()

  return {
    status,
    onStatusChange(fn) {
      listener = fn
    },
    saveThemeSoon(theme) {
      unqueueTheme(theme.id)
      pendingThemes.set(theme.id, { theme, timer: setTimeout(() => writeTheme(theme), THEME_DELAY_MS) })
      notify()
    },
    saveThemeNow(theme) {
      unqueueTheme(theme.id)
      writeTheme(theme)
    },
    cancelTheme,
    deleteTheme(id) {
      unqueueTheme(id)
      // Same target as saves: a failed save of a deleted theme must not be replayed.
      write(`theme:${id}`, `deletion of theme "${id}"`, () => bridge.call('deleteTheme', { id }))
    },
    saveSettingsSoon(settings) {
      if (pendingSettings) clearTimeout(pendingSettings.timer)
      pendingSettings = { settings, timer: setTimeout(() => writeSettings(settings), SETTINGS_DELAY_MS) }
      notify()
    },
    flush,
    retry() {
      flush()
      for (const [target, f] of [...failed.entries()]) run(target, f.what, f.write)
    },
  }
}
