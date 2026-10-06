// Tiny helpers for generating CSS text. Pure functions, no DOM.

export type Declarations = Record<string, string>

export interface CssRule {
  selector: string
  decls: Declarations
}

/**
 * Renders rules as CSS text. Every declaration is !important: Spotify lazily appends stylesheets after ours,
 * so source order can't be relied on, and its hashed-class rules would otherwise win ties.
 */
export function renderRules(rules: CssRule[]): string {
  // Rules for the same selector are merged (first occurrence keeps its position, later values win).
  const merged = new Map<string, Declarations>()
  for (const rule of rules) merged.set(rule.selector, { ...merged.get(rule.selector), ...rule.decls })
  return [...merged]
    .filter(([, decls]) => Object.keys(decls).length > 0)
    .map(([selector, decls]) => {
      const body = Object.entries(decls)
        .map(([prop, value]) => `  ${prop}: ${value} !important;`)
        .join('\n')
      return `${selector} {\n${body}\n}`
    })
    .join('\n')
}

/** Joins alternatives into one selector; :is() keeps compound targets correct when there are several roots. */
export function anyOf(selectors: readonly string[]): string {
  return selectors.length === 1 ? (selectors[0] ?? '') : `:is(${selectors.join(', ')})`
}

/** Resolves a target relative to a root: '&' (or empty) is the root itself, anything else is a descendant/child. */
export function within(root: string, relative: string): string {
  return relative === '&' || relative === '' ? root : `${root} ${relative}`
}

export function hideRule(selectors: readonly string[]): CssRule {
  return { selector: selectors.join(',\n'), decls: { display: 'none' } }
}

export function isGradient(paint: string): boolean {
  return /gradient\(/i.test(paint)
}

/** Mixes a colour towards another (both CSS colours), e.g. for hover/press shades. */
export function mix(color: string, towards: string, amount: number): string {
  return `color-mix(in oklab, ${color} ${100 - amount}%, ${towards})`
}

/** The colour at a given opacity. */
export function fade(color: string, opacityPercent: number): string {
  return `color-mix(in oklab, ${color} ${opacityPercent}%, transparent)`
}
