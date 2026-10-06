// HomeConfig → CSS. Shelves are flex items of one wrapping container, so `order` reorders them without moving
// React-owned nodes. Ordered shelves come first (after Spotify's shortcut grid, which keeps order 0);
// all others share one order value and so keep their natural DOM order after them.
import type { HomeConfig } from '../types'
import { compileKeyedSectionsCss, keySelector } from '../parts'
import { ALL_FILTER_CHIP, HOME_PAGE, MAIN_VIEW, SHELF_KEY_ATTR } from './selectors'

export function shelfSelector(key: string): string {
  return keySelector(`${HOME_PAGE} `, SHELF_KEY_ATTR, key)
}

/** Layout for our own shelf hosts so they sit in the flex container like native shelves. */
const HOST_CSS = `${HOME_PAGE} [${SHELF_KEY_ATTR}].sc-shelf { flex: 0 0 100%; min-width: 0; }`

/** Our shelves belong to the unfiltered Home only, not to the Music/Podcasts filtered views. */
const FILTERED_CSS = `${MAIN_VIEW}:has(${ALL_FILTER_CHIP}[aria-checked="false"]) ${HOME_PAGE} [${SHELF_KEY_ATTR}^="ext:"] { display: none !important; }`

export function compileHomeCss(config: HomeConfig): string {
  const sections = compileKeyedSectionsCss({
    items: `${HOME_PAGE} [${SHELF_KEY_ATTR}]`,
    byKey: shelfSelector,
    hidden: config.hidden,
    order: config.order,
  })
  return [HOST_CSS, FILTERED_CSS, sections].filter(Boolean).join('\n')
}
