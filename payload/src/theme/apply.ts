// Puts compiled CSS into Spotify: ordered <style> slots, palette morphing, circular-reveal transitions,
// and a localStorage cache that re-applies the last theme synchronously at boot (no flash of Spotify green).
import { fontFaces } from './fonts'
import { PALETTE_VARS } from './vars'

/** Our style elements, in cascade order. Later slots override earlier ones. */
const SLOT_ORDER = ['sc-base', 'sc-theme', 'sc-recolor', 'sc-effects'] as const
type SlotId = (typeof SLOT_ORDER)[number]

const CACHE_KEY = 'sc:last-theme-css'
const MORPH_EASE = 'cubic-bezier(.2,.8,.2,1)'
const REVEAL_MS = 550
const NO_MORPH_CLASS = 'sc-no-morph'

export interface Point {
  x: number
  y: number
}

/** lib.dom types document.head as always present; at document start it isn't. */
export function currentHead(): HTMLHeadElement | null {
  return document.querySelector('head')
}

/** lib.dom types document.documentElement as always present; at the very start of a reload it isn't. */
export function currentRoot(): HTMLElement | null {
  return document.querySelector(':root')
}

/** Slots created before <html> existed; attached (in cascade order) as soon as it appears. */
const detachedSlots = new Map<SlotId, HTMLStyleElement>()
let rootWatcher: MutationObserver | null = null

function insertSlot(id: SlotId, style: HTMLStyleElement, parent: Element): void {
  const next = SLOT_ORDER.slice(SLOT_ORDER.indexOf(id) + 1)
    .map(s => document.getElementById(s))
    .find((el): el is HTMLElement => el !== null && el.parentNode === parent)
  parent.insertBefore(style, next ?? null)
}

function attachWhenRootExists(): void {
  if (rootWatcher) return
  rootWatcher = new MutationObserver(() => {
    const parent = currentHead() ?? currentRoot()
    if (!parent) return
    rootWatcher?.disconnect()
    rootWatcher = null
    for (const id of SLOT_ORDER) {
      const style = detachedSlots.get(id)
      if (style) insertSlot(id, style, parent)
    }
    detachedSlots.clear()
  })
  rootWatcher.observe(document, { childList: true })
}

/** Returns our <style> element for a slot, creating it in cascade order if needed. */
export function styleSlot(id: SlotId): HTMLStyleElement {
  const existing = document.getElementById(id) ?? detachedSlots.get(id)
  if (existing instanceof HTMLStyleElement) return existing
  const style = document.createElement('style')
  style.id = id
  const parent = currentHead() ?? currentRoot()
  if (parent) {
    insertSlot(id, style, parent)
  } else {
    detachedSlots.set(id, style)
    attachWhenRootExists()
  }
  return style
}

/**
 * Static rules, written once: bundled fonts, palette variables registered as <color> so they can be
 * transitioned (the morph), and the view-transition setup for the circular reveal.
 */
function baseCss(): string {
  const props = PALETTE_VARS.map(v => `@property ${v} { syntax: '<color>'; inherits: true; initial-value: #000; }`)
  const transition = PALETTE_VARS.map(v => `${v} var(--sc-morph-duration, 300ms) ${MORPH_EASE}`).join(', ')
  return `${fontFaces()}
${props.join('\n')}
:root { transition: ${transition}; }
html.${NO_MORPH_CLASS} { transition: none !important; }
::view-transition-old(root), ::view-transition-new(root) { animation: none; mix-blend-mode: normal; }
@media (prefers-reduced-motion: reduce) { :root { transition: none; } }`
}

let baseWritten = false

/** Written once per payload instance, so a hot reload replaces the previous build's rules. */
function ensureBase(): void {
  if (baseWritten) return
  // A previous (hot-reloaded) instance may have been disposed mid-preview.
  clearMorphSuppression()
  styleSlot('sc-base').textContent = baseCss()
  baseWritten = true
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function readCache(): string | null {
  try {
    return localStorage.getItem(CACHE_KEY)
  } catch {
    return null
  }
}

function writeCache(css: string): void {
  try {
    localStorage.setItem(CACHE_KEY, css)
  } catch {
    // Storage full or unavailable: the cache is only an optimisation.
  }
}

/** Applies the last theme synchronously. Returns false if nothing was cached. */
export function restoreCachedThemeCss(): boolean {
  const css = readCache()
  if (css === null) return false
  ensureBase()
  styleSlot('sc-theme').textContent = css
  return true
}

export interface ApplyOptions {
  /** Circular reveal from this viewport point (theme switches). */
  origin?: Point
  /** Apply immediately with no reveal and no colour morph (hover previews and their restore). */
  instant?: boolean
  /** Remember as the boot theme. Off for temporary previews. */
  cache?: boolean
}

/** About two frames at 60 Hz: long enough for an instant change to commit without a transition starting from it. */
export const INSTANT_HOLD_MS = 50

/**
 * The morph is suppressed until a single deadline. Every caller can only extend it, and a timer always
 * clears it (unlike requestAnimationFrame or transition promises, which stall while the window is hidden),
 * so the class can never be left behind.
 */
let morphTimer: ReturnType<typeof setTimeout> | undefined
let morphUntil = 0

function suppressMorph(ms: number): void {
  morphUntil = Math.max(morphUntil, performance.now() + ms)
  currentRoot()?.classList.add(NO_MORPH_CLASS)
  clearTimeout(morphTimer)
  morphTimer = setTimeout(clearMorphSuppression, morphUntil - performance.now())
}

/** Re-enables the morph now. Called on dispose and when a new payload instance boots. */
export function clearMorphSuppression(): void {
  clearTimeout(morphTimer)
  morphTimer = undefined
  morphUntil = 0
  currentRoot()?.classList.remove(NO_MORPH_CLASS)
}

/**
 * Colours either morph (default: edits), reveal in a circle (origin: theme switches), or change instantly
 * (instant: previews). Without View Transition support or with reduced motion, a reveal becomes instant.
 */
export function applyThemeCss(css: string, opts: ApplyOptions = {}): void {
  ensureBase()
  const style = styleSlot('sc-theme')
  if (opts.cache !== false) writeCache(css)
  if (style.textContent === css) return

  const write = () => {
    style.textContent = css
  }
  const { origin } = opts
  const canReveal = origin && !prefersReducedMotion() && typeof document.startViewTransition === 'function'

  if (opts.instant || (origin && !canReveal)) {
    suppressMorph(INSTANT_HOLD_MS)
    write()
    return
  }
  if (!origin) {
    write()
    return
  }

  // Inside the reveal the new theme should appear fully formed, not morphing.
  suppressMorph(REVEAL_MS + INSTANT_HOLD_MS)
  const transition = document.startViewTransition(write)
  const radius = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y))
  transition.ready
    .then(() =>
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${radius}px at ${origin.x}px ${origin.y}px)`] },
        { duration: REVEAL_MS, easing: MORPH_EASE, pseudoElement: '::view-transition-new(root)' },
      ),
    )
    .catch(() => {
      // Skipped transitions (e.g. hidden window) still apply the CSS via write().
    })
}
