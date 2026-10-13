// Lyrics colours, background and text. Spotify colours lyrics through inline --lyrics-color-* and
// --cinema-mode-bg-color-* variables derived from the cover; we override those (!important beats inline)
// on the lyrics view and on the lyrics preview card in the Now playing panel.
import type { LyricsStyle, Palette } from '../types'
import { fontStack } from '../theme/fonts'
import { renderRules, type CssRule, type Declarations } from './css'
import { resolveLyricLines } from './lyric-colors'
import { COLUMN_HOST, COVER_URL_VAR, LYRICS_VIEW_SLOT, PANEL_SLOT, PAST_LINE_OPACITY_VAR, PAST_LINE_VAR, VIEW_LINES } from './lyrics-shared'
import * as S from './selectors'

const ROOTS = `${S.LYRICS_COLOR_HOSTS}, ${S.NPV_LYRICS_CARD}`
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

/** The blur's radius; it fades out over about three times that towards the edges of its box. */
const COVER_BLUR = 72

/**
 * The cover, heavily blurred and darkened, painted behind an element's content. bleed runs it past the element's
 * edges, so the blur's fade-out falls outside them (and the edges show the cover, not the background).
 */
function coverBlurRules(selector: string, bleed = 0): CssRule[] {
  return [
    { selector, decls: { position: 'relative', isolation: 'isolate', overflow: 'clip' } },
    {
      selector: `${selector}::before`,
      decls: {
        content: '""',
        position: 'absolute',
        inset: bleed ? `-${bleed}px` : '0',
        'z-index': '-1',
        'pointer-events': 'none',
        'background-color': 'var(--sc-background)',
        'background-image': `var(${COVER_URL_VAR}, none)`,
        'background-size': 'cover',
        'background-position': 'center',
        filter: `blur(${COVER_BLUR}px) saturate(1.4) brightness(0.42)`,
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
// the floating bars). The viewport's box doesn't scroll, so the fade stays at the edges. Each edge is fully clear up
// to --sc-lyrics-clear-* and fully opaque from --sc-lyrics-fade-* (immersive mode moves both past the floating bars).
const EDGE_FADE: CssRule = {
  selector: S.LYRICS_SCROLL_VIEWPORT,
  decls: {
    'mask-image':
      'linear-gradient(to bottom, transparent var(--sc-lyrics-clear-top, 48px), #000 var(--sc-lyrics-fade-top, 120px), ' +
      '#000 calc(100% - var(--sc-lyrics-fade-bottom, 11%)), transparent calc(100% - var(--sc-lyrics-clear-bottom, 0px)))',
  },
}

// With cover-blur the cover sits behind the whole window while lyrics are open, so the library (kept next to
// the lyrics) and an open right panel show it through a translucent surface. The lyrics view itself is
// transparent then, so the empty right-panel slot it normally covers is hidden while no panel is open.
const TRANSLUCENT_COLUMN = { background: 'transparent', '--background-base': 'color-mix(in oklab, var(--sc-surface) 55%, transparent)' }
const WINDOW_COVER_BLUR: CssRule[] = [
  ...coverBlurRules(`${S.LYRICS_VIEW_OPEN} ${S.LAYOUT_GRID}`, 3 * COVER_BLUR),
  { selector: `${S.LYRICS_VIEW_OPEN}:not(${S.RIGHT_PANEL_OPEN}) ${PANEL_SLOT}`, decls: { visibility: 'hidden' } },
  { selector: `${S.LYRICS_VIEW_OPEN} :is(${S.LEFT_SIDEBAR}, ${PANEL_SLOT}, ${COLUMN_HOST})`, decls: TRANSLUCENT_COLUMN },
  // The see-through view runs over the gaps beside it, so its header fade reaches the columns on either side
  // instead of stopping 8px short of them over a strip of bare cover.
  { selector: `${S.LYRICS_VIEW_OPEN} ${S.LYRICS_CINEMA_HOST}`, decls: { 'margin-inline': 'calc(-1 * var(--panel-gap, 8px))' } },
  // Spotify's resize bars sit in those gaps on the columns' edges; the columns go above the view (which Spotify raises
  // to its "above everything" level while open) so the bars stay draggable.
  {
    selector: `${S.LYRICS_VIEW_OPEN} :is(${S.LEFT_SIDEBAR}, ${PANEL_SLOT})`,
    decls: { 'z-index': 'calc(var(--above-everything-grid-area-z-index, 7) + 1)' },
  },
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
  // Spotify's backdrop layers are siblings of the lines' container, so hiding only that keeps the background.
  if (style.animated.on) {
    rules.push({ selector: `[${LYRICS_VIEW_SLOT.ownAttr}] ${S.LYRICS_CINEMA_BG} > :has(${S.LYRICS_LINE})`, decls: { visibility: 'hidden' } })
    // Spotify's "Sync" button scrolls its hidden lines; ours follow the song again by themselves after a scroll.
    rules.push({ selector: `[${LYRICS_VIEW_SLOT.ownAttr}] ${S.LYRICS_SYNC_BUTTON}`, decls: { visibility: 'hidden' } })
  }
  return renderRules(rules)
}
