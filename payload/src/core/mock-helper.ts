// Stand-in for the Go helper, backed by localStorage. Used when the payload is injected without the helper
// (dev tools, tests) or when the helper doesn't answer. Behaves like the real helper for every bridge op.
import type { BridgeOp, BridgeOps, HelperState, Settings, Theme } from '../types'

const STORAGE_KEY = 'sc:mock-state'

interface MockData {
  settings: Settings | null
  themes: Record<string, Theme>
}

export type BridgeHandlers = { [K in BridgeOp]: (args: BridgeOps[K]['args']) => BridgeOps[K]['result'] }

export function createMockHelper(storage: Storage = localStorage): BridgeHandlers {
  const load = (): MockData => {
    try {
      const raw = storage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw) as MockData
    } catch {
      // Corrupt mock data: start fresh.
    }
    return { settings: null, themes: {} }
  }
  const save = (data: MockData) => {
    storage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  return {
    getState: (): HelperState => {
      const data = load()
      return {
        settings: data.settings,
        userThemes: Object.values(data.themes),
        iconPacks: [],
        extensions: [],
        dataDir: '(browser storage — helper not connected)',
        version: 'dev',
        platform: 'mock',
        update: { state: 'none', current: 'dev' },
      }
    },
    saveSettings: settings => {
      save({ ...load(), settings })
      return null
    },
    saveTheme: theme => {
      const data = load()
      save({ ...data, themes: { ...data.themes, [theme.id]: theme } })
      return null
    },
    deleteTheme: ({ id }) => {
      const data = load()
      const { [id]: _removed, ...themes } = data.themes
      save({ ...data, themes })
      return null
    },
    openFolder: ({ sub }) => {
      console.info(`[spotify-custom] (mock) would open the customisations folder${sub ? `/${sub}` : ''}`)
      return null
    },
    restartSpotify: () => {
      console.info('[spotify-custom] (mock) would restart Spotify')
      return null
    },
    installUpdate: () => {
      console.info('[spotify-custom] (mock) would install a helper update')
      return null
    },
    // Only the helper can hear Spotify, so without it music-reactive is unavailable either way.
    audio: () => ({ state: 'unsupported', latencyMs: 0, message: "The Spotify Custom helper isn't connected" }),
  }
}
