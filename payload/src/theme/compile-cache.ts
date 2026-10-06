// Memoises theme compilation by content, so switching back and forth (hover-to-preview, undo/redo) reuses CSS
// instead of recompiling. Keyed by a hash of everything compileTheme reads.
import type { Theme } from '../types'
import { compileTheme, type CompileContext } from './compile'

const LIMIT = 48

/** FNV-1a, 32-bit. Collisions only cost a wrong cache hit between two near-identical themes; the key also includes the length. */
export function hashString(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `${(h >>> 0).toString(36)}:${s.length.toString(36)}`
}

export interface CompileCache {
  compile(theme: Theme, ctx: CompileContext): string
  /** Call when the context changes (e.g. icon packs reloaded). */
  clear(): void
}

export function createCompileCache(): CompileCache {
  const cache = new Map<string, string>()
  return {
    compile(theme, ctx) {
      const key = hashString(JSON.stringify([theme, ctx.fileCss ?? '', ctx.iconPacks.map(p => p.id)]))
      const hit = cache.get(key)
      if (hit !== undefined) {
        // Refresh recency (Map keeps insertion order).
        cache.delete(key)
        cache.set(key, hit)
        return hit
      }
      const css = compileTheme(theme, ctx)
      cache.set(key, css)
      if (cache.size > LIMIT) cache.delete(cache.keys().next().value ?? key)
      return css
    },
    clear: () => cache.clear(),
  }
}
