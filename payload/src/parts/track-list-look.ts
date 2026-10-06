// Song lists on album, playlist, song and artist pages (theme.pageStyle): row styles, song covers, track numbers,
// the column titles, and the playing song's row (marked by playing-row.ts), including its spinning cover.
import type { PageStyle } from '../types'
import type { CssRule, Declarations } from './css'
import * as S from './selectors'

/** Set on the playing song's row wrapper by playing-row.ts ("paused" while the song is paused). */
export const PLAYING_ROW_ATTR = 'data-sc-playing'

/** Even data rows (the header row is 1). By row index, not position, so stripes stay put in the virtual list. */
const EVEN_ROWS = `${S.TRACK_LIST} [role="row"]:is(${['0', '2', '4', '6', '8'].map(d => `[aria-rowindex$="${d}"]`).join(', ')}) > [data-testid="tracklist-row"]`
const ROW_HOVER = `${S.TRACK_ROW}:is(:hover, :focus-within)`
/** Transparent borders inset a painted card without changing the row height the virtual list relies on. */
const CARD_INSET: Declarations = { 'background-clip': 'padding-box', 'border-block': '3px solid transparent', 'border-radius': 'calc(var(--sc-radius, 8px) + 4px)' }
const THUMB_RADIUS: Record<Exclude<PageStyle['thumbnails'], 'spotify' | 'hidden' | 'cd'>, string> = { square: '0', round: '8px', circle: '50%' }
/** A CD: round, with the centre punched out (a real CD's hole is about a quarter of its radius). */
const CD: Declarations = { 'border-radius': '50%', 'mask-image': 'radial-gradient(circle closest-side, transparent 0 25%, #000 calc(25% + 0.5px))' }

const PLAYING_ROW = `${S.TRACK_LIST} [role="row"][${PLAYING_ROW_ATTR}]`

/** The playing song's row (marked by playing-row.ts) in the theme's chosen style, colour and strength. */
function playingRowRules(s: PageStyle): CssRule[] {
  const color = s.playingColor ?? 'var(--sc-accent)'
  const tint = `color-mix(in oklab, ${color} ${s.playingStrength}%, transparent)`
  const flat = `linear-gradient(${tint}, ${tint})`
  const looks: Record<PageStyle['playingStyle'], Declarations> = {
    bar: { 'background-image': `linear-gradient(90deg, ${color} 0 3px, transparent 3px), ${flat}` },
    wash: { 'background-image': flat },
    fade: { 'background-image': `linear-gradient(90deg, color-mix(in oklab, ${color} ${Math.min(80, s.playingStrength * 2)}%, transparent), transparent 75%)` },
    outline: { 'background-image': `linear-gradient(color-mix(in oklab, ${color} ${Math.round(s.playingStrength / 2)}%, transparent), color-mix(in oklab, ${color} ${Math.round(s.playingStrength / 2)}%, transparent))`, 'box-shadow': `inset 0 0 0 1.5px ${color}` },
  }
  const rules: CssRule[] = [{ selector: `${PLAYING_ROW} > [data-testid="tracklist-row"]`, decls: looks[s.playingStyle] }]
  // The title is the cell's first line (a div; the artists below it are spans), in albums and playlists alike.
  if (s.playingTitle) rules.push({ selector: `${PLAYING_ROW} [aria-colindex="2"] > div > div[data-encore-id="text"]`, decls: { color } })
  return rules
}

/**
 * Spotify's equaliser is a green image, so it can't take a colour: its own pixels are pushed out of view and the colour
 * is painted through the same file as a mask (the GIF keeps animating as a mask). Only the files known here are
 * touched; another file would otherwise turn into a solid block.
 */
function equaliserRules(s: PageStyle): CssRule[] {
  const color = s.equaliserColor ?? s.playingColor ?? 'var(--sc-accent)'
  return S.ROW_EQUALISER_IMAGES.map(src => ({
    selector: S.rowEqualiser(src),
    decls: { 'object-position': '-999px 0', 'background-color': color, mask: `url("${src}") center / contain no-repeat` },
  }))
}

export function trackListRules(s: PageStyle): CssRule[] {
  const rules: CssRule[] = []
  if (s.rows === 'striped') {
    rules.push(
      { selector: EVEN_ROWS, decls: { 'background-color': 'color-mix(in oklab, var(--sc-text) 4%, transparent)' } },
      { selector: ROW_HOVER, decls: { 'background-color': 'color-mix(in oklab, var(--sc-text) 10%, transparent)' } },
    )
  }
  if (s.rows === 'cards') {
    rules.push(
      { selector: S.TRACK_ROW, decls: { ...CARD_INSET, 'background-color': 'color-mix(in oklab, var(--sc-elevated) 70%, transparent)' } },
      { selector: ROW_HOVER, decls: { 'background-color': 'var(--sc-elevated)' } },
    )
  }
  if (s.rows === 'lines') {
    rules.push(
      { selector: S.TRACK_ROW, decls: { 'border-radius': '0', 'box-shadow': 'inset 0 -1px 0 color-mix(in oklab, var(--sc-text) 10%, transparent)' } },
      { selector: ROW_HOVER, decls: { 'background-color': 'color-mix(in oklab, var(--sc-text) 6%, transparent)' } },
    )
  }
  if (s.rows === 'outlined') {
    // The outline follows the rounded corners and sits on the inset card's edge (offset = the transparent border).
    rules.push(
      { selector: S.TRACK_ROW, decls: { ...CARD_INSET, outline: '1px solid color-mix(in oklab, var(--sc-text) 14%, transparent)', 'outline-offset': '-3px' } },
      { selector: ROW_HOVER, decls: { 'background-color': 'color-mix(in oklab, var(--sc-accent) 8%, transparent)', 'outline-color': 'color-mix(in oklab, var(--sc-accent) 55%, transparent)' } },
    )
  }
  if (s.rows === 'glow') {
    rules.push({
      selector: ROW_HOVER,
      decls: {
        'background-color': 'transparent',
        'background-image': 'linear-gradient(90deg, color-mix(in oklab, var(--sc-accent) 22%, transparent), transparent 70%)',
        'box-shadow': 'inset 3px 0 0 var(--sc-accent)',
      },
    })
  }
  if (s.thumbnails !== 'spotify') {
    rules.push({
      selector: S.ROW_THUMBNAIL,
      decls: s.thumbnails === 'hidden' ? { display: 'none' } : s.thumbnails === 'cd' ? CD : { 'border-radius': THUMB_RADIUS[s.thumbnails] },
    })
  }
  if (s.indexStyle === 'accent') rules.push({ selector: S.ROW_INDEX, decls: { color: 'var(--sc-accent)' } })
  // Hidden, not removed: the cell keeps its width and Spotify still swaps in its play button on hover.
  if (s.indexStyle === 'hidden') rules.push({ selector: S.ROW_INDEX, decls: { visibility: 'hidden' } })
  if (s.hideColumnHeader) rules.push({ selector: S.TRACK_LIST_HEADER, decls: { display: 'none' } })
  if (s.playingRow) rules.push(...playingRowRules(s))
  if (s.playingSpin) {
    const cover = `${PLAYING_ROW} [aria-colindex="2"] > img`
    rules.push(
      { selector: cover, decls: { animation: 'sc-cover-spin 6s linear infinite' } },
      { selector: cover.replace(`[${PLAYING_ROW_ATTR}]`, `[${PLAYING_ROW_ATTR}="paused"]`), decls: { 'animation-play-state': 'paused' } },
    )
  }
  rules.push(...equaliserRules(s))
  return rules
}

// Keyframes are written as is: !important inside @keyframes would make the browser drop the declaration.
export function trackListKeyframes(s: PageStyle): string {
  return s.playingSpin ? '@keyframes sc-cover-spin { to { rotate: 1turn; } }' : ''
}
