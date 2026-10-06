// Extension lifecycle: keeps the set of running extensions in sync with settings.extensions.
// - Built-ins are on unless switched off; user files are off until switched on, and are not even evaluated before that.
// - A crash (in start, a callback, or a shelf render) stops only that extension and surfaces the error.
// - A crashed extension is retried the next time the user changes extension settings.
import type { ExtensionDef, ExtensionInfo, Settings, Store, UserExtensionFile } from '../types'
import type { HomeController } from '../home'
import { createExtensionScope, type ExtensionScope } from './context'
import { nameFromFile, parseExtensionMetadata } from './metadata'
import { evaluateUserExtension, isExtensionDef } from './user-extensions'

export interface ExtensionHost {
  register(def: ExtensionDef, builtIn?: boolean): void
  list(): ExtensionInfo[]
  dispose(): void
}

export interface HostDeps {
  store: Store
  home: HomeController
  onChange: (list: ExtensionInfo[]) => void
}

interface Entry {
  key: string // settings.extensions key and ExtensionInfo.id
  builtIn: boolean
  def: ExtensionDef | null // null for a user file that hasn't been evaluated yet
  file?: UserExtensionFile
  fallbackName: string
  description?: string
  running: { scope: ExtensionScope; stop?: () => void } | null
  error?: string
}

const USER_FILE_PREFIX = 'file:'

export function userFileKey(file: string): string {
  return USER_FILE_PREFIX + file
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function createExtensionHost({ store, home, onChange }: HostDeps): ExtensionHost & {
  addUserFile(file: UserExtensionFile): void
  sync(): void
} {
  const entries = new Map<string, Entry>()
  /** While a user file evaluates, registrations (via its scoped SC or window.SC) go here instead of the registry. */
  let captureRegistration: ((def: unknown) => void) | null = null
  let disposed = false

  const wantsEnabled = (entry: Entry, settings: Settings) => settings.extensions[entry.key] ?? entry.builtIn

  const info = (entry: Entry): ExtensionInfo => ({
    id: entry.key,
    name: entry.def?.name ?? entry.fallbackName,
    description: entry.def?.description ?? entry.description,
    builtIn: entry.builtIn,
    enabled: wantsEnabled(entry, store.get().settings) && entry.error === undefined,
    ...(entry.error !== undefined && { error: entry.error }),
  })

  const list = () => [...entries.values()].map(info)
  const notify = () => {
    if (!disposed) onChange(list())
  }

  const stop = (entry: Entry) => {
    const running = entry.running
    if (!running) return
    entry.running = null
    try {
      running.stop?.()
    } catch (error) {
      console.error(`[spotify-custom] extension "${entry.key}" stop failed`, error)
    }
    running.scope.dispose()
  }

  const crash = (entry: Entry, error: unknown) => {
    console.error(`[spotify-custom] extension "${entry.key}" crashed and was stopped`, error)
    stop(entry)
    entry.error = errorMessage(error)
    notify()
  }

  /** The entry's definition, evaluating its user file on first use. Throws if the file doesn't register one. */
  const loadDefinition = (entry: Entry): ExtensionDef => {
    if (entry.def) return entry.def
    if (!entry.file) throw new Error('Extension has no definition')
    const captured: { def: ExtensionDef | null } = { def: null }
    captureRegistration = def => {
      if (!isExtensionDef(def)) console.error('[spotify-custom] registerExtension needs { id, name, start }', def)
      else if (captured.def) console.warn(`[spotify-custom] ${entry.key} registered more than one extension; using the first`)
      else captured.def = def
    }
    try {
      evaluateUserExtension(entry.file.file, entry.file.source, { registerExtension: def => register(def) })
    } finally {
      captureRegistration = null
    }
    if (!captured.def) throw new Error('The file did not call SC.registerExtension(…)')
    entry.def = captured.def
    return captured.def
  }

  const start = (entry: Entry) => {
    try {
      const def = loadDefinition(entry)
      const scope = createExtensionScope({
        extensionId: entry.key,
        store,
        home,
        onCrash: error => crash(entry, error),
      })
      const running: NonNullable<Entry['running']> = { scope }
      entry.running = running
      const cleanup = def.start(scope.ctx)
      // A guarded callback may have crashed the extension during start(); then cleanup has nothing left to stop.
      if (typeof cleanup === 'function') {
        if (entry.running === running) running.stop = cleanup
        else cleanup()
      }
    } catch (error) {
      crash(entry, error)
    }
  }

  const sync = (retryCrashed = false) => {
    if (disposed) return
    const settings = store.get().settings
    for (const entry of entries.values()) {
      if (retryCrashed) delete entry.error
      const shouldRun = wantsEnabled(entry, settings) && entry.error === undefined
      if (shouldRun && !entry.running) start(entry)
      else if (!shouldRun && entry.running) stop(entry)
    }
    notify()
  }

  function register(def: unknown, builtIn = false): void {
    // Inside a user file's evaluation the def belongs to that file's entry (one extension per file).
    if (captureRegistration) {
      captureRegistration(def)
      return
    }
    if (!isExtensionDef(def)) {
      console.error('[spotify-custom] registerExtension needs { id, name, start }', def)
      return
    }
    if (entries.has(def.id)) {
      console.warn(`[spotify-custom] extension "${def.id}" is already registered`)
      return
    }
    entries.set(def.id, { key: def.id, builtIn, def, fallbackName: def.name, description: def.description, running: null })
    sync()
  }

  const addUserFile = (file: UserExtensionFile) => {
    const key = userFileKey(file.file)
    if (entries.has(key)) return
    const metadata = parseExtensionMetadata(file.source)
    entries.set(key, {
      key,
      builtIn: false,
      def: null,
      file,
      fallbackName: metadata.name ?? nameFromFile(file.file),
      description: metadata.description,
      running: null,
    })
  }

  let lastExtensions = store.get().settings.extensions
  const unsubscribe = store.subscribe(state => {
    if (state.settings.extensions === lastExtensions) return
    lastExtensions = state.settings.extensions
    sync(true)
  })

  return {
    register: (def, builtIn) => register(def, builtIn),
    list,
    addUserFile,
    sync: () => sync(),
    dispose() {
      if (disposed) return
      unsubscribe()
      for (const entry of entries.values()) stop(entry)
      disposed = true
    },
  }
}
