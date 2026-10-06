// Home's shortcut grid (the quick-pick cards at the top): card height and column count from theme.homeStyle.
// Spotify sizes the cards through --item-height on the grid (per container width); ours wins when set.
import type { HomeStyle } from '../types'
import { renderRules, type Declarations } from './css'
import { SHORTCUT_GRID } from './selectors'

const HEIGHTS: Record<Exclude<HomeStyle['shortcutSize'], 'spotify'>, string> = { small: '48px', medium: '64px', large: '88px' }

export function compileHomeLook(style: HomeStyle): string {
  const decls: Declarations = {}
  if (style.shortcutSize !== 'spotify') decls['--item-height'] = HEIGHTS[style.shortcutSize]
  if (style.shortcutColumns !== 0) decls['grid-template-columns'] = `repeat(${style.shortcutColumns}, minmax(0, 1fr))`
  return renderRules([{ selector: SHORTCUT_GRID, decls }])
}
