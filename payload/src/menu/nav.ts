// Pure keyboard movement through a panel's rows. Rows are given as their labels, null for rows you can't land on
// (separators, group labels, disabled items).

export type Targets = readonly (string | null)[]

/** The next row in a direction, wrapping around; -1 when nothing can be selected. */
export function step(targets: Targets, from: number, dir: 1 | -1): number {
  if (from < 0) return edge(targets, dir === 1 ? 'first' : 'last')
  const n = targets.length
  for (let i = 1; i <= n; i++) {
    const at = (((from + dir * i) % n) + n) % n
    if (targets[at] !== null) return at
  }
  return -1
}

export function edge(targets: Targets, which: 'first' | 'last'): number {
  if (which === 'first') return targets.findIndex(t => t !== null)
  for (let i = targets.length - 1; i >= 0; i--) if (targets[i] !== null) return i
  return -1
}

/** Type-to-jump: the next row after `from` whose label starts with `char`, wrapping; `from` when none does. */
export function jump(targets: Targets, from: number, char: string): number {
  const c = char.toLocaleLowerCase()
  const n = targets.length
  for (let i = 1; i <= n; i++) {
    const at = (((from + i) % n) + n) % n
    if (targets[at]?.trim().toLocaleLowerCase().startsWith(c)) return at
  }
  return from
}
