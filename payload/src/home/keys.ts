// Language-independent identity for Home shelves. Titles are localised, so shelves are keyed by the
// section their "Show all" link points to (e.g. /section/0JQ5…, /recents). Shelves without one fall back to
// their first link, which may change daily — those are reported as not stable. The new-release block has a fixed key.
import { ANY_LINK, RELEASE_KEY, RELEASE_SHELF, SEE_ALL_LINK, SHELF_TITLE } from './selectors'

export const EXTENSION_KEY_PREFIX = 'ext:'

export interface ShelfIdentity {
  key: string
  stable: boolean
}

/** Path part of an href ("https://x/section/1?a=b" → "/section/1"), or null for empty/unparsable values. */
export function hrefPath(href: string | null): string | null {
  if (!href) return null
  try {
    return new URL(href, 'https://open.spotify.com').pathname
  } catch {
    return null
  }
}

export function shelfIdentity(shelf: Element): ShelfIdentity | null {
  if (shelf.matches(RELEASE_SHELF)) return { key: RELEASE_KEY, stable: true }
  const seeAll = hrefPath(shelf.querySelector(SEE_ALL_LINK)?.getAttribute('href') ?? null)
  if (seeAll) return { key: seeAll, stable: true }
  const firstLink = hrefPath(shelf.querySelector(ANY_LINK)?.getAttribute('href') ?? null)
  if (firstLink) return { key: `first:${firstLink}`, stable: false }
  return null
}

export function shelfTitle(shelf: Element): string {
  // "New release from" is a line above the artist's name (the h2).
  if (shelf.matches(RELEASE_SHELF)) return [...shelf.querySelectorAll('p, h2')].map(el => el.textContent.trim()).join(' ')
  return shelf.querySelector(SHELF_TITLE)?.textContent.trim() ?? ''
}

export function extensionKey(id: string): string {
  return `${EXTENSION_KEY_PREFIX}${id}`
}
