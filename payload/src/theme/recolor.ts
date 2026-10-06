// Recolours values that Spotify hard-codes instead of using Encore variables (e.g. ~27 rules with literal
// Spotify green, the black app frame, #121212 fades, component-level vars like --is-active-fg-color: #1db954,
// and the dynamic-colour header washes).
//
// We never write Spotify's hashed class names into our source: at runtime we read Spotify's own stylesheets,
// find declarations whose value is one of the known literals, and mirror just those declarations with
// `var(--sc-*) !important`. Because the selectors come from the running build, this survives Spotify updates.
import { currentHead, styleSlot } from './apply'
import { PALETTE_VAR } from './vars'

const v = (key: keyof typeof PALETTE_VAR) => `var(${PALETTE_VAR[key]})`

export interface Declaration {
  selector: string
  property: string
  value: string
  conditions: string[] // enclosing @media / @supports preludes, outermost first
}

const COLOR_PROPERTIES = new Set([
  'color',
  'background-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'fill',
  'stroke',
  'caret-color',
  'text-decoration-color',
])

const ACCENT_GREENS = [
  'rgb(30, 215, 96)', // #1ed760
  'rgb(29, 185, 84)', // #1db954
  'rgb(31, 223, 100)', // #1fdf64
  'rgb(59, 228, 119)', // #3be477 (hover)
  'rgb(26, 188, 84)', // #1abc54 (press)
  'rgb(22, 159, 71)', // #169f47
  'rgb(18, 126, 56)', // #127e38
]

/** Literal → replacement, per property kind. The only place that knows Spotify's hard-coded colours. */
const RULES: { properties: 'colors' | 'background'; literals: string[]; replacement: string }[] = [
  { properties: 'colors', literals: ACCENT_GREENS, replacement: v('accent') },
  { properties: 'background', literals: ['rgb(0, 0, 0)'], replacement: v('surface') },
  { properties: 'background', literals: ['rgb(18, 18, 18)'], replacement: v('background') },
  {
    properties: 'background',
    literals: ['rgb(24, 24, 24)', 'rgb(31, 31, 31)', 'rgb(40, 40, 40)', 'rgb(42, 42, 42)'],
    replacement: v('elevated'),
  },
]

/** Hex spellings of Spotify green, for places that keep authored text (custom properties, SVG attributes). */
const GREEN_HEX = ['#1ed760', '#1db954', '#1fdf64', '#3be477', '#1abc54', '#169f47', '#127e38']

/** Gradient fades towards Spotify's base background, e.g. `linear-gradient(#12121200, #121212)`. */
const GRADIENT_TOKENS: [RegExp, string][] = [
  [/#12121200|rgba\(18, 18, 18, 0\)/g, `rgb(from ${v('background')} r g b / 0)`],
  [/#121212(?![0-9a-f])|rgb\(18, 18, 18\)/gi, v('background')],
]

/** SVG presentation attributes (`fill="#1ED760"`) aren't in any stylesheet; match them by value. */
export const SVG_ATTRIBUTE_CSS = (['fill', 'stroke'] as const)
  .map(attr => `${GREEN_HEX.map(hex => `[${attr}="${hex}" i]`).join(', ')} { ${attr}: ${v('accent')} !important; }`)
  .join('\n')

/**
 * Dynamic-colour washes (Home header, playlist/artist headers): Spotify sets the page colour inline as
 * background-color and darkens it with `linear-gradient(#0009 …), var(--background-noise)`. The noise
 * variable is the stable signature. We add a palette layer with `background-blend-mode: color`: the result
 * keeps the page colour's lightness (headers still differ per page) but takes hue and saturation from the
 * palette, so it never clashes, and greyscale themes stay greyscale. The fade's black becomes the surface.
 */
const WASH_SIGNATURE = 'var(--background-noise)'
const WASH_TINT = `color-mix(in oklab, ${v('background')}, ${v('accent')} 40%)`

/** Black with alpha (#0009, #00000080, rgba(0, 0, 0, .6)) → the theme surface with the same alpha. */
function surfaceForBlack(value: string): string {
  const surface = (alpha: number) => `rgb(from ${v('surface')} r g b / ${+alpha.toFixed(3)})`
  return value
    .replace(/#000([0-9a-f])(?![0-9a-f])/gi, (_m, a: string) => surface(parseInt(a, 16) / 15))
    .replace(/#000000([0-9a-f]{2})(?![0-9a-f])/gi, (_m, a: string) => surface(parseInt(a, 16) / 255))
    .replace(/rgba\(0, 0, 0, ([\d.]+)\)/g, (_m, a: string) => surface(Number(a)))
}

/** Number of comma-separated layers at the top level of a background value. */
function layerCount(value: string): number {
  let depth = 0
  let count = 1
  for (const ch of value) {
    if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === ',' && depth === 0) count++
  }
  return count
}

function washReplacement(value: string): [string, string][] {
  const i = value.lastIndexOf(WASH_SIGNATURE)
  const layers = `${surfaceForBlack(value.slice(0, i))}${value.slice(i)}, linear-gradient(${WASH_TINT}, ${WASH_TINT})`
  const blend = [...Array<string>(layerCount(value)).fill('normal'), 'color'].join(', ')
  return [
    ['background-image', layers],
    ['background-blend-mode', blend],
  ]
}

/** Override declarations for one Spotify declaration (usually the same property; washes add a blend mode). */
function replacementsFor(property: string, value: string): [string, string][] {
  const single = (replacement: string | null): [string, string][] => (replacement ? [[property, replacement]] : [])
  if (property.startsWith('--')) {
    // Component-level variables, e.g. the progress bar's --is-active-fg-color: #1db954.
    const literal = value.toLowerCase()
    return single(GREEN_HEX.includes(literal) || ACCENT_GREENS.includes(literal) ? v('accent') : null)
  }
  if (property === 'background-image' && value.includes(WASH_SIGNATURE)) return washReplacement(value)
  if (property === 'background-image') {
    let out = value
    for (const [re, rep] of GRADIENT_TOKENS) out = out.replace(re, rep)
    return single(out === value ? null : out)
  }
  if (!COLOR_PROPERTIES.has(property)) return []
  const rule = RULES.find(r => (r.properties === 'colors' || property === 'background-color') && r.literals.includes(value))
  return single(rule?.replacement ?? null)
}

/** Pure: declarations → override CSS. */
export function compileRecolor(declarations: Iterable<Declaration>): string {
  const blocks = new Map<string, string[]>() // key = conditions + selector
  for (const d of declarations) {
    const replacements = replacementsFor(d.property, d.value)
    if (replacements.length === 0) continue
    const key = JSON.stringify([d.conditions, d.selector])
    const list = blocks.get(key) ?? []
    for (const [property, value] of replacements) list.push(`${property}: ${value} !important;`)
    blocks.set(key, list)
  }
  const out: string[] = []
  for (const [key, decls] of blocks) {
    const [conditions, selector] = JSON.parse(key) as [string[], string]
    let css = `${selector} { ${decls.join(' ')} }`
    for (const c of [...conditions].reverse()) css = `${c} { ${css} }`
    out.push(css)
  }
  return out.join('\n')
}

/** Reads declarations from a stylesheet, skipping the Encore theme definitions (encore-map.ts owns those). */
export function* readDeclarations(rules: CSSRuleList, conditions: string[] = []): Generator<Declaration> {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSMediaRule) {
      yield* readDeclarations(rule.cssRules, [...conditions, `@media ${rule.conditionText}`])
    } else if (rule instanceof CSSSupportsRule) {
      yield* readDeclarations(rule.cssRules, [...conditions, `@supports ${rule.conditionText}`])
    } else if (rule instanceof CSSStyleRule) {
      if (rule.selectorText.includes('encore-dark-theme') || rule.selectorText.includes('encore-light-theme')) continue
      const style = rule.style
      for (let i = 0; i < style.length; i++) {
        const property = style.item(i)
        yield { selector: rule.selectorText, property, value: style.getPropertyValue(property).trim(), conditions }
      }
    }
  }
}

const SLOT = 'sc-recolor'

/** Keeps the recolour overrides in sync with Spotify's (lazy-loaded) stylesheets. */
export function startRecolor(): { setEnabled(enabled: boolean): void; dispose(): void } {
  const cache = new WeakMap<CSSStyleSheet, string>()
  let enabled = false
  let scheduled = 0

  const sheetCss = (sheet: CSSStyleSheet): string => {
    const cached = cache.get(sheet)
    if (cached !== undefined) return cached
    let css = ''
    try {
      css = compileRecolor(readDeclarations(sheet.cssRules))
    } catch {
      // Cross-origin sheets can't be read; nothing to recolour there.
    }
    cache.set(sheet, css)
    return css
  }

  const render = () => {
    scheduled = 0
    const style = styleSlot(SLOT)
    if (!enabled) {
      style.textContent = ''
      return
    }
    const parts: string[] = [SVG_ATTRIBUTE_CSS]
    for (const sheet of Array.from(document.styleSheets)) {
      const owner = sheet.ownerNode
      if (owner instanceof Element && owner.id.startsWith('sc-')) continue
      parts.push(sheetCss(sheet))
    }
    style.textContent = parts.filter(Boolean).join('\n')
  }
  const schedule = () => {
    if (!scheduled) scheduled = requestAnimationFrame(render)
  }

  // New Spotify stylesheets arrive as <link>/<style> in <head>; links are readable only after load.
  const onLoad = (e: Event) => {
    if (e.target instanceof HTMLLinkElement) schedule()
  }
  document.addEventListener('load', onLoad, true)
  const observer = new MutationObserver(records => {
    if (records.some(r => Array.from(r.addedNodes).some(n => n instanceof HTMLStyleElement && !n.id.startsWith('sc-')))) {
      schedule()
    }
    // At document start neither <html> nor <head> may exist: watch the document until <head> does, then narrow to it.
    const head = currentHead()
    if (watchingRoot && head) {
      watchingRoot = false
      observer.disconnect()
      observer.observe(head, { childList: true })
      schedule()
    }
  })
  const initialHead = currentHead()
  let watchingRoot = !initialHead
  observer.observe(initialHead ?? document, { childList: true, subtree: !initialHead })

  return {
    setEnabled(next) {
      if (next === enabled) return
      enabled = next
      schedule()
    },
    dispose() {
      observer.disconnect()
      document.removeEventListener('load', onLoad, true)
      if (scheduled) cancelAnimationFrame(scheduled)
    },
  }
}
