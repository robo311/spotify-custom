// Reads library item identity (folders, Liked Songs) from Spotify's markup.
import type { LibraryItemInfo } from '../types'
import { LIBRARY_ENTRY, LIKED_COVER } from './selectors'

/** Settings key for Liked Songs: the URI Spotify itself uses for it on Home (one per user, so a constant). */
export const LIKED_SONGS_URI = 'spotify:collection:tracks'

const FOLDER_URI = /^(?:listrow|card)-title-(spotify:user:[^:\s]+:folder:[^:\s]+)$/

function titleRef(labelledBy: string | null): string {
  return labelledBy?.trim().split(/\s+/)[0] ?? ''
}

/** "listrow-title-spotify:user:u:folder:f listrow-subtitle-…" → "spotify:user:u:folder:f" (null if not a folder). */
export function folderUriFromLabelledBy(value: string | null): string | null {
  return FOLDER_URI.exec(titleRef(value))?.[1] ?? null
}

/** "spotify:user:u:folder:f" → "f" */
export function folderIdFromUri(uri: string): string | null {
  const marker = ':folder:'
  const at = uri.lastIndexOf(marker)
  const id = at >= 0 ? uri.slice(at + marker.length) : ''
  return id === '' ? null : id
}

/** The library item a row/card represents (name read from the element its aria-labelledby points to). */
export function readLibraryItem(entry: Element): LibraryItemInfo | null {
  const labelledBy = entry.getAttribute('aria-labelledby')
  const name = () => entry.ownerDocument.getElementById(titleRef(labelledBy))?.textContent.trim() ?? ''
  const folderUri = folderUriFromLabelledBy(labelledBy)
  if (folderUri) return { kind: 'folder', uri: folderUri, name: name() }
  if (entry.querySelector(LIKED_COVER)) return { kind: 'liked', uri: LIKED_SONGS_URI, name: name() }
  return null
}

/** The customisable library item under `el` (e.g. for pick mode), or null. */
export function libraryItemAt(el: Element): LibraryItemInfo | null {
  const entry = el.closest(LIBRARY_ENTRY)
  return entry ? readLibraryItem(entry) : null
}
