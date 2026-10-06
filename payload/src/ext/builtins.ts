// Registry of extensions that ship with the app. Adding one = one import + one entry.
import type { ExtensionDef } from '../types'
import { statsExtension } from './stats'

export const BUILT_IN_EXTENSIONS: readonly ExtensionDef[] = [statsExtension]
