// Names of the CSS custom properties our UI and the Encore mapping read (see CONVENTIONS.md).
import type { Palette } from '../types'

/** Palette key → CSS variable. */
export const PALETTE_VAR: Record<keyof Palette, string> = {
  background: '--sc-background',
  surface: '--sc-surface',
  elevated: '--sc-elevated',
  text: '--sc-text',
  textSubdued: '--sc-text-subdued',
  accent: '--sc-accent',
  onAccent: '--sc-on-accent',
  border: '--sc-border',
}

export const PALETTE_VARS = Object.values(PALETTE_VAR)
