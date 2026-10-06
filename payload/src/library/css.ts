// Compiles Settings.artworkStyles into one stylesheet keyed by item URI (no DOM marking, so it survives re-renders
// and virtualised scrolling). Unknown URIs, unknown icons and unsafe values are skipped, never emitted.
import type { ArtworkStyle } from '../types'
import type { ArtworkCss } from './css-values'
import { folderCss } from './folder-css'
import { folderIdFromUri, LIKED_SONGS_URI } from './keys'
import { likedCss } from './liked-css'

export function compileArtworkCss(styles: Record<string, ArtworkStyle>, iconSvg: (id: string) => string | undefined): string {
  const vars: string[] = []
  const rules: string[] = []
  Object.entries(styles).forEach(([uri, style], index) => {
    const varPrefix = `--sc-art-${index}`
    let css: ArtworkCss | null = null
    if (uri === LIKED_SONGS_URI) css = likedCss(varPrefix, style, iconSvg)
    else {
      const folderId = folderIdFromUri(uri)
      if (folderId) css = folderCss(varPrefix, folderId, style, iconSvg)
    }
    if (!css) return
    vars.push(...css.vars)
    rules.push(...css.rules)
  })
  if (rules.length === 0) return ''
  return [vars.length > 0 ? `:root { ${vars.join(' ')} }` : '', ...rules].filter(Boolean).join('\n')
}
