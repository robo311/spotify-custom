// The single source of truth for the builder: themes, settings, undo/redo, persistence and applying the
// active theme to Spotify. UI code only reads `get()`/`subscribe()` and calls the Store methods.
import type {
  AppState,
  ExtensionInfo,
  HelperState,
  LibraryItemInfo,
  PanelSectionInfo,
  PartStatus,
  Settings,
  ShelfInfo,
  Store,
  Theme,
  ThemeEditOptions,
  UpdateStatus,
  UserTheme,
} from '../types'
import { BUILTIN_ICON_PACKS } from '../icons'
import { applyThemeCss, clearMorphSuppression, restoreCachedThemeCss, type Point } from '../theme/apply'
import { isNativePalette } from '../theme/compile'
import { createCompileCache } from '../theme/compile-cache'
import { forkTheme, normalizeSettings, uniqueId, uniqueName, validateTheme } from '../theme/model'
import { DEFAULT_PRESET_ID, PRESETS, findPreset } from '../theme/presets'
import { startRecolor } from '../theme/recolor'
import { decodeShareCode, encodeShareCode } from '../theme/sharecode'
import type { Bridge } from './bridge'
import { History } from './history'
import { createPersistence } from './persistence'

export interface StoreInternals {
  /** Loads helper state (or mock), resolves the active theme, applies it. Safe to call before the DOM body exists. */
  init(): Promise<void>
  helperState(): HelperState | null
  setPartStatus(s: PartStatus): void
  setShelves(s: ShelfInfo[]): void
  setPanelSections(s: PanelSectionInfo[]): void
  setLibraryItems(f: LibraryItemInfo[]): void
  setExtensions(list: ExtensionInfo[]): void
  dispose(): void
}

const DEFAULT_PRESET = findPreset(DEFAULT_PRESET_ID) ?? PRESETS[0]
const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** Keeps the previous object for every top-level slice whose content didn't change (cheap change detection for UI). */
function shareUnchanged<T extends object>(prev: T, next: T): T {
  const out = { ...next }
  for (const key of Object.keys(next) as (keyof T)[]) {
    if (sameJson(prev[key], next[key])) out[key] = prev[key]
  }
  return out
}

export function createStore(bridge: Bridge): Store & StoreInternals {
  const persistence = createPersistence(bridge)
  const history = new History<Theme>()
  const listeners = new Set<(s: AppState) => void>()
  const recolor = startRecolor()

  let helper: HelperState | null = null
  let settings: Settings = normalizeSettings(null, DEFAULT_PRESET.id)
  let userThemes: UserTheme[] = []
  let active: UserTheme = DEFAULT_PRESET
  let iconPacks = BUILTIN_ICON_PACKS
  let partStatus: PartStatus = {}
  let shelves: ShelfInfo[] = []
  let panelSections: PanelSectionInfo[] = []
  let libraryItems: LibraryItemInfo[] = []
  let extensions: ExtensionInfo[] = []
  let update: UpdateStatus = { state: 'none', current: '' }
  let ready = false
  let previewing: Theme | null = null
  let state = buildState()

  // ---------- state plumbing ----------

  function buildState(): AppState {
    return {
      ready,
      settings,
      presets: PRESETS,
      userThemes,
      active,
      activeIsPreset: isPreset(active.id),
      iconPacks,
      extensions,
      partStatus,
      shelves,
      panelSections,
      libraryItems,
      saveStatus: persistence.status(),
      canUndo: history.canUndo,
      canRedo: history.canRedo,
      helper: {
        connected: bridge.connected,
        dataDir: helper?.dataDir ?? '',
        platform: helper?.platform ?? 'mock',
        version: helper?.version ?? 'dev',
      },
      update,
    }
  }

  function emit() {
    state = buildState()
    for (const fn of listeners) fn(state)
  }

  // Status changes can happen mid-operation (a write queued inside edit()); emit once the operation finished,
  // and only if no later emit already carried the new status.
  persistence.onStatusChange(() => {
    queueMicrotask(() => {
      if (persistence.status() !== state.saveStatus) emit()
    })
  })

  function isPreset(id: string): boolean {
    return !userThemes.some(t => t.id === id) && findPreset(id) !== undefined
  }

  function findTheme(id: string): UserTheme | undefined {
    return userThemes.find(t => t.id === id) ?? findPreset(id)
  }

  const compiled = createCompileCache()

  function apply(opts: { origin?: Point; instant?: boolean } = {}) {
    const theme = previewing ?? active
    const fileCss = previewing ? undefined : active.fileCss
    applyThemeCss(compiled.compile(theme, { iconPacks, fileCss }), { ...opts, cache: !previewing })
    recolor.setEnabled(!isNativePalette(theme.palette))
  }

  function setSettings(next: Settings) {
    if (sameJson(next, settings)) return
    settings = shareUnchanged(settings, next)
    persistence.saveSettingsSoon(settings)
  }

  /** Replaces the active user theme's content (same id), keeping its hand-written file CSS. */
  function replaceActive(next: Theme) {
    const updated: UserTheme = { ...next, fileCss: active.fileCss }
    userThemes = userThemes.map(t => (t.id === updated.id ? updated : t))
    active = updated
    persistence.saveThemeSoon(updated)
  }

  function activate(theme: UserTheme, origin?: Point) {
    persistence.flush()
    active = theme
    previewing = null
    history.clear()
    setSettings({ ...settings, activeTheme: theme.id })
    apply({ origin })
    emit()
  }

  function addUserTheme(theme: Theme): UserTheme {
    userThemes = [...userThemes, theme]
    persistence.saveThemeNow(theme)
    return theme
  }

  const takenIds = () => [...userThemes, ...PRESETS].map(t => t.id)
  const takenNames = () => [...userThemes, ...PRESETS].map(t => t.name)

  // ---------- editing ----------

  function edit(mutate: (draft: Theme) => void, opts: ThemeEditOptions = {}) {
    if (isPreset(active.id)) {
      const fork = addUserTheme(forkTheme(active, takenIds(), takenNames()))
      active = fork
      history.clear()
      setSettings({ ...settings, activeTheme: fork.id })
    }
    const draft = structuredClone(active)
    mutate(draft)
    let next: Theme
    try {
      next = { ...validateTheme(draft), id: active.id, basedOn: active.basedOn }
    } catch (e) {
      console.warn('[spotify-custom] ignored an invalid edit', e)
      return
    }
    const { fileCss: _fileCss, ...current } = active
    if (sameJson(next, current)) {
      emit() // a preset may just have been forked
      return
    }
    history.record(current, opts.coalesceKey)
    replaceActive(next)
    apply()
    emit()
  }

  function editSettings(mutate: (draft: Settings) => void) {
    const draft = structuredClone(settings)
    mutate(draft)
    // Same validation as settings loaded from disk (e.g. oversized folder art is dropped, never saved).
    setSettings(normalizeSettings(draft, settings.activeTheme))
    emit()
  }

  // ---------- public API ----------

  return {
    get: () => state,

    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },

    edit,

    preview(theme) {
      if (theme === previewing) return
      previewing = theme
      apply({ instant: true })
    },

    selectTheme(id, origin) {
      if (id === active.id) return
      const theme = findTheme(id)
      if (theme) activate(theme, origin)
      else console.warn(`[spotify-custom] unknown theme "${id}"`)
    },

    undo() {
      const { fileCss: _fileCss, ...current } = active
      const previous = history.undo(current)
      if (!previous) return
      replaceActive(previous)
      apply()
      emit()
    },

    redo() {
      const { fileCss: _fileCss, ...current } = active
      const next = history.redo(current)
      if (!next) return
      replaceActive(next)
      apply()
      emit()
    },

    resetToPreset() {
      const preset = active.basedOn ? findPreset(active.basedOn) : undefined
      if (!preset || isPreset(active.id)) return
      edit(draft => {
        Object.assign(draft, structuredClone(preset), { id: draft.id, name: draft.name, basedOn: draft.basedOn })
      })
    },

    saveAs(name) {
      const { fileCss: _fileCss, ...current } = active
      const finalName = uniqueName(name.trim() || 'My theme', takenNames())
      const copy = addUserTheme({
        ...structuredClone(current),
        id: uniqueId(finalName, takenIds()),
        name: finalName,
        basedOn: isPreset(active.id) ? active.id : active.basedOn,
      })
      activate(copy)
    },

    renameTheme(id, name) {
      const theme = userThemes.find(t => t.id === id)
      const trimmed = name.trim().slice(0, 60)
      if (!theme || !trimmed || trimmed === theme.name) return
      const renamed = { ...theme, name: trimmed }
      userThemes = userThemes.map(t => (t.id === id ? renamed : t))
      if (active.id === id) active = renamed
      persistence.saveThemeNow(renamed)
      emit()
    },

    deleteTheme(id) {
      const theme = userThemes.find(t => t.id === id)
      if (!theme) return
      userThemes = userThemes.filter(t => t.id !== id)
      persistence.deleteTheme(id)
      if (active.id === id) activate((theme.basedOn ? findPreset(theme.basedOn) : undefined) ?? DEFAULT_PRESET)
      else emit()
    },

    editSettings,

    setExtensionEnabled(id, enabled) {
      editSettings(s => {
        s.extensions[id] = enabled
      })
    },

    exportShareCode() {
      const { fileCss, ...theme } = active
      // The recipient has no theme.css file, so the share carries it inline. Sharing a preset records it as
      // the origin, so the recipient's copy can still "Reset to preset".
      return encodeShareCode({
        ...theme,
        basedOn: theme.basedOn ?? (isPreset(theme.id) ? theme.id : null),
        css: [theme.css, fileCss].filter(Boolean).join('\n'),
      })
    },

    parseShareCode: decodeShareCode,

    importTheme(theme, origin) {
      const name = uniqueName(theme.name, takenNames())
      const imported = addUserTheme({
        ...structuredClone(theme),
        id: uniqueId(name, takenIds()),
        name,
        basedOn: theme.basedOn && findPreset(theme.basedOn) ? theme.basedOn : null,
      })
      activate(imported, origin)
    },

    retrySave() {
      persistence.retry()
    },

    openFolder(sub) {
      bridge.call('openFolder', { sub }).catch((e: unknown) => console.error('[spotify-custom] openFolder', e))
    },

    restartSpotify() {
      bridge.call('restartSpotify', null).catch((e: unknown) => console.error('[spotify-custom] restartSpotify', e))
    },

    setUpdate(s) {
      if (sameJson(s, update)) return
      update = s
      emit()
    },

    installUpdate() {
      // Optimistic: the helper pushes real progress through setUpdate; a refusal comes back as the call's error.
      update = { ...update, state: 'installing', message: undefined }
      emit()
      bridge.call('installUpdate', null).catch((e: unknown) => {
        console.error('[spotify-custom] installUpdate', e)
        update = { ...update, state: 'failed', message: e instanceof Error ? e.message : String(e) }
        emit()
      })
    },

    // ---------- internals (main.ts) ----------

    async init() {
      restoreCachedThemeCss()
      helper = await bridge.call('getState', null)
      settings = normalizeSettings(helper.settings, DEFAULT_PRESET.id)
      userThemes = helper.userThemes.flatMap(raw => {
        try {
          return [{ ...validateTheme(raw), fileCss: raw.fileCss }]
        } catch (e) {
          console.warn('[spotify-custom] skipped an invalid theme file', e)
          return []
        }
      })
      iconPacks = [...BUILTIN_ICON_PACKS, ...helper.iconPacks]
      // Helpers older than self-update don't send the field.
      const sent: { update?: UpdateStatus } = helper
      update = sent.update ?? { state: 'none', current: helper.version }
      compiled.clear()
      active = findTheme(settings.activeTheme) ?? DEFAULT_PRESET
      if (!helper.settings) persistence.saveSettingsSoon(settings)
      ready = true
      apply()
      emit()
    },

    helperState: () => helper,

    setPartStatus(s) {
      if (sameJson(s, partStatus)) return
      partStatus = s
      emit()
    },

    setLibraryItems(f) {
      if (sameJson(f, libraryItems)) return
      libraryItems = f
      emit()
    },

    setPanelSections(s) {
      if (sameJson(s, panelSections)) return
      panelSections = s
      emit()
    },

    setShelves(s) {
      if (sameJson(s, shelves)) return
      shelves = s
      emit()
    },

    setExtensions(list) {
      if (sameJson(list, extensions)) return
      extensions = list
      emit()
    },

    dispose() {
      persistence.flush()
      clearMorphSuppression()
      recolor.dispose()
      listeners.clear()
    },
  }
}
