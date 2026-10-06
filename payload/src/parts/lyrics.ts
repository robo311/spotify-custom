// Lyrics styling and lyrics-view layout. Spotify colours lyrics through inline --lyrics-color-* and
// --cinema-mode-bg-color-* variables derived from the cover; we override those (!important beats inline)
// on the lyrics view and on the lyrics preview card in the Now playing panel.
import type { LayoutConfig, LyricsStyle, Palette, Theme } from '../types'
import { fontStack } from '../theme/fonts'
import { renderRules, type CssRule, type Declarations } from './css'
import { resolveLyricLines } from './lyric-colors'
import * as S from './selectors'

/** Runtime variables (set by startPartsRuntime). */
export const COVER_URL_VAR = '--sc-cover-url'
export const PAST_LINE_VAR = '--sc-lyrics-past'
export const PAST_LINE_OPACITY_VAR = '--sc-lyrics-past-opacity'

/**
 * Slot for our own "Now playing" column beside the lyrics (layout.lyricsNowPlaying; drawn by src/nowplaying).
 * The column is a host element appended to the layout grid; readyAttr on <html> says it has something to show,
 * so the lyrics view only makes room for it then.
 */
export const LYRICS_COLUMN_SLOT = {
  hostId: 'sc-lyrics-npv',
  readyAttr: 'data-sc-lyrics-npv',
  grid: S.LAYOUT_GRID,
} as const
const COLUMN_HOST = `#${LYRICS_COLUMN_SLOT.hostId}`

const ROOTS = `${S.LYRICS_COLOR_HOSTS}, ${S.NPV_LYRICS_CARD}`
const VIEW_LINES = `${S.LYRICS_CINEMA_BG} ${S.LYRICS_LINE}`
const ALL_LINES = `:is(${S.LYRICS_CINEMA_BG}, ${S.NPV_LYRICS_CARD}) ${S.LYRICS_LINE}`

/** The palette as live CSS variables (see CONVENTIONS.md), so lyric colours follow palette changes. */
const PALETTE_REFS: Palette = {
  background: 'var(--sc-background)',
  surface: 'var(--sc-surface)',
  elevated: 'var(--sc-elevated)',
  text: 'var(--sc-text)',
  textSubdued: 'var(--sc-text-subdued)',
  accent: 'var(--sc-accent)',
  onAccent: 'var(--sc-on-accent)',
  border: 'var(--sc-border)',
}

interface Backdrop {
  /** --lyrics-color-background */
  base: string
  /** --cinema-mode-bg-color-from / -to (the lyrics view's gradient) */
  from: string
  to: string
}

// Line colours on 'accent' use onAccent, so that backdrop is the accent itself (a slight gradient towards the
// background for depth); the palette guarantees onAccent reads on it.
const BACKDROPS: Record<Exclude<LyricsStyle['background'], 'spotify'>, Backdrop> = {
  theme: { base: 'var(--sc-background)', from: 'var(--sc-surface)', to: 'var(--sc-background)' },
  accent: {
    base: 'var(--sc-accent)',
    from: 'var(--sc-accent)',
    to: 'color-mix(in oklab, var(--sc-accent) 82%, var(--sc-background))',
  },
  'cover-blur': { base: 'transparent', from: 'transparent', to: 'transparent' },
}

/** The cover, heavily blurred and darkened, painted behind an element's content. */
function coverBlurRules(selector: string): CssRule[] {
  return [
    { selector, decls: { position: 'relative', isolation: 'isolate', overflow: 'clip' } },
    {
      selector: `${selector}::before`,
      decls: {
        content: '""',
        position: 'absolute',
        inset: '0',
        'z-index': '-1',
        'pointer-events': 'none',
        'background-color': 'var(--sc-background)',
        'background-image': `var(${COVER_URL_VAR}, none)`,
        'background-size': 'cover',
        'background-position': 'center',
        filter: 'blur(72px) saturate(1.4) brightness(0.42)',
        transform: 'scale(1.25)',
      },
    },
  ]
}

function lineDecls(active: string | undefined, inactive: string | undefined, past: string | undefined): Declarations {
  const decls: Declarations = {}
  if (active) Object.assign(decls, { '--lyrics-color-active': active, '--lyrics-color-passed': active })
  if (inactive) Object.assign(decls, { '--lyrics-color-inactive': inactive, '--lyrics-color-messaging': inactive })
  if (past) Object.assign(decls, { [PAST_LINE_VAR]: past, [PAST_LINE_OPACITY_VAR]: '1' })
  return decls
}

// On Spotify's own background only explicitly chosen colours apply; otherwise the automatic ones fill in.
function colourDecls(style: LyricsStyle): Declarations {
  if (style.background === 'spotify') return lineDecls(style.activeLine, style.inactiveLine, style.pastLine)
  const lines = resolveLyricLines(style, PALETTE_REFS)
  return {
    ...lineDecls(lines.activeLine, lines.inactiveLine, lines.pastLine),
    '--lyrics-color-background': BACKDROPS[style.background].base,
  }
}

// Lines dissolve towards the edges instead of colliding with the view's header row (and, in immersive mode,
// the floating bars). The viewport's box doesn't scroll, so the fade stays at the edges.
const EDGE_FADE: CssRule = {
  selector: S.LYRICS_SCROLL_VIEWPORT,
  decls: { 'mask-image': 'linear-gradient(to bottom, transparent 0, #000 11%, #000 89%, transparent 100%)' },
}

// With cover-blur the cover sits behind the whole window while lyrics are open, so the library (kept next to
// the lyrics) and an open right panel show it through a translucent surface. The lyrics view itself is
// transparent then, so the empty right-panel slot it normally covers is hidden while no panel is open.
const TRANSLUCENT_COLUMN = { background: 'transparent', '--background-base': 'color-mix(in oklab, var(--sc-surface) 55%, transparent)' }
const PANEL_SLOT = `${S.RIGHT_SIDEBAR}:not(:has(> [data-overlayscrollbars]))`
const WINDOW_COVER_BLUR: CssRule[] = [
  ...coverBlurRules(`${S.LYRICS_VIEW_OPEN} ${S.LAYOUT_GRID}`),
  { selector: `${S.LYRICS_VIEW_OPEN}:not(${S.RIGHT_PANEL_OPEN}) ${PANEL_SLOT}`, decls: { visibility: 'hidden' } },
  { selector: `${S.LYRICS_VIEW_OPEN} :is(${S.LEFT_SIDEBAR}, ${PANEL_SLOT}, ${COLUMN_HOST})`, decls: TRANSLUCENT_COLUMN },
]

// Spotify frames the lyrics view (and its rounded inner box) with an 8px black outline that fills the panel gaps
// with its own black. On any themed window that reads as a black border; without it the gaps show the theme,
// like everywhere else. (Spotify Original's frame colour is black anyway.)
const NO_FRAME: CssRule = { selector: `${S.LYRICS_CINEMA_HOST}, ${S.LYRICS_CINEMA_HOST} > *`, decls: { outline: 'none' } }

/** CSS for theme.lyrics (lyrics view + preview card). */
export function compileLyrics(style: LyricsStyle): string {
  const rules: CssRule[] = [EDGE_FADE, NO_FRAME, { selector: ROOTS, decls: colourDecls(style) }]
  if (style.background !== 'spotify') {
    const { base, from, to } = BACKDROPS[style.background]
    rules.push({ selector: S.LYRICS_CINEMA_BG, decls: { '--cinema-mode-bg-color-from': from, '--cinema-mode-bg-color-to': to } })
    // The scroll host and the backdrop layer paint --background-base; matching it keeps the edge fade seamless
    // (and, for cover-blur, lets the cover show through).
    rules.push({ selector: S.LYRICS_CINEMA_HOST, decls: { '--background-base': base } })
  }
  if (style.background === 'cover-blur') rules.push(...WINDOW_COVER_BLUR, ...coverBlurRules(S.NPV_LYRICS_CARD))
  if (style.font !== 'theme') rules.push({ selector: ALL_LINES, decls: { 'font-family': fontStack(style.font) } })
  if (style.align === 'center') rules.push({ selector: ALL_LINES, decls: { 'text-align': 'center' } })
  // zoom scales the text together with its line spacing, whatever units Spotify uses.
  if (style.fontScale !== 1) rules.push({ selector: VIEW_LINES, decls: { zoom: String(style.fontScale) } })
  return renderRules(rules)
}

// While the lyrics view is open Spotify slides the library out (translateX) and stretches the view across
// all three columns; restoring both just takes the view's grid columns back from the library. When Spotify's
// right panel opens (its own Queue/Friends buttons), the view also yields the panel's column:
// library | lyrics | panel (mirrored by the named grid areas when the library is on the right).
function keepLibraryRules(side: LayoutConfig['librarySide']): CssRule[] {
  return [
    { selector: `${S.LYRICS_VIEW_OPEN} ${S.LEFT_SIDEBAR}`, decls: { transform: 'none' } },
    {
      selector: `${S.LYRICS_VIEW_OPEN} ${S.LYRICS_CINEMA_HOST}`,
      decls: { 'grid-column': side === 'left' ? 'main-view / right-sidebar' : 'right-sidebar / main-view' },
    },
    { selector: `${S.LYRICS_VIEW_OPEN}${S.RIGHT_PANEL_OPEN} ${S.LYRICS_CINEMA_HOST}`, decls: { 'grid-column': 'main-view' } },
  ]
}

/** True when the theme changes anything about the lyrics view (Spotify Original, for one, doesn't). */
export function customisesLyricsView(theme: Pick<Theme, 'lyrics' | 'layout'>): boolean {
  const l = theme.lyrics
  return (
    l.background !== 'spotify' ||
    l.fontScale !== 1 ||
    l.font !== 'theme' ||
    l.align !== 'left' ||
    l.activeLine !== undefined ||
    l.inactiveLine !== undefined ||
    l.pastLine !== undefined ||
    theme.layout.lyricsKeepLibrary ||
    theme.layout.lyricsImmersive ||
    theme.layout.lyricsNowPlaying
  )
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

// Opening and closing the lyrics view. Spotify runs it as a View Transition (html[data-transition="cinema-…"]) that
// morphs its Now playing panel into the full view; we give that morph a calmer, physical curve, let the first lines
// rise in one after another, and slide our own Now playing column in and out as a transition layer of its own.
// On close, Spotify's Now playing panel returns: its background morphs into place as a layer above the page snapshot
// and its cover fades in as another, but its text is in the page snapshot, hidden under the morphing background until
// the morph ends. Giving the panel's visible content a layer too makes it fade in together with the cover.
const EASE = 'cubic-bezier(.2, .8, .2, 1)'
const CASCADE_LINES = 14
const COLUMN_LAYER = 'sc-lyrics-npv'
const PANEL_CONTENT_LAYER = 'sc-npv-content'

export function compileLyricsMotion(theme: Pick<Theme, 'lyrics' | 'layout'>): string {
  if (!customisesLyricsView(theme)) return ''
  const vt = 'html[data-transition^="cinema"]'
  const lines = Array.from({ length: CASCADE_LINES }, (_, i) =>
    `  ${S.LYRICS_VIEW_OPEN} ${VIEW_LINES}:nth-child(${i + 1}) { animation: sc-lyric-in 640ms ${EASE}; animation-delay: ${160 + i * 45}ms; animation-fill-mode: backwards; }`,
  )
  const column = theme.layout.lyricsNowPlaying
    ? [
        `  ${S.LYRICS_VIEW_OPEN} ${COLUMN_HOST} { view-transition-name: ${COLUMN_LAYER}; }`,
        `  ::view-transition-new(${COLUMN_LAYER}) { animation: sc-npv-in 560ms ${EASE} both; }`,
        `  ::view-transition-old(${COLUMN_LAYER}) { animation: sc-npv-out 300ms cubic-bezier(.4, 0, 1, 1) both; }`,
        '  @keyframes sc-npv-in { from { opacity: 0; transform: translateX(56px); } }',
        '  @keyframes sc-npv-out { to { opacity: 0; transform: translateX(56px); } }',
      ]
    : []
  return [
    '@media (prefers-reduced-motion: no-preference) {',
    `  ${vt}::view-transition-group(*) { animation-duration: 520ms !important; animation-timing-function: ${EASE} !important; }`,
    `  ${vt}::view-transition-old(root), ${vt}::view-transition-new(root) { animation-duration: 360ms !important; }`,
    `  ${S.LYRICS_VIEW_CLOSING} ${S.NPV_SCROLL_VIEWPORT} { view-transition-name: ${PANEL_CONTENT_LAYER}; }`,
    ...lines,
    '  @keyframes sc-lyric-in { from { opacity: 0; transform: translateY(14px); } }',
    ...column,
    '}',
  ].join('\n')
}

const TOP_BAR_ITEM = S.TOP_BAR
const PLAYER_BAR_ITEM = `${S.LAYOUT_GRID} > :has(> ${S.PLAYER_BAR})`
const ABOVE_LYRICS = 'calc(var(--above-everything-grid-area-z-index, 7) + 2)'

const FADE = { transition: 'opacity 280ms cubic-bezier(.2,.8,.2,1)' }
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
    { selector: revealed(bars), decls: { opacity: '1' } },
    { selector: revealed(header), decls: { opacity: '1' } },
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
  // the corners on that edge go square.
  const edge = left ? 'right' : 'left'
  const flush = { [`margin-${edge}`]: 'calc(-1 * var(--panel-gap, 8px))', '--sc-lyrics-npv-radius': left ? '8px 0 0 8px' : '0 8px 8px 0' }
  return [
    { selector: COLUMN_HOST, decls: { display: 'none' } },
    { selector: `${on} ${S.LYRICS_CINEMA_HOST}`, decls: { 'grid-column': viewColumns } },
    { selector: `${on} ${PANEL_SLOT}`, decls: { visibility: 'hidden' } },
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
