// Lyrics react: the line being sung swells and brightens with the voice. Spotify marks that line only with a hashed
// class; we find it by meaning in Spotify's own stylesheet (the two-class lyrics-line rule that paints the active
// colour), so it survives rebuilds. The line is driven by a scrubbed animation (lyric lines sit under Spotify's
// [style*=] lyrics hosts, where style writes are expensive); a static rule anchors the swell.
// Reduced motion: brightness only.
import { LYRICS_LINE } from '../selectors'
import { amount, type ReactiveEffect } from './effect'
import { scrub, type Scrub } from './scrub'

const MAX_SCALE = 0.07
const MAX_BRIGHT = 0.45
/** How often to look for a sung line while none is showing (instrumental parts, lyrics closed). */
const RESCAN_MS = 250

/** Selector of Spotify's "active lyric line" rule, or null when the lyrics stylesheet isn't loaded (yet). */
export function findActiveLineSelector(sheets: Iterable<CSSStyleSheet>): string | null {
  const walk = (rules: CSSRuleList): string | null => {
    for (const rule of rules) {
      if (rule instanceof CSSStyleRule) {
        if (/^(\.[\w-]+){2}$/.test(rule.selectorText) && rule.style.color === 'var(--lyrics-color-active)') return rule.selectorText
      } else if (rule instanceof CSSGroupingRule) {
        const nested = walk(rule.cssRules)
        if (nested) return nested
      }
    }
    return null
  }
  for (const sheet of sheets) {
    try {
      const found = walk(sheet.cssRules)
      if (found) return found
    } catch {
      // Cross-origin sheets can't be read; Spotify's own are same-origin.
    }
  }
  return null
}

/** Pure: anchors the active line's swell to the lyrics alignment. */
export function lyricsCss(activeSelector: string, align: 'left' | 'center'): string {
  return `${LYRICS_LINE}${activeSelector} { transform-origin: ${align === 'center' ? '50%' : '0%'} 50%; }`
}

/** Pure: the line's keyframes, from rest to full swell (reduced motion: brightness only). */
export function lyricKeyframes(reducedMotion: boolean): Keyframe[] {
  const bright = `brightness(${1 + MAX_BRIGHT})`
  return reducedMotion
    ? [{ filter: 'brightness(1)' }, { filter: bright }]
    : [{ scale: '1', filter: 'brightness(1)' }, { scale: String(1 + MAX_SCALE), filter: bright }]
}

/** Pure: how far along the keyframes the voice level (0–1) puts the line at an intensity (0–100). */
export function lyricPosition(level: number, intensity: number): number {
  return Math.min(1, level * amount(intensity))
}

export function startLyrics(setCss: (css: string) => void, align: () => 'left' | 'center'): ReactiveEffect {
  let active: string | null = null
  let scannedSheets = -1
  let lastScan = -Infinity
  let line: HTMLElement | null = null
  let dial: Scrub | null = null
  let dialReduced = false
  let cssAlign: 'left' | 'center' | null = null

  const release = () => {
    dial?.cancel()
    dial = null
    line = null
  }

  /** The lyrics CSS is lazy-loaded with the lyrics; rescan only when new stylesheets arrived. */
  const findSelector = () => {
    if (active || document.styleSheets.length === scannedSheets || !document.querySelector(LYRICS_LINE)) return
    scannedSheets = document.styleSheets.length
    active = findActiveLineSelector(document.styleSheets)
  }

  const findLine = (now: number) => {
    if (line?.isConnected && active && line.matches(active)) return
    const moved = line !== null // the next line took over: find it now, not on the next scan
    release()
    if (!moved && now - lastScan < RESCAN_MS) return
    lastScan = now
    findSelector()
    if (active) line = document.querySelector<HTMLElement>(`${LYRICS_LINE}${active}`)
  }

  return {
    update(levels, ctx) {
      findLine(performance.now())
      if (!active || !line) return
      if (cssAlign !== align()) {
        cssAlign = align()
        setCss(lyricsCss(active, cssAlign))
      }
      if (!dial || dialReduced !== ctx.reducedMotion) {
        dial?.cancel()
        dialReduced = ctx.reducedMotion
        dial = scrub(line, lyricKeyframes(dialReduced))
      }
      dial.set(lyricPosition(levels.level, ctx.look.lyrics.intensity))
    },
    heal() {
      findSelector()
    },
    dispose() {
      release()
      setCss('')
    },
  }
}
