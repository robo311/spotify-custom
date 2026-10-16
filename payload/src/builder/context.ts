// Builder environment shared by every component: the app store, builder-local UI state, and the shadow root.
import { createContext } from 'preact'
import { useContext } from 'preact/hooks'
import type { AppState, Store } from '../types'
import type { LayerRef } from './lib/layer-edits'
import type { Observable } from './lib/observable'
import { useSelect } from './hooks/use-select'

/** The studio's tabs in rail order: theme-wide first, then Spotify's areas as they sit on screen, then the rest. */
export const TAB_IDS = ['themes', 'look', 'topbar', 'library', 'home', 'pages', 'lyrics', 'nowplaying', 'player', 'menu', 'reactive', 'advanced'] as const
export type TabId = (typeof TAB_IDS)[number]

/** Step-by-step guides sharing the tour's overlay: the guided tour, and the showcase of a release's new features. */
export type GuideId = 'tour' | 'whatsNew'

export interface UiSnapshot {
  open: boolean
  tab: TabId
  picking: boolean // pick mode active
  editingArtwork: string | null // folder URI to open in the Library tab (e.g. picked in pick mode)
  focus?: string // section id to bring into view in the open tab (goTo); cleared once shown
  tour?: number // index of the step on screen in the running guide; absent when none is running
  guide?: GuideId // which guide `tour` steps through; absent = the guided tour
  whatsNewSeen?: string | null // id of the last What's new showcase seen (prefs.whatsNewSeen)
  layer?: LayerRef // the bar picture layer selected in the Image section (and in Arrange)
  arranging?: string // bar part id whose layers are being arranged on the real bar; absent otherwise
}

export interface BuilderEnv {
  store: Store
  ui: Observable<UiSnapshot>
  root: ShadowRoot
}

export const BuilderContext = createContext<BuilderEnv | null>(null)

export function useEnv(): BuilderEnv {
  const env = useContext(BuilderContext)
  if (!env) throw new Error('Builder component rendered outside BuilderContext')
  return env
}

/** Select from app state. Selectors must return stable values (state fields), not freshly built objects. */
export function useApp<R>(selector: (s: AppState) => R): R {
  return useSelect(useEnv().store, selector)
}

export function useUi<R>(selector: (s: UiSnapshot) => R): R {
  return useSelect(useEnv().ui, selector)
}
