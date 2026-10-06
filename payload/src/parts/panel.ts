// The right "Now playing" panel: identifies its sections with language-independent keys (what each section
// contains, never its localised heading), marks them, and compiles hide/order/compact-cover CSS.
import type { NowPlayingLayout, PanelSectionInfo } from '../types'
import { compileKeyedSectionsCss, keySelector } from './sections'
import { renderRules, type CssRule } from './css'
import { SPOTIFY_NPV_CARD_GAP } from '../theme/model'
import {
  APP_ROOT,
  NPV_BIG_VISUAL,
  NPV_HEADER_HEIGHT,
  NPV_LIKE_BUTTON,
  NPV_MINI_VISUAL,
  NPV_SECTIONS,
  NPV_TITLE,
  NPV_TRACK_SECTION,
  NPV_VIDEO_SWITCH,
  NPV_VISUAL,
} from './selectors'

export const PANEL_KEY_ATTR = 'data-sc-panel-key'

interface SectionKind {
  key: string
  /** Shown when the section has no heading (e.g. the track header). */
  label: string
  /** Matches the section itself or anything inside it. */
  contains: string
}

/** First match wins, so more specific kinds come first (queue and artist sections also contain list rows). */
export const PANEL_SECTION_KINDS: SectionKind[] = [
  { key: 'track', label: 'Now playing', contains: '[data-testid="track-visual-enhancement"], [data-testid="context-item-info-title"]' },
  { key: 'lyrics', label: 'Lyrics', contains: '[data-testid="lyrics-npv-section"]' },
  { key: 'videos', label: 'Music videos', contains: '[data-testid="video-card-image"]' },
  { key: 'artist', label: 'About the artist', contains: '[data-testid="npv-artist-bio-button"], [data-testid="npv-artist-link"]' },
  { key: 'tour', label: 'On tour', contains: 'a[href^="/concert/"]' },
  { key: 'merch', label: 'Merch', contains: '[data-testid="offer-name"], a[href*="shop.spotify.com"]' },
  { key: 'queue', label: 'Next in queue', contains: 'li[role="row"]' },
  { key: 'credits', label: 'Credits', contains: '[data-encore-id="listRow"]' },
]

export function panelSectionKind(section: Element): SectionKind | null {
  return PANEL_SECTION_KINDS.find(k => section.matches(k.contains) || section.querySelector(k.contains)) ?? null
}

/** Marks the panel's sections with their keys and returns them in DOM order. Unknown sections are left alone. */
export function markPanelSections(root: ParentNode = document): PanelSectionInfo[] {
  const container = root.querySelector(NPV_SECTIONS)
  if (!container) return []
  const seen = new Map<string, number>()
  const sections: PanelSectionInfo[] = []
  for (const section of container.children) {
    const kind = panelSectionKind(section)
    if (!kind) continue
    const n = (seen.get(kind.key) ?? 0) + 1
    seen.set(kind.key, n)
    const key = n === 1 ? kind.key : `${kind.key}#${n}`
    if (section.getAttribute(PANEL_KEY_ATTR) !== key) section.setAttribute(PANEL_KEY_ATTR, key)
    const heading = section.querySelector('h2')?.textContent.trim() ?? ''
    sections.push({ key, title: heading === '' ? kind.label : heading })
  }
  return sections
}

/** Reports the panel's sections now and whenever they change (empty while the panel is closed). */
export function watchPanelSections(cb: (s: PanelSectionInfo[]) => void): () => void {
  let last = ''
  const scan = () => {
    const sections = markPanelSections()
    const json = JSON.stringify(sections)
    if (json === last) return
    last = json
    cb(sections)
  }
  let frame = 0
  const observer = new MutationObserver(() => {
    if (frame === 0) {
      frame = requestAnimationFrame(() => {
        frame = 0
        scan()
      })
    }
  })
  observer.observe(document.querySelector(APP_ROOT) ?? document.body, { childList: true, subtree: true })
  scan()
  return () => {
    observer.disconnect()
    if (frame !== 0) cancelAnimationFrame(frame)
    for (const el of document.querySelectorAll(`[${PANEL_KEY_ATTR}]`)) el.removeAttribute(PANEL_KEY_ATTR)
  }
}

// Compact cover: Spotify's own "scrolled" state — the big canvas/cover collapses and a 56px thumbnail
// appears next to the track title, which then needs room below the panel's floating header.
const COMPACT_COVER: CssRule[] = [
  { selector: NPV_BIG_VISUAL, decls: { display: 'none' } },
  { selector: NPV_TRACK_SECTION, decls: { 'padding-top': NPV_HEADER_HEIGHT } },
  { selector: NPV_MINI_VISUAL, decls: { width: '56px', opacity: '1', 'margin-inline-end': 'var(--encore-spacing-base, 12px)' } },
]

// The song header: the cover's box is a square (aspect-ratio 1 / 1) that Spotify's cover and Canvas fill, so its
// aspect ratio sets the height. Spotify darkens it with two gradient layers on the visual's ::before / ::after.
const COVER_ASPECT: Record<Exclude<NowPlayingLayout['coverHeight'], 'spotify'>, string> = { short: '4 / 3', tall: '4 / 5' }
const SHADE_LAYERS = `${NPV_VISUAL}::before, ${NPV_VISUAL}::after`

function headerRules(layout: NowPlayingLayout): CssRule[] {
  const rules: CssRule[] = []
  if (layout.coverHeight !== 'spotify') rules.push({ selector: NPV_BIG_VISUAL, decls: { 'aspect-ratio': COVER_ASPECT[layout.coverHeight] } })
  if (layout.coverShade === 'none' || layout.coverShade === 'soft') {
    rules.push({ selector: SHADE_LAYERS, decls: { opacity: layout.coverShade === 'none' ? '0' : '0.5' } })
  }
  if (layout.coverShade === 'strong') rules.push({ selector: `${NPV_VISUAL} :is(video, img)`, decls: { filter: 'brightness(0.7)' } })
  if (layout.titleScale !== 1) rules.push({ selector: NPV_TITLE, decls: { zoom: String(layout.titleScale) } })
  if (layout.hideVideoSwitch) rules.push({ selector: NPV_VIDEO_SWITCH, decls: { display: 'none' } })
  if (layout.hideLikeButton) rules.push({ selector: NPV_LIKE_BUTTON, decls: { display: 'none' } })
  if (layout.cardGap !== SPOTIFY_NPV_CARD_GAP) rules.push({ selector: NPV_SECTIONS, decls: { gap: `${layout.cardGap}px` } })
  return rules
}

export function compilePanelLayout(layout: NowPlayingLayout): string {
  const sections = compileKeyedSectionsCss({
    items: `${NPV_SECTIONS} > *`,
    byKey: key => keySelector(`${NPV_SECTIONS} > `, PANEL_KEY_ATTR, key),
    hidden: layout.hidden,
    order: layout.order,
  })
  return [sections, layout.compactCover ? renderRules(COMPACT_COVER) : '', renderRules(headerRules(layout))].filter(Boolean).join('\n')
}
