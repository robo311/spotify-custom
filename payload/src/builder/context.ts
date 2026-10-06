// Builder environment shared by every component: the app store, builder-local UI state, and the shadow root.
import { createContext } from 'preact'
import { useContext } from 'preact/hooks'
import type { AppState, Store } from '../types'
import type { Observable } from './lib/observable'
import { useSelect } from './hooks/use-select'

export type TabId = 'start' | 'colours' | 'parts' | 'layout' | 'lyrics' | 'reactive' | 'home' | 'pages' | 'library' | 'icons' | 'extensions' | 'share' | 'advanced'

export interface UiSnapshot {
  open: boolean
  tab: TabId
  picking: boolean // pick mode active
  editingArtwork: string | null // folder URI to open in the Library tab (e.g. picked in pick mode)
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
