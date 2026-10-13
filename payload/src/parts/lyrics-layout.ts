// Layout of the lyrics page: the library kept beside the lyrics, our Now playing column, immersive mode, and
// Spotify's native idle mode.
import type { LayoutConfig, Theme } from '../types'
import { renderRules, type CssRule } from './css'
import { COLUMN_HOST, LYRICS_COLUMN_SLOT, OWN_VIEW, PANEL_SLOT, customisesLyricsView } from './lyrics-shared'
import * as S from './selectors'

// While the lyrics view is open Spotify slides the library out (translateX) and stretches the view across
// all three columns; restoring both just takes the view's grid columns back from the library. When Spotify's
// right panel opens (its own Queue/Friends buttons), the view also yields the panel's column:
// library | lyrics | panel (mirrored by the named grid areas when the library is on the right).
// Like our Now playing column, the library sits flush with the window edge (square on that side) instead of leaving
// the grid's 8px gap there, which reads as a dark border beside it (on the blurred cover, the cover at its darkest).
function keepLibraryRules(side: LayoutConfig['librarySide']): CssRule[] {
  const square = { [`border-top-${side}-radius`]: '0', [`border-bottom-${side}-radius`]: '0' }
  return [
    { selector: `${S.LYRICS_VIEW_OPEN} ${S.LEFT_SIDEBAR}`, decls: { transform: 'none', [`margin-${side}`]: 'calc(-1 * var(--panel-gap, 8px))' } },
    { selector: `${S.LYRICS_VIEW_OPEN} :is(${S.LEFT_SIDEBAR}, ${S.LEFT_SIDEBAR} > nav > div)`, decls: square },
    {
      selector: `${S.LYRICS_VIEW_OPEN} ${S.LYRICS_CINEMA_HOST}`,
      decls: { 'grid-column': side === 'left' ? 'main-view / right-sidebar' : 'right-sidebar / main-view' },
    },
    { selector: `${S.LYRICS_VIEW_OPEN}${S.RIGHT_PANEL_OPEN} ${S.LYRICS_CINEMA_HOST}`, decls: { 'grid-column': 'main-view' } },
  ]
}

// Spotify's native idle mode in the lyrics view (JS-toggled classes, also on when the pointer or focus leaves the
// window): the top bar and the player bar fade out and the view grows over both bars with negative margins.
// Themes that customise the lyrics view cancel the growth (immersive mode has its own full-height layout) and,
// without immersive, keep both bars visible. Themes that leave the lyrics view native (e.g. Spotify Original) keep
// Spotify's behaviour.
export function compileLyricsIdle(theme: Pick<Theme, 'lyrics' | 'layout'>): string {
  if (!customisesLyricsView(theme)) return ''
  const rules: CssRule[] = [{ selector: `${S.LYRICS_VIEW_OPEN} ${S.LYRICS_CINEMA_HOST}`, decls: { 'margin-top': '0', 'margin-bottom': '0' } }]
  if (!theme.layout.lyricsImmersive) {
    rules.push({ selector: `${S.LYRICS_VIEW_OPEN} ${TOP_BAR_ITEM}`, decls: { opacity: '1' } })
    rules.push({ selector: `${S.LYRICS_VIEW_OPEN} ${S.PLAYER_BAR}`, decls: { opacity: '1' } })
  }
  return renderRules(rules)
}

const TOP_BAR_ITEM = S.TOP_BAR
const PLAYER_BAR_ITEM = `${S.LAYOUT_GRID} > :has(> ${S.PLAYER_BAR})`
const ABOVE_LYRICS = 'calc(var(--above-everything-grid-area-z-index, 7) + 2)'

const FADE = { transition: 'opacity 280ms cubic-bezier(.2,.8,.2,1)' }
/** Over the grid's padding, flush with the window's top and bottom edges. */
const FLUSH_VERTICAL = { 'margin-top': 'calc(-1 * var(--panel-gap, 8px))', 'margin-bottom': 'calc(-1 * var(--panel-gap, 8px))' }
/** Height of Spotify's top bar. In immersive mode the view header sits below it, so each has its own hover zone. */
const TOP_BAR_HEIGHT = '64px'

/** Shown while hovered or keyboard-focused (:focus-visible, because Spotify puts focus into the view on open). */
const revealed = (selector: string) => `${selector}:is(:hover, :has(:focus-visible))`

// Immersive: the lyrics view (and the library, if kept) take the whole window height; the top bar, the player bar
// and the view's own header row float above and stay invisible until hovered or focused. Opacity (not
// visibility) keeps them hoverable and in the tab order. (Note: selectors here must not nest :has() — Chromium
// drops such rules — so the header gets its own zone instead of sharing the top bar's.)
function immersiveRules(layout: LayoutConfig): CssRule[] {
  const open = S.LYRICS_VIEW_OPEN
  const fullHeight = [S.LYRICS_CINEMA_HOST, ...(layout.lyricsKeepLibrary ? [`${open} ${S.LEFT_SIDEBAR}`] : []), ...(layout.lyricsNowPlaying ? [COLUMN_HOST] : [])].join(', ')
  const bars = `${open} :is(${TOP_BAR_ITEM}, ${PLAYER_BAR_ITEM})`
  const header = `${open} ${S.LYRICS_VIEW_HEADER}`
  return [
    { selector: `${open} :is(${fullHeight})`, decls: { 'grid-row': '1 / -1' } },
    { selector: bars, decls: { opacity: '0', 'z-index': ABOVE_LYRICS, ...FADE } },
    { selector: header, decls: { opacity: '0', translate: `0 ${TOP_BAR_HEIGHT}`, ...FADE } },
    // Lines dissolve before they reach the header row (64–128px into the view) and the player bar (bottom ~80px).
    {
      selector: `${open} :is(${S.LYRICS_SCROLL_VIEWPORT}, ${OWN_VIEW})`,
      decls: { '--sc-lyrics-clear-top': '112px', '--sc-lyrics-fade-top': '184px', '--sc-lyrics-clear-bottom': '72px', '--sc-lyrics-fade-bottom': '152px' },
    },
    { selector: revealed(bars), decls: { opacity: '1' } },
    { selector: revealed(header), decls: { opacity: '1' } },
    // Full height, the kept library also runs to the top and bottom window edges (our column does in its own rules).
    ...(layout.lyricsKeepLibrary
      ? [
          { selector: `${open} ${S.LEFT_SIDEBAR}`, decls: FLUSH_VERTICAL },
          { selector: `${open} :is(${S.LEFT_SIDEBAR}, ${S.LEFT_SIDEBAR} > nav > div)`, decls: { 'border-radius': '0' } },
        ]
      : []),
  ]
}

// Our column takes the right panel's slot while Spotify's own panel (Queue/Friends) is closed; the lyrics view
// gives up that column, and the panel slot (empty, or Spotify's last panel kept hidden) stays out of sight behind it.
// When Spotify's panel opens, the column steps aside and Spotify's own 3-column layout applies.
function nowPlayingColumnRules(layout: LayoutConfig): CssRule[] {
  const on = `${S.LYRICS_VIEW_OPEN}[${LYRICS_COLUMN_SLOT.readyAttr}]:not(${S.RIGHT_PANEL_OPEN})`
  const left = layout.librarySide === 'left'
  const viewColumns = layout.lyricsKeepLibrary ? 'main-view' : left ? 'left-sidebar / main-view' : 'main-view / left-sidebar'
  // Flush with the window edge (over the grid's padding) instead of leaving a strip of dead space beside the lyrics;
  // the corners on that edge go square. Immersive (full height) puts it flush with the top and bottom too, all square.
  const edge = left ? 'right' : 'left'
  const flush = layout.lyricsImmersive
    ? { [`margin-${edge}`]: 'calc(-1 * var(--panel-gap, 8px))', ...FLUSH_VERTICAL, '--sc-lyrics-npv-radius': '0' }
    : { [`margin-${edge}`]: 'calc(-1 * var(--panel-gap, 8px))', '--sc-lyrics-npv-radius': left ? '8px 0 0 8px' : '0 8px 8px 0' }
  return [
    { selector: COLUMN_HOST, decls: { display: 'none' } },
    { selector: `${on} ${S.LYRICS_CINEMA_HOST}`, decls: { 'grid-column': viewColumns } },
    { selector: `${on} ${PANEL_SLOT}`, decls: { visibility: 'hidden' } },
    // The column fills the slot's grid track, so Spotify's own resize bar (on the slot's edge) resizes it too.
    { selector: `${on} ${PANEL_SLOT} ${S.RESIZE_BAR}`, decls: { visibility: 'visible' } },
    {
      selector: `${on} ${COLUMN_HOST}`,
      // contain: its content mustn't size the auto track (that would squeeze the library); the track keeps the
      // panel slot's width, or 320px when Spotify's panel was never opened.
      decls: { display: 'flex', 'grid-area': 'right-sidebar', contain: 'inline-size', 'min-width': '320px', 'min-height': '0', 'z-index': '5', ...flush },
    },
  ]
}

export function compileLyricsLayout(layout: LayoutConfig): string {
  const rules: CssRule[] = []
  if (layout.lyricsKeepLibrary) rules.push(...keepLibraryRules(layout.librarySide))
  if (layout.lyricsNowPlaying) rules.push(...nowPlayingColumnRules(layout))
  if (layout.lyricsImmersive) rules.push(...immersiveRules(layout))
  return renderRules(rules)
}
