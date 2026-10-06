// Hide/order CSS for "keyed sections": siblings in one flex container that we mark with a key attribute
// (Home shelves, Now playing panel sections). Uses CSS `order`, so React-owned nodes never move.

export interface KeyedSectionsCss {
  /** Selector for the siblings that take part in ordering (keyed or not). */
  items: string
  /** Selector for the one section with this key. */
  byKey(key: string): string
  hidden: readonly string[]
  /** Keys in desired order; items not listed keep their natural order after the listed ones. */
  order: readonly string[]
}

export function keySelector(scope: string, attr: string, key: string): string {
  return `${scope}[${attr}="${CSS.escape(key)}"]`
}

export function compileKeyedSectionsCss(s: KeyedSectionsCss): string {
  const css: string[] = []
  const order = [...new Set(s.order)]
  if (order.length > 0) {
    css.push(`${s.items} { order: ${order.length + 1} !important; }`)
    order.forEach((key, i) => css.push(`${s.byKey(key)} { order: ${i + 1} !important; }`))
  }
  if (s.hidden.length > 0) {
    css.push(`${s.hidden.map(k => s.byKey(k)).join(',\n')} { display: none !important; }`)
  }
  return css.join('\n')
}
