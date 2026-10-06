// Display helpers shared by the stats shelf components.
import type { TopItem, TopKind } from './data'

/** 1 → "01" */
export const rankLabel = (rank: number): string => String(rank).padStart(2, '0')

/** Screen-reader label: the visual rank numeral is decorative. */
export function itemAriaLabel(item: TopItem, rank: number, kind: TopKind): string {
  const by = kind === 'tracks' && item.subtitle ? `, ${item.subtitle}` : ''
  return `${rankLabel(rank)}. ${item.name}${by}`
}
