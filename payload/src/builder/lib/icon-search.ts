// Icon search: labels are moods ("Favourites") while people often type the object ("star"), so match both.

export interface SearchableIcon {
  id: string
  label: string
}

export function searchIcons<T extends SearchableIcon>(icons: readonly T[], query: string): readonly T[] {
  const q = query.trim().toLowerCase()
  if (!q) return icons
  return icons.filter(i => i.label.toLowerCase().includes(q) || i.id.toLowerCase().includes(q))
}
