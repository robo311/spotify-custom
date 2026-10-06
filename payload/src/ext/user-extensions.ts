// Evaluates a user extension file. Spotify's page has no Content-Security-Policy (verified on 1.3.3), so
// `new Function` works; the sourceURL makes the file show up by name in DevTools stack traces.
import type { ExtensionDef } from '../types'

export interface ScopedSc {
  registerExtension(def: ExtensionDef): void
}

/** Runs the file's top-level code with `SC` bound to `sc`. Throws whatever the file throws. */
export function evaluateUserExtension(file: string, source: string, sc: ScopedSc): void {
  const safeName = file.replace(/[^\w.-]/g, '_')
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- running user-provided extension code is the feature
  const run = new Function('SC', `${source}\n//# sourceURL=spotify-custom/extensions/${safeName}`) as (sc: ScopedSc) => void
  run(sc)
}

/** Narrowing at the boundary: user code can pass anything to registerExtension. */
export function isExtensionDef(value: unknown): value is ExtensionDef {
  if (typeof value !== 'object' || value === null) return false
  const def = value as Record<string, unknown>
  return typeof def.id === 'string' && def.id !== '' && typeof def.name === 'string' && typeof def.start === 'function'
}
