// Settings mutations for library folder looks. Empty styles are removed so settings stay tidy and "Customised"
// badges stay truthful.
import type { ArtworkStyle, Settings } from '../../types'
import { lookup } from './record'

/** Shared and frozen so selectors return a stable value for unstyled folders (no re-render loops). */
const UNSTYLED: ArtworkStyle = Object.freeze({})

export function artworkStyle(settings: Settings, uri: string): ArtworkStyle {
  return lookup(settings.artworkStyles, uri) ?? UNSTYLED
}

export function isArtworkCustomised(settings: Settings, uri: string): boolean {
  return Object.keys(artworkStyle(settings, uri)).length > 0
}

/** Merges a patch into one folder's style; `undefined` values clear that property. */
export function patchArtworkStyle(uri: string, patch: Partial<Record<keyof ArtworkStyle, string | undefined>>) {
  return (s: Settings) => {
    const merged: Record<string, string | undefined> = { ...artworkStyle(s, uri), ...patch }
    const next: Record<string, string> = {}
    for (const [key, value] of Object.entries(merged)) if (value !== undefined) next[key] = value
    const { [uri]: _old, ...others } = s.artworkStyles
    s.artworkStyles = Object.keys(next).length ? { ...others, [uri]: next } : others
  }
}

export function resetArtworkStyle(uri: string) {
  return (s: Settings) => {
    const { [uri]: _old, ...others } = s.artworkStyles
    s.artworkStyles = others
  }
}
