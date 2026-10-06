// Small, named theme mutations shared by tabs and pick mode, so every place edits the theme the same way.
import type { Palette, PartStyle, Theme } from '../../types'
import { lookup } from './record'

export function setPaletteColor(key: keyof Palette, hex: string) {
  return (t: Theme) => {
    t.palette[key] = hex
  }
}

/** Theme.parts without one entry (parts with no overrides are removed rather than kept empty). */
function withoutPart(parts: Theme['parts'], partId: string): Theme['parts'] {
  const { [partId]: _removed, ...rest } = parts
  return rest
}

export function setPartProp<K extends keyof PartStyle>(partId: string, prop: K, value: PartStyle[K] | undefined) {
  return (t: Theme) => {
    const { [prop]: _old, ...rest } = lookup(t.parts, partId) ?? {}
    const style: PartStyle = value === undefined ? rest : { ...rest, [prop]: value }
    t.parts = Object.keys(style).length ? { ...t.parts, [partId]: style } : withoutPart(t.parts, partId)
  }
}

export function resetPart(partId: string) {
  return (t: Theme) => {
    t.parts = withoutPart(t.parts, partId)
    t.layout.hidden = t.layout.hidden.filter(id => id !== partId)
  }
}

export function setHidden(id: string, hidden: boolean) {
  return (t: Theme) => {
    const rest = t.layout.hidden.filter(h => h !== id)
    t.layout.hidden = hidden ? [...rest, id] : rest
  }
}

export function isPartEdited(theme: Theme, partId: string): boolean {
  return Object.keys(lookup(theme.parts, partId) ?? {}).length > 0 || theme.layout.hidden.includes(partId)
}
