// Readability guard: which palette pairs are hard to read, and the one-click fix for each.
import type { Color, Palette } from '../../types'

export const MIN_CONTRAST = 4.5

export interface ContrastIssue {
  fg: keyof Palette
  bg: keyof Palette
  ratio: number
}

export interface ContrastTools {
  pairs: readonly (readonly [keyof Palette, keyof Palette])[]
  ratio(a: Color, b: Color): number
  fix(fg: Color, bg: Color, min: number): Color
}

export function contrastIssues(palette: Palette, tools: ContrastTools): ContrastIssue[] {
  return tools.pairs
    .map(([fg, bg]) => ({ fg, bg, ratio: tools.ratio(palette[fg], palette[bg]) }))
    .filter(issue => issue.ratio < MIN_CONTRAST)
}

/** Every checked pair involving one palette key (passing or not), worst first. */
export function pairsFor(key: keyof Palette, palette: Palette, tools: ContrastTools): ContrastIssue[] {
  return tools.pairs
    .filter(([fg, bg]) => fg === key || bg === key)
    .map(([fg, bg]) => ({ fg, bg, ratio: tools.ratio(palette[fg], palette[bg]) }))
    .sort((a, b) => a.ratio - b.ratio)
}

/** Issues that involve one palette key, worst first. */
export function issuesFor(key: keyof Palette, issues: readonly ContrastIssue[]): ContrastIssue[] {
  return issues.filter(i => i.fg === key || i.bg === key).sort((a, b) => a.ratio - b.ratio)
}

/** The palette change that fixes an issue: always adjusts the foreground, so backgrounds the user chose stay put. */
export function fixFor(palette: Palette, issue: ContrastIssue, tools: ContrastTools): Partial<Palette> {
  return { [issue.fg]: tools.fix(palette[issue.fg], palette[issue.bg], MIN_CONTRAST) }
}

/** Ratio formatted the way people read it, e.g. "3.1:1". */
export function formatRatio(ratio: number): string {
  return `${(Math.floor(ratio * 10) / 10).toFixed(1)}:1`
}
