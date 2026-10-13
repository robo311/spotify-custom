// The right "Now playing" panel: identifies its sections with language-independent keys (what each section
// contains, never its localised heading), marks them, and compiles hide/order/compact-cover CSS. Spotify 1.3.4 rebuilt
// the panel (selectors.ts); both generations are marked and styled.
import type { NowPlayingLayout, PanelSectionInfo } from '../types'
import { compileKeyedSectionsCss, keySelector } from './sections'
import { renderRules, type CssRule } from './css'
import { SPOTIFY_NPV_CARD_GAP } from '../theme/model'
import {
  APP_ROOT,
  NPV_BIG_VISUAL,
  NPV_COVER_SHADE,
  NPV_COVER_SLOT,
  NPV_DETAILS,
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
/** 1.3.4: the details column's rows above the first section (the "switch to video" row, the title row). */
export const PANEL_HEAD_ATTR = 'data-sc-panel-head'
/** 1.3.4: a column holding several sections (the cards), flattened so they can be ordered with the queue. */
export const PANEL_GROUP_ATTR = 'data-sc-panel-group'

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
  // 1.3.3 lists the queue in rows; 1.3.4 in list rows titled by track URI (credits rows are keyed by artist).
  { key: 'queue', label: 'Next in queue', contains: 'li[role="row"], [data-encore-id="listRowTitle"][id*="spotify:track:"]' },
  { key: 'credits', label: 'Credits', contains: '[data-encore-id="listRow"]' },
]

export function panelSectionKind(section: Element): SectionKind | null {
  return PANEL_SECTION_KINDS.find(k => section.matches(k.contains) || section.querySelector(k.contains)) ?? null
}

/**
 * 1.3.4: the details column's sections: the cards (children of a column holding several) and the queue (a child of
 * its own). Rows above the first section are marked as the head, which ordering leaves on top.
 */
function sections134(details: Element): Element[] {
  const found: Element[] = []
  for (const child of details.children) {
    const kinded = [...child.children].filter(c => panelSectionKind(c))
    const group = kinded.length >= 2
    child.toggleAttribute(PANEL_GROUP_ATTR, group)
    child.toggleAttribute(PANEL_HEAD_ATTR, found.length === 0 && !group && !panelSectionKind(child))
    if (group) found.push(...kinded)
    else if (panelSectionKind(child)) found.push(child)
  }
  return found
}

function panelSectionElements(root: ParentNode): Element[] {
  const container = root.querySelector(NPV_SECTIONS)
  if (container) return [...container.children]
  const details = root.querySelector(NPV_DETAILS)
  return details ? sections134(details) : []
}

/** Marks the panel's sections with their keys and returns them in DOM order. Unknown sections are left alone. */
export function markPanelSections(root: ParentNode = document): PanelSectionInfo[] {
  const seen = new Map<string, number>()
  const sections: PanelSectionInfo[] = []
  for (const section of panelSectionElements(root)) {
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
    for (const attr of [PANEL_KEY_ATTR, PANEL_HEAD_ATTR, PANEL_GROUP_ATTR]) for (const el of document.querySelectorAll(`[${attr}]`)) el.removeAttribute(attr)
  }
}

const HEAD_134 = `${NPV_DETAILS} > [${PANEL_HEAD_ATTR}]`
const GROUP_134 = `${NPV_DETAILS} > [${PANEL_GROUP_ATTR}]`

// Compact cover: Spotify's own "scrolled" state — the big canvas/cover collapses and a 56px thumbnail
// appears next to the track title, which then needs room below the panel's floating header. 1.3.4 has no thumbnail:
// the cover slot (and the Canvas inside it) goes, and the details take the room the slot kept under the header.
const COMPACT_COVER: CssRule[] = [
  { selector: NPV_BIG_VISUAL, decls: { display: 'none' } },
  { selector: NPV_TRACK_SECTION, decls: { 'padding-top': NPV_HEADER_HEIGHT } },
  { selector: NPV_MINI_VISUAL, decls: { width: '56px', opacity: '1', 'margin-inline-end': 'var(--encore-spacing-base, 12px)' } },
  { selector: NPV_COVER_SLOT, decls: { display: 'none' } },
  { selector: NPV_DETAILS, decls: { 'padding-top': `calc(${NPV_HEADER_HEIGHT} - 16px)` } },
]

// The song header: the cover's box is a square (aspect-ratio 1 / 1) that Spotify's cover and Canvas fill, so its
// aspect ratio sets the height. Spotify darkens it with two gradient layers on the visual's ::before / ::after.
const COVER_ASPECT: Record<Exclude<NowPlayingLayout['coverHeight'], 'spotify'>, string> = { short: '4 / 3', tall: '4 / 5' }
const SHADE_LAYERS = `${NPV_VISUAL}::before, ${NPV_VISUAL}::after`

// 1.3.4's header parts. The title is the first line of the title row (the row holding the Liked tick); the video switch
// is the head's only button without an Encore id; the Liked tick is its toggle that isn't a switch ("hide" is).
const COVER_134 = `${NPV_COVER_SLOT}, ${NPV_COVER_SLOT} > div`
/**
 * 1.3.4's Canvas is as tall as its video and hangs from 64px above the slot (under the floating header) to about 190px
 * below it, behind the title rows. A shorter or taller slot would leave it painting over the cards or ending early,
 * so it keeps that span around the slot: 100% is the slot box's height.
 */
const CANVAS_134 = `${NPV_COVER_SLOT} [data-canvas-surface]`
const CANVAS_SPAN_134 = 'calc(100% + 254px)'
const TITLE_134 = `${HEAD_134}:has(button[aria-checked]) > :first-child > :first-child`
const VIDEO_SWITCH_134 = `${HEAD_134} button:not([data-encore-id]):not([data-testid])`
const LIKE_BUTTON_134 = `${HEAD_134} button[aria-checked]:not([role="switch"])`

function headerRules(layout: NowPlayingLayout): CssRule[] {
  const rules: CssRule[] = []
  if (layout.coverHeight !== 'spotify') {
    const ratio = { 'aspect-ratio': COVER_ASPECT[layout.coverHeight] }
    rules.push(
      { selector: NPV_BIG_VISUAL, decls: ratio },
      { selector: COVER_134, decls: { ...ratio, height: 'auto' } },
      { selector: CANVAS_134, decls: { height: CANVAS_SPAN_134 } },
      { selector: `${CANVAS_134} :is(video, img)`, decls: { height: '100%', 'object-fit': 'cover' } },
    )
  }
  if (layout.coverShade === 'none' || layout.coverShade === 'soft') {
    rules.push({ selector: `${SHADE_LAYERS}, ${NPV_COVER_SHADE}`, decls: { opacity: layout.coverShade === 'none' ? '0' : '0.5' } })
  }
  if (layout.coverShade === 'strong') rules.push({ selector: `${NPV_VISUAL} :is(video, img), ${NPV_COVER_SLOT} :is(video, img)`, decls: { filter: 'brightness(0.7)' } })
  if (layout.titleScale !== 1) rules.push({ selector: `${NPV_TITLE}, ${TITLE_134}`, decls: { zoom: String(layout.titleScale) } })
  if (layout.hideVideoSwitch) rules.push({ selector: `${NPV_VIDEO_SWITCH}, ${VIDEO_SWITCH_134}`, decls: { display: 'none' } })
  if (layout.hideLikeButton) rules.push({ selector: `${NPV_LIKE_BUTTON}, ${LIKE_BUTTON_134}`, decls: { display: 'none' } })
  if (layout.cardGap !== SPOTIFY_NPV_CARD_GAP) rules.push({ selector: `${NPV_SECTIONS}, ${NPV_DETAILS}, ${GROUP_134}`, decls: { gap: `${layout.cardGap}px` } })
  return rules
}

export function compilePanelLayout(layout: NowPlayingLayout): string {
  const sections = compileKeyedSectionsCss({
    // 1.3.4: the head rows stay out of the ordering (on top); the cards column's children join the queue as siblings.
    items: `${NPV_SECTIONS} > *, ${NPV_DETAILS} > :not([${PANEL_HEAD_ATTR}], [${PANEL_GROUP_ATTR}]), ${GROUP_134} > *`,
    // A key's 1.3.4 rule must outrank the "everything else" rule above, which is as specific as a plain key selector
    // here: the (always true) :not() adds the specificity it needs.
    byKey: key =>
      `${keySelector(`${NPV_SECTIONS} > `, PANEL_KEY_ATTR, key)}, ${keySelector(`${NPV_DETAILS} `, PANEL_KEY_ATTR, key)}:not([${PANEL_GROUP_ATTR}])`,
    hidden: layout.hidden,
    order: layout.order,
  })
  // Same gap inside the cards column as around it, so flattening it doesn't move anything.
  const flatten = layout.order.length > 0 ? renderRules([{ selector: GROUP_134, decls: { display: 'contents' } }]) : ''
  return [sections, flatten, layout.compactCover ? renderRules(COMPACT_COVER) : '', renderRules(headerRules(layout))].filter(Boolean).join('\n')
}
