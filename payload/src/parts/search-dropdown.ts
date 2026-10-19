// The search suggestions' layout: row spacing, cover and text sizes, how tall the dropdown grows, and which bits of
// text show; and long text scrolling on hover. Pure CSS generation; the colours are the searchDropdown part's (registry.ts).
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

/**
 * Long titles and subtitles end in "…"; on the active row they scroll by exactly their overflow (100cqw is the text
 * column's width, 100% the line's own) and back, so the whole text can be read and short ones don't move. The text
 * column takes the row's free width and may shrink, so the shortcut buttons stay on its line.
 */
// One rule per line rather than a selector list: happy-dom splits lists at the comma inside :is(:hover, …).
const ACTIVE_LINES = S.SEARCH_ROW_LINES.map(line => `${S.SEARCH_ROW_ACTIVE} :has(> [data-encore-id="listRowSubtitle"]) ${line}`)
const SCROLL: CssRule[] = [
  { selector: S.SEARCH_ROW_TEXT, decls: { 'container-type': 'inline-size', flex: '1 1 0', 'min-width': '0' } },
  { selector: `${S.SEARCH_ROW_TEXT} > *`, decls: { 'max-width': '100%', overflow: 'hidden' } },
  ...ACTIVE_LINES.map(selector => ({
    selector,
    decls: { display: 'inline-block', width: 'max-content', 'max-width': 'none', overflow: 'visible', '-webkit-line-clamp': 'none' },
  })),
]
// Keyframes can't take !important (renderRules adds it), so this part is written out.
const SCROLL_MOTION = `@media (prefers-reduced-motion: no-preference) {
${ACTIVE_LINES.map(sel => `${sel} { animation: sc-search-scroll 7s ease-in-out infinite alternate !important; }`).join('\n')}
}
@keyframes sc-search-scroll { 0%, 15% { transform: none; } 85%, 100% { transform: translateX(min(0px, calc(100cqw - 100%))); } }`

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

/** The scroll on hover, for every theme (not a layout option, so the default layout still compiles to nothing). */
export function searchTextScrollCss(): string {
  return `${renderRules(SCROLL)}\n${SCROLL_MOTION}`
}
