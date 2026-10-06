// Test-only fakes for the store and Home controller (the real ones live in other modules).
import type { AppState, Settings, ShelfDef, Store, Theme } from '../types'
import type { HomeController } from '../home'
import { defaultEffects, defaultHomeStyle, defaultLayout, defaultLyrics, defaultPageStyle, defaultSettings } from '../theme/model'

export function fakeTheme(id = 'darcula'): Theme {
  return {
    schema: 1,
    id,
    name: id,
    basedOn: null,
    palette: {
      background: '#1e1f22',
      surface: '#2b2d30',
      elevated: '#393b40',
      text: '#dfe1e5',
      textSubdued: '#868a91',
      accent: '#3574f0',
      onAccent: '#ffffff',
      border: '#43454a',
    },
    font: 'inter',
    radius: 6,
    parts: {},
    layout: defaultLayout(),
    icons: 'line',
    iconOverrides: {},
    homeStyle: defaultHomeStyle(),
    pageStyle: defaultPageStyle(),
    effects: defaultEffects(),
    lyrics: defaultLyrics(),
    css: '',
  }
}

export function fakeStore(settings: Partial<Settings> = {}): Store & { setActive(theme: Theme): void } {
  let state: AppState = {
    ready: true,
    settings: { ...defaultSettings('darcula'), ...settings },
    presets: [],
    userThemes: [],
    active: fakeTheme(),
    activeIsPreset: true,
    iconPacks: [],
    extensions: [],
    partStatus: {},
    shelves: [],
    panelSections: [],
    libraryItems: [],
    saveStatus: 'local',
    canUndo: false,
    canRedo: false,
    helper: { connected: false, dataDir: '', platform: 'mock', version: 'test' },
    update: { state: 'none', current: 'test' },
  }
  const listeners = new Set<(s: AppState) => void>()
  const emit = () => {
    for (const listener of [...listeners]) listener(state)
  }
  const unused = () => {
    throw new Error('not used in these tests')
  }
  return {
    get: () => state,
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    editSettings(mutate) {
      const draft = structuredClone(state.settings)
      mutate(draft)
      state = { ...state, settings: draft }
      emit()
    },
    setExtensionEnabled(id, enabled) {
      this.editSettings(draft => {
        draft.extensions[id] = enabled
      })
    },
    setActive(theme) {
      state = { ...state, active: theme }
      emit()
    },
    edit: unused,
    preview: unused,
    selectTheme: unused,
    undo: unused,
    redo: unused,
    resetToPreset: unused,
    saveAs: unused,
    renameTheme: unused,
    deleteTheme: unused,
    exportShareCode: unused,
    parseShareCode: unused,
    importTheme: unused,
    openFolder: unused,
    restartSpotify: unused,
    retrySave: unused,
    setUpdate: unused,
    installUpdate: unused,
  }
}

export interface FakeHome extends HomeController {
  mounted: Map<string, { def: ShelfDef; el: HTMLElement; cleanup?: () => void }>
}

/** Mounts shelves into detached elements immediately, like the real Home does once the page is on screen. */
export function fakeHome(): FakeHome {
  const mounted: FakeHome['mounted'] = new Map()
  return {
    mounted,
    refresh: () => undefined,
    addShelf(def) {
      const el = document.createElement('div')
      const cleanup = def.render(el)
      mounted.set(def.id, { def, el, cleanup: typeof cleanup === 'function' ? cleanup : undefined })
      return () => {
        mounted.get(def.id)?.cleanup?.()
        mounted.delete(def.id)
      }
    },
    dispose: () => undefined,
  }
}
