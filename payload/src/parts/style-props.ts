// Turns one PartStyle property into CSS rules for one target. Spotify's components read Encore variables
// (--background-base, --text-base, …), so scoping those variables to a part recolours everything inside it,
// including hover/press states, without touching hashed classes.
import { parse, wcagLuminance } from 'culori'
import type { PartStyle } from '../types'
import { ACCENT_SET } from './selectors'
import { fade, isGradient, mix, type CssRule, type Declarations } from './css'

export type StyleProp = keyof PartStyle

/** Where a property applies inside a part. A plain string is shorthand for `{ sel }`. */
export interface Target {
  /** Relative to the part root; '&' (default) is the root itself. */
  sel?: string
  /**
   * Also set the raw CSS property (background / color / border-radius) here.
   * Defaults to true for standard targets and false when `vars` is given.
   */
  paint?: boolean
  /** Set exactly these custom properties to the value instead of the property's standard variable set. */
  vars?: string[]
  /** radius only: also clip children to the rounded shape (regions whose inner panels have their own corners). */
  clip?: boolean
  /**
   * background only: Spotify's hover state paints a fixed colour over ours, so repaint it under this state suffix
   * (e.g. ':is(:hover, :focus-within)') with a soft text-coloured wash; works for colours and gradients alike.
   */
  hover?: string
  /** Colour props with `vars`: write the colour at this opacity (%) instead, e.g. a subdued text variant. */
  fade?: number
  /** size only: this fraction of the size (e.g. 0.5 for the icon inside a button). */
  scale?: number
}
export type TargetSpec = string | Target

export function normaliseTarget(spec: TargetSpec): Target & { sel: string; paint: boolean } {
  const t = typeof spec === 'string' ? { sel: spec } : spec
  return { ...t, sel: t.sel ?? '&', paint: t.paint ?? t.vars === undefined }
}

// Shades lean towards the theme's text colour, so they work for light and dark palettes alike.
const TOWARDS_TEXT = 'var(--sc-text, #fff)'

function backgroundVars(color: string): Declarations {
  return {
    '--background-base': color,
    '--background-highlight': mix(color, TOWARDS_TEXT, 8),
    '--background-press': mix(color, '#000', 12),
    '--background-elevated-base': mix(color, TOWARDS_TEXT, 8),
    '--background-elevated-highlight': mix(color, TOWARDS_TEXT, 14),
    '--background-elevated-press': mix(color, '#000', 8),
  }
}

function textVars(color: string): Declarations {
  return {
    '--text-base': color,
    '--text-subdued': fade(color, 70),
    '--essential-base': color,
    '--essential-subdued': fade(color, 55),
  }
}

/** Black or white, whichever reads better on the given colour (falls back to white for unparsable values). */
export function readableOn(color: string): string {
  const parsed = parse(color)
  if (!parsed) return '#fff'
  return wcagLuminance(parsed) > 0.4 ? '#000' : '#fff'
}

function accentVars(color: string): Declarations {
  return { '--text-bright-accent': color, '--essential-bright-accent': color, '--is-active-fg-color': color }
}

function accentFillVars(color: string): Declarations {
  return {
    '--background-base': color,
    '--background-highlight': mix(color, '#fff', 10),
    '--background-press': mix(color, '#000', 10),
    '--text-base': readableOn(color),
  }
}

function fromVars(vars: readonly string[], value: string): Declarations {
  return Object.fromEntries(vars.map(v => [v, value]))
}

const HOVER_WASH = 'inset 0 0 0 100vmax color-mix(in oklab, var(--sc-text, #fff) 10%, transparent)'

/** CSS rules for one property on one (absolute) selector. */
export function propRules(prop: StyleProp, value: string | number, selector: string, target: Target): CssRule[] {
  const paint = target.paint ?? true
  const colour = (v: string) => (target.fade === undefined ? v : fade(v, target.fade))
  switch (prop) {
    case 'background': {
      const v = String(value)
      const gradient = isGradient(v)
      if (target.vars) return gradient ? [] : [{ selector, decls: fromVars(target.vars, colour(v)) }]
      // A gradient can't live in a colour variable: paint it here and let inner panels show through.
      const vars = gradient ? (paint ? { '--background-base': 'transparent' } : {}) : backgroundVars(v)
      const rules: CssRule[] = [{ selector, decls: { ...vars, ...(paint ? { background: v } : {}) } }]
      if (paint && target.hover) rules.push({ selector: `${selector}${target.hover}`, decls: { background: v, 'box-shadow': HOVER_WASH } })
      return rules
    }
    case 'text': {
      const v = String(value)
      if (target.vars) return [{ selector, decls: fromVars(target.vars, colour(v)) }]
      return [{ selector, decls: { ...textVars(v), ...(paint ? { color: v } : {}) } }]
    }
    case 'accent': {
      const v = String(value)
      if (target.vars) return [{ selector, decls: fromVars(target.vars, colour(v)) }]
      // Encore "bright accent" sets (e.g. the green play button) redefine --background-* on their own element.
      return [
        { selector, decls: accentVars(v) },
        { selector: `${selector} ${ACCENT_SET}`, decls: accentFillVars(v) },
      ]
    }
    case 'radius': {
      const px = `${Number(value)}px`
      if (target.vars) return [{ selector, decls: fromVars(target.vars, px) }]
      if (!paint) return []
      return [{ selector, decls: { 'border-radius': px, ...(target.clip ? { overflow: 'clip' } : {}) } }]
    }
    case 'size': {
      const px = `${Math.round(Number(value) * (target.scale ?? 1))}px`
      if (target.vars) return [{ selector, decls: fromVars(target.vars, px) }]
      return [{ selector, decls: { width: px, height: px, 'min-width': px, 'min-height': px } }]
    }
  }
}
