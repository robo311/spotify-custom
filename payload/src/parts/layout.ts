// Layout tweaks: hiding parts and small UI elements, compact player bar, library side, top bar search position.
// Pure CSS generation.
import type { LayoutConfig, LayoutOption } from '../types'
import { hideRule, renderRules, type CssRule } from './css'
import { compileLyricsLayout } from './lyrics'
import { compilePanelLayout } from './panel'
import { PART_RECIPES } from './registry'
import * as S from './selectors'

function hideOption(id: string, label: string, selector: string): LayoutOption {
  return { id, label, css: renderRules([hideRule([selector])]) }
}

/** Small things people commonly want gone. Ids share the `layout.hidden` namespace with hideable part ids. */
export const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    id: 'backForward',
    label: 'Back and forward buttons',
    // Spotify's 24px gap after the window-buttons box goes with the buttons, and Home would slide under the zoom button.
    css: renderRules([
      hideRule([S.TOP_BAR_HISTORY]),
      { selector: `:root[${S.MAC_ATTR}] ${S.WINDOW_BUTTONS_SPACER}`, decls: { 'margin-right': '24px' } },
    ]),
  },
  hideOption('topBarHome', 'Home button', S.HOME_BUTTON),
  hideOption('whatsNew', "What's New button", S.WHATS_NEW_BUTTON),
  hideOption('friendActivity', 'Friend Activity button', S.FRIEND_ACTIVITY_BUTTON),
  hideOption('pip', 'Mini player button', S.PIP_BUTTON),
  hideOption('lyricsButton', 'Lyrics button', S.LYRICS_BUTTON),
  hideOption('fullscreenButton', 'Full screen button', S.FULLSCREEN_BUTTON),
  hideOption('qualityBadge', 'Audio quality label', S.QUALITY_BADGE),
]

const COMPACT_PLAYER: CssRule[] = [
  { selector: `${S.PLAYER_BAR} > div`, decls: { height: '56px' } },
  { selector: `${S.NOW_PLAYING_COVER_SLOT}, ${S.NOW_PLAYING_COVER_IMAGE}`, decls: { width: '40px', height: '40px' } },
  { selector: S.PLAYER_CONTROLS, decls: { scale: '0.92' } },
]

// Spotify's layout grid places regions by named areas, so swapping the area names moves the library to the right.
// The resize handles stay attached to their sidebars' old inner edges (and would drag backwards), so they're hidden.
const LIBRARY_RIGHT: CssRule[] = [
  {
    selector: S.LAYOUT_GRID,
    decls: {
      'grid-template':
        '"top-banner top-banner top-banner" "global-nav global-nav global-nav" ' +
        '"right-sidebar main-view left-sidebar" 1fr "now-playing-bar now-playing-bar now-playing-bar" / auto 1fr auto',
    },
  },
  { selector: S.RESIZE_BAR, decls: { display: 'none' } },
]

// The bar is a space-between flex row; taking the centre layer out of absolute positioning puts it between the left
// and right groups, and it fills that gap so it can push Home + search to either end.
function searchAt(side: 'left' | 'right'): CssRule[] {
  return [
    {
      selector: S.TOP_BAR_CENTRE,
      decls: { position: 'static', flex: '1', 'min-width': '0', 'justify-content': side === 'left' ? 'flex-start' : 'flex-end' },
    },
  ]
}

const HIDEABLE_PARTS = new Map(PART_RECIPES.filter(p => p.hideable).map(p => [p.id, p.selectors]))
const OPTIONS_BY_ID = new Map(LAYOUT_OPTIONS.map(o => [o.id, o]))

/** CSS for the whole LayoutConfig: hidden parts/options, player, library side, Now playing panel, lyrics view. */
export function compileLayout(layout: LayoutConfig): string {
  const css: string[] = []
  const hiddenPartSelectors = layout.hidden.flatMap(id => HIDEABLE_PARTS.get(id) ?? [])
  if (hiddenPartSelectors.length > 0) css.push(renderRules([hideRule(hiddenPartSelectors)]))
  for (const id of layout.hidden) {
    const option = OPTIONS_BY_ID.get(id)
    if (option) css.push(option.css)
  }
  if (layout.compactPlayer) css.push(renderRules(COMPACT_PLAYER))
  if (layout.librarySide === 'right') css.push(renderRules(LIBRARY_RIGHT))
  if (layout.searchPosition !== 'centre') css.push(renderRules(searchAt(layout.searchPosition)))
  css.push(compilePanelLayout(layout.nowPlaying), compileLyricsLayout(layout))
  return css.filter(Boolean).join('\n')
}
