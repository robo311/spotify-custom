// Album Mode and Ambient Glow: runtime-only effects driven by the current cover art. They write overrides into
// the `sc-effects` slot (after the theme) and never touch the saved theme.
//  - Album Mode: accent and background tint follow the cover, morphing over 1.2 s on track change.
//  - Ambient Glow: a soft cover-coloured bloom behind the top of the main view.
import type { Palette, Store, Theme } from '../types'
import { contrast, ensureContrast, fromOklch, mix, toOklch } from './color'
import { MIN_ACCENT_CONTRAST, MIN_TEXT_CONTRAST, type ImageColors } from './palette'
import { coverColors } from './cover-colors'
import { styleSlot } from './apply'
import { PALETTE_VAR } from './vars'

const SELECTORS = {
  nowPlayingBar: '[data-testid="now-playing-bar"]',
  cover: '[data-testid="now-playing-widget"] [data-testid="cover-art-image"]',
  main: 'main',
} as const

const GLOW_ID = 'sc-ambient-glow'
const ALBUM_MORPH_MS = 1200
const BACKGROUND_TINT = 0.14
const HEALTH_CHECK_MS = 2000

/** Palette overrides for Album Mode. Pure: theme palette + cover colours → readable overrides. */
export function albumPalette(base: Palette, cover: ImageColors): Partial<Palette> {
  const v = toOklch(cover.vivid)
  const vivid = fromOklch({ ...v, l: Math.min(0.85, Math.max(0.68, v.l)), c: Math.max(v.c, 0.08) })
  const accent = ensureContrast(vivid, base.elevated, MIN_ACCENT_CONTRAST)
  const onAccent = [base.onAccent, '#ffffff', '#0b0b0b'].reduce((best, c) => (contrast(c, accent) > contrast(best, accent) ? c : best))
  const background = mix(base.background, cover.dominant, BACKGROUND_TINT)
  const readable = contrast(base.text, background) >= MIN_TEXT_CONTRAST && contrast(base.textSubdued, background) >= MIN_TEXT_CONTRAST
  return readable ? { accent, onAccent, background } : { accent, onAccent }
}

function effectsCss(theme: Theme, cover: ImageColors | null): string {
  const rules: string[] = ['@property --sc-glow-color { syntax: "<color>"; inherits: true; initial-value: transparent; }']
  const vars: Record<string, string> = {}
  if (theme.effects.albumMode && cover) {
    vars['--sc-morph-duration'] = `${ALBUM_MORPH_MS}ms`
    vars['--sc-album-color'] = cover.vivid
    for (const [key, value] of Object.entries(albumPalette(theme.palette, cover)) as [keyof Palette, string][]) {
      vars[PALETTE_VAR[key]] = value
    }
  }
  if (theme.effects.ambientGlow) {
    vars['--sc-glow-color'] = cover?.vivid ?? theme.palette.accent
    rules.push(`#${GLOW_ID} {
  position: absolute; inset: 0 0 auto 0; height: 460px; pointer-events: none;
  background: radial-gradient(120% 90% at 25% -20%, color-mix(in oklab, var(--sc-glow-color) 42%, transparent), transparent 70%),
              radial-gradient(80% 70% at 90% -30%, color-mix(in oklab, var(--sc-glow-color) 22%, transparent), transparent 70%);
  transition: --sc-glow-color ${ALBUM_MORPH_MS}ms cubic-bezier(.2,.8,.2,1);
}`)
  }
  const declarations = Object.entries(vars).map(([k, v]) => `${k}: ${v};`).join(' ')
  if (declarations) rules.push(`:root { ${declarations} }`)
  return rules.join('\n')
}

/** The nearest ancestor of <main> that paints a background: the glow sits inside it, under the content. */
export function glowHost(): HTMLElement | null {
  let el = document.querySelector<HTMLElement>(SELECTORS.main)
  while (el && getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)') el = el.parentElement
  return el
}

export function startEffects(store: Store): () => void {
  let cover: ImageColors | null = null
  let coverSrc: string | null = null
  let observedBar: Element | null = null
  const observer = new MutationObserver(() => {
    void refreshCover()
  })

  const theme = () => store.get().active
  const wanted = () => theme().effects.albumMode || theme().effects.ambientGlow

  function render() {
    styleSlot('sc-effects').textContent = wanted() ? effectsCss(theme(), cover) : ''
    syncGlowElement()
  }

  function syncGlowElement() {
    const existing = document.getElementById(GLOW_ID)
    if (!theme().effects.ambientGlow) {
      existing?.remove()
      return
    }
    const host = glowHost()
    if (!host || existing?.parentElement === host) return
    const glow = existing ?? Object.assign(document.createElement('div'), { id: GLOW_ID })
    glow.setAttribute('aria-hidden', 'true')
    host.prepend(glow) // first child: painted before (under) Spotify's positioned content
  }

  async function refreshCover() {
    const src = document.querySelector<HTMLImageElement>(SELECTORS.cover)?.getAttribute('src') ?? null
    if (src === coverSrc) return
    coverSrc = src
    if (!src) {
      cover = null
      render()
      return
    }
    try {
      const colors = await coverColors(src)
      if (src !== coverSrc) return // a newer track started while we were sampling
      cover = colors
    } catch (e) {
      console.warn('[spotify-custom] could not read the cover colours', e)
      cover = null
    }
    render()
  }

  /** (Re)attach the observer when Spotify re-mounts the player bar, and the glow when Home re-renders. */
  function healthCheck() {
    if (!wanted()) {
      observer.disconnect()
      observedBar = null
      return
    }
    const bar = document.querySelector(SELECTORS.nowPlayingBar)
    if (bar && bar !== observedBar) {
      observer.disconnect()
      observer.observe(bar, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] })
      observedBar = bar
    }
    syncGlowElement()
    void refreshCover()
  }

  let lastEffects = theme().effects
  let lastPalette = theme().palette
  const unsubscribe = store.subscribe(s => {
    if (s.active.effects === lastEffects && s.active.palette === lastPalette) return
    lastEffects = s.active.effects
    lastPalette = s.active.palette
    healthCheck()
    render()
  })
  const timer = setInterval(healthCheck, HEALTH_CHECK_MS)
  healthCheck()
  render()

  return () => {
    unsubscribe()
    clearInterval(timer)
    observer.disconnect()
    document.getElementById(GLOW_ID)?.remove()
    styleSlot('sc-effects').textContent = ''
  }
}
