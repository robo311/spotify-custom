// Runtime state the compiled CSS depends on but can't know ahead of time:
//  • --sc-cover-url: the current cover art (for the "cover-blur" lyrics background).
//  • --sc-page-cover-url / --sc-page-cover-color: the open album / playlist / song page's cover and the colour
//    Spotify derived from it (it sets that inline on the header backdrop), for pageStyle's blurred backdrop and glow.
//  • Full screen on macOS: the window buttons disappear but Spotify keeps their space. Chromium reports full screen
//    as the display mode (the window's size can't tell: on notched Macs it stays below the notch, like a zoomed one).
//  • Past lyric lines: Spotify marks them only with a hashed class. We find it by its meaning (the lyrics-line
//    rule that draws the inactive colour at 50% opacity) in Spotify's own stylesheets, so it survives rebuilds.
import { COVER_URL_VAR, PAST_LINE_OPACITY_VAR, PAST_LINE_VAR } from './lyrics'
import { PAGE_COVER_COLOR_VAR, PAGE_COVER_URL_VAR } from './page-look'
import { APP_ROOT, HEADER_BACKDROP, HEADER_COVER, LYRICS_LINE, MAC_ATTR, NOW_PLAYING_COVER_IMAGE, WINDOW_BUTTONS_SPACER } from './selectors'

const STYLE_ID = 'sc-parts-runtime'

/** Selector of Spotify's "past lyric line" rule, or null if this Spotify version has none. */
export function findPastLineSelector(sheets: Iterable<CSSStyleSheet>): string | null {
  const walk = (rules: CSSRuleList): string | null => {
    for (const rule of rules) {
      if (rule instanceof CSSStyleRule) {
        const { color, opacity } = rule.style
        if (/^(\.[\w-]+){2}$/.test(rule.selectorText) && color === 'var(--lyrics-color-inactive)' && opacity === '0.5') {
          return rule.selectorText
        }
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

/** The widest image in an <img>'s srcset: Spotify's src is the small 300px cover, too soft for a banner. */
export function largestImage(img: Element): string | null {
  let best: { url: string; width: number } | null = null
  for (const candidate of (img.getAttribute('srcset') ?? '').split(',')) {
    const [url = '', size = ''] = candidate.trim().split(/\s+/)
    const width = Number.parseInt(size, 10)
    if (url && Number.isFinite(width) && (!best || width > best.width)) best = { url, width }
  }
  return best?.url ?? img.getAttribute('src')
}

const FULLSCREEN_CSS = `@media (display-mode: fullscreen) { ${WINDOW_BUTTONS_SPACER} { display: none !important; } }`

export interface PageRuntime {
  cover: string | null
  color: string | null
}

const PLAIN_COLOR = /^#[0-9a-f]{3,8}$/i

export function cssUrl(src: string): string {
  return `url("${src.replace(/["\\\n]/g, encodeURIComponent)}")`
}

export function runtimeCss(coverSrc: string | null, pastLineSelector: string | null, page?: PageRuntime): string {
  const css: string[] = [FULLSCREEN_CSS]
  if (coverSrc) css.push(`:root { ${COVER_URL_VAR}: ${cssUrl(coverSrc)}; }`)
  if (page?.cover) css.push(`:root { ${PAGE_COVER_URL_VAR}: ${cssUrl(page.cover)}; }`)
  if (page?.color && PLAIN_COLOR.test(page.color)) css.push(`:root { ${PAGE_COVER_COLOR_VAR}: ${page.color}; }`)
  if (pastLineSelector) {
    css.push(
      `${LYRICS_LINE}${pastLineSelector}, ${LYRICS_LINE} ${pastLineSelector}, ${pastLineSelector}:has(${LYRICS_LINE}) {` +
        ` color: var(${PAST_LINE_VAR}, var(--lyrics-color-inactive)) !important;` +
        ` opacity: var(${PAST_LINE_OPACITY_VAR}, 0.5) !important; }`,
    )
  }
  return css.join('\n')
}

export function startPartsRuntime(): () => void {
  const style = document.createElement('style')
  style.id = STYLE_ID
  document.head.append(style)

  const root = document.documentElement
  root.toggleAttribute(MAC_ATTR, navigator.platform.includes('Mac'))

  let pastLine: string | null = null
  let scannedSheets = -1
  const update = () => {
    // Lyrics CSS is lazy-loaded with the lyrics view; rescan only when new stylesheets arrived.
    if (!pastLine && document.querySelector(LYRICS_LINE) && document.styleSheets.length !== scannedSheets) {
      scannedSheets = document.styleSheets.length
      pastLine = findPastLineSelector(document.styleSheets)
    }
    const cover = document.querySelector(NOW_PLAYING_COVER_IMAGE)?.getAttribute('src') ?? null
    const pageCover = document.querySelector(`${HEADER_COVER} img`)
    const page: PageRuntime = {
      cover: pageCover ? largestImage(pageCover) : null,
      color: document.querySelector<HTMLElement>(HEADER_BACKDROP)?.style.getPropertyValue('--background-base').trim() ?? null,
    }
    const css = runtimeCss(cover, pastLine, page)
    if (style.textContent !== css) style.textContent = css
  }

  let frame = 0
  const observer = new MutationObserver(() => {
    if (frame === 0) {
      frame = requestAnimationFrame(() => {
        frame = 0
        update()
      })
    }
  })
  observer.observe(document.querySelector(APP_ROOT) ?? document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'srcset'],
  })
  update()

  return () => {
    observer.disconnect()
    if (frame !== 0) cancelAnimationFrame(frame)
    style.remove()
    root.removeAttribute(MAC_ATTR)
  }
}
