// THE mapping from our 8-colour palette to Spotify's Encore design-system variables.
//
// Spotify defines ~25 colour variables per "colour set" (base, bright-accent, inverted, …) on readable
// `.encore-*` classes (its theming API, probed on 1.3.3). Every value here is a CSS expression over our
// `--sc-*` palette variables, so changing (or animating) one palette variable re-tints everything that
// derives from it. When Spotify renames a variable, this table is the only place to fix.
import type { Palette } from '../types'
import { PALETTE_VAR } from './vars'

const sc = (key: keyof Palette) => `var(${PALETTE_VAR[key]})`
const mix = (a: string, b: string, pct: number) => `color-mix(in oklab, ${a}, ${b} ${pct}%)`
const alpha = (c: string, pct: number) => `color-mix(in oklab, ${c} ${pct}%, transparent)`

const BG = sc('background')
const SURFACE = sc('surface')
const ELEVATED = sc('elevated')
const TEXT = sc('text')
const SUBDUED = sc('textSubdued')
const ACCENT = sc('accent')
const ON_ACCENT = sc('onAccent')
const BORDER = sc('border')

type VarSet = Record<string, string>

/** Neutral set: panels and lists (Encore "base"). */
const base: VarSet = {
  '--background-base': BG,
  '--background-highlight': mix(BG, TEXT, 7),
  '--background-press': mix(BG, SURFACE, 60),
  '--background-elevated-base': ELEVATED,
  '--background-elevated-highlight': mix(ELEVATED, TEXT, 7),
  '--background-elevated-press': mix(ELEVATED, SURFACE, 40),
  '--background-tinted-base': alpha(TEXT, 10),
  '--background-tinted-highlight': alpha(TEXT, 14),
  '--background-tinted-press': alpha(TEXT, 21),
  '--text-base': TEXT,
  '--text-subdued': SUBDUED,
  '--text-bright-accent': ACCENT,
  '--text-positive': ACCENT,
  '--essential-base': TEXT,
  '--essential-subdued': mix(SUBDUED, BG, 35),
  '--essential-bright-accent': ACCENT,
  '--essential-positive': ACCENT,
  '--decorative-base': TEXT,
  '--decorative-subdued': BORDER,
}

/** Frame-coloured sets: the app frame and "muted" areas that Spotify paints black. */
const frame: VarSet = {
  ...base,
  '--background-base': SURFACE,
  '--background-highlight': mix(SURFACE, TEXT, 6),
  '--background-press': mix(SURFACE, TEXT, 12),
  '--background-elevated-base': mix(SURFACE, TEXT, 6),
  '--background-elevated-highlight': mix(SURFACE, TEXT, 10),
  '--background-elevated-press': mix(SURFACE, BG, 50),
  '--decorative-subdued': mix(BORDER, SURFACE, 30),
}

/** Accent fills: big play buttons, primary buttons. */
const brightAccent: VarSet = {
  '--background-base': ACCENT,
  '--background-highlight': mix(ACCENT, TEXT, 18),
  '--background-press': mix(ACCENT, SURFACE, 18),
  '--background-elevated-base': mix(ACCENT, TEXT, 18),
  '--background-elevated-highlight': mix(ACCENT, TEXT, 18),
  '--background-elevated-press': mix(ACCENT, SURFACE, 18),
  '--background-tinted-base': ACCENT,
  '--background-tinted-highlight': ACCENT,
  '--background-tinted-press': ACCENT,
  '--text-base': ON_ACCENT,
  '--text-subdued': ON_ACCENT,
  '--text-bright-accent': ON_ACCENT,
  '--text-positive': ON_ACCENT,
  '--essential-base': ON_ACCENT,
  '--essential-subdued': ON_ACCENT,
  '--essential-bright-accent': ON_ACCENT,
  '--essential-positive': ON_ACCENT,
  '--decorative-base': ON_ACCENT,
  '--decorative-subdued': mix(ACCENT, SURFACE, 18),
}

/** Inverted fills: Spotify's white pills/buttons become text-coloured, with background-coloured content. */
const inverted: VarSet = {
  '--background-base': TEXT,
  '--background-highlight': mix(TEXT, BG, 6),
  '--background-press': mix(TEXT, BG, 22),
  '--background-elevated-base': mix(TEXT, BG, 6),
  '--background-elevated-highlight': mix(TEXT, BG, 6),
  '--background-elevated-press': mix(TEXT, BG, 22),
  '--background-tinted-base': TEXT,
  '--background-tinted-highlight': TEXT,
  '--background-tinted-press': TEXT,
  '--text-base': BG,
  '--text-subdued': mix(BG, TEXT, 35),
  '--text-bright-accent': mix(ACCENT, BG, 35),
  '--essential-base': BG,
  '--essential-subdued': mix(BG, TEXT, 45),
  '--essential-bright-accent': mix(ACCENT, BG, 25),
  '--decorative-base': BG,
  '--decorative-subdued': mix(TEXT, BG, 13),
}

/** Encore set selectors (dark theme only — Spotify desktop is dark-only) → variables. */
export const ENCORE_SETS: { sets: string[]; vars: VarSet }[] = [
  { sets: ['base'], vars: base },
  { sets: ['app-frame', 'muted-accent', 'inverted-dark'], vars: frame },
  // "positive" is Spotify's brand green (e.g. "added" states), so it follows the accent too.
  { sets: ['bright-accent', 'positive'], vars: brightAccent },
  { sets: ['inverted', 'inverted-light'], vars: inverted },
  // negative / warning / announcement / over-media keep Spotify's semantic colours.
]

/**
 * `html.` raises specificity above Spotify's own `.encore-dark-theme …` rules, so our values win
 * regardless of stylesheet order (Spotify lazy-loads CSS after ours).
 */
function selectorFor(set: string): string {
  return set === 'base'
    ? 'html.encore-dark-theme, html.encore-dark-theme .encore-base-set'
    : `html.encore-dark-theme .encore-${set}-set`
}

export function compileEncoreVars(): string {
  return ENCORE_SETS.map(({ sets, vars }) => {
    const body = Object.entries(vars)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n')
    return `${sets.map(selectorFor).join(',\n')} {\n${body}\n}`
  }).join('\n')
}
