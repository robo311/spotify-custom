// How palette colours are named and explained to people (not how the engine names them).
import type { Palette } from '../../types'

export interface PaletteKeyMeta {
  key: keyof Palette
  label: string
  hint: string
}

export const PALETTE_KEYS: readonly PaletteKeyMeta[] = [
  { key: 'accent', label: 'Accent', hint: 'Play buttons, progress, highlights' },
  { key: 'onAccent', label: 'Text on accent', hint: 'Icons and text drawn on the accent' },
  { key: 'background', label: 'Background', hint: 'Behind every page' },
  { key: 'surface', label: 'Panels', hint: 'Sidebar, player bar, side panel' },
  { key: 'elevated', label: 'Cards & menus', hint: 'Cards, menus, hover states' },
  { key: 'text', label: 'Text', hint: 'Titles and main text' },
  { key: 'textSubdued', label: 'Secondary text', hint: 'Artists, captions, inactive icons' },
  { key: 'border', label: 'Lines', hint: 'Dividers and outlines' },
]

export function paletteLabel(key: keyof Palette): string {
  return PALETTE_KEYS.find(m => m.key === key)?.label ?? key
}
