// The search suggestions' layout: row spacing, cover and text sizes, how tall the dropdown grows, and which bits of
// text show. Pure CSS generation; the colours are the searchDropdown part's (registry.ts).
import type { SearchDropdownLayout } from '../types'
import { hideRule, renderRules, type CssRule } from './css'
import * as S from './selectors'

/** Padding above and below each row; Spotify's is 8px (4px on search terms). */
const ROW_PADDING: Record<Exclude<SearchDropdownLayout['density'], 'spotify'>, number> = { compact: 4, dense: 2 }
const SPOTIFY_IMAGE = 48
const SPOTIFY_TEXT = 16
/** Subtitles are this much smaller than titles, as in Spotify's own. */
const SUBTITLE_STEP = 2

const px = (n: number) => `${String(n)}px`

export function compileSearchDropdown(layout: SearchDropdownLayout): string {
  const rules: CssRule[] = []
  if (layout.density !== 'spotify') rules.push({ selector: S.SEARCH_ROW, decls: { 'padding-block': px(ROW_PADDING[layout.density]) } })
  if (layout.imageSize !== SPOTIFY_IMAGE) {
    const size = px(layout.imageSize)
    rules.push(
      { selector: S.SEARCH_ROW_IMAGES.join(', '), decls: { width: size, height: size, 'min-width': size } },
      { selector: S.SEARCH_TERM_ICON, decls: { width: px(Math.round(layout.imageSize / 2)), height: px(Math.round(layout.imageSize / 2)) } },
    )
  }
  const subtitle = layout.textSize - SUBTITLE_STEP
  if (layout.textSize !== SPOTIFY_TEXT) {
    // Search terms' titles wrap their text in an Encore text span that sets its own size.
    const withText = (sel: string) => `${sel}, ${sel} ${S.ENCORE_TEXT}`
    rules.push(
      { selector: withText(S.SEARCH_ROW_TITLE), decls: { 'font-size': px(layout.textSize) } },
      { selector: withText(S.SEARCH_ROW_SUBTITLE), decls: { 'font-size': px(subtitle) } },
    )
  }
  if (layout.maxHeight !== null) {
    rules.push({ selector: S.SEARCH_DROPDOWN, decls: { height: px(layout.maxHeight) } }, { selector: S.SEARCH_PANEL, decls: { 'max-height': px(layout.maxHeight) } })
  }
  if (layout.hideHints) rules.push(hideRule([S.SEARCH_HINTS]))
  if (layout.hideTypeLabel) {
    // "Song • tripleS": the type and the artist are spans, the bullet a bare text node between them. A zero font size
    // on their parent hides the bullet; an artist suggestion says only "Artist", so a lone type stays.
    const line = `${S.SEARCH_ROW_SUBTITLE} > span`
    rules.push(
      { selector: line, decls: { 'font-size': '0' } },
      { selector: `${line} > span`, decls: { 'font-size': px(subtitle) } },
      hideRule([`${line} > span:first-child:not(:only-child)`]),
    )
  }
  return renderRules(rules)
}
