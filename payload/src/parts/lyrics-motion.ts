// Opening and closing the lyrics view (Spotify's View Transition) and the first lines' cascade.
import type { Theme } from '../types'
import { COLUMN_HOST, VIEW_LINES, customisesLyricsView } from './lyrics-shared'
import * as S from './selectors'

// Opening and closing the lyrics view. Spotify runs it as a View Transition (html[data-transition="cinema-…"]) that
// morphs its Now playing panel into the full view; we give that morph a calmer, physical curve, let the first lines
// rise in one after another, and slide our own Now playing column in and out as a transition layer of its own.
// On close, Spotify's Now playing panel returns: its background morphs into place as a layer above the page snapshot
// and its cover fades in as another, but its text is in the page snapshot, hidden under the morphing background until
// the morph ends. Giving the panel's visible content a layer too makes it fade in together with the cover.
const EASE = 'cubic-bezier(.2, .8, .2, 1)'
const CASCADE_LINES = 14
const CASCADE_START_MS = 160
const CASCADE_STEP_MS = 45
const LINE_RISE_MS = 640
/**
 * On <html> from the moment the view starts opening until the last cascading line has risen (set by lyrics-intro.ts).
 * Spotify remounts the outgoing and incoming lines on every line change, so a cascade tied to the open view alone
 * replays on those fresh nodes and hides them again.
 */
export const LYRICS_INTRO_ATTR = 'data-sc-lyrics-intro'
export const LYRICS_INTRO_MS = CASCADE_START_MS + (CASCADE_LINES - 1) * CASCADE_STEP_MS + LINE_RISE_MS
const COLUMN_LAYER = 'sc-lyrics-npv'
const PANEL_CONTENT_LAYER = 'sc-npv-content'

export function compileLyricsMotion(theme: Pick<Theme, 'lyrics' | 'layout'>): string {
  if (!customisesLyricsView(theme)) return ''
  const vt = 'html[data-transition^="cinema"]'
  const lines = Array.from({ length: CASCADE_LINES }, (_, i) =>
    `  ${S.LYRICS_VIEW_OPEN}[${LYRICS_INTRO_ATTR}] ${VIEW_LINES}:nth-child(${i + 1}) { animation: sc-lyric-in ${LINE_RISE_MS}ms ${EASE}; animation-delay: ${CASCADE_START_MS + i * CASCADE_STEP_MS}ms; animation-fill-mode: backwards; }`,
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
