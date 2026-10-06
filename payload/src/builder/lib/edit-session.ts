// An editing session over a few slices of the theme (e.g. one part's style). Edits apply live; the session
// remembers how the slices looked when it started so Cancel can put them back in a single undo step, and so
// the UI can tell whether anything changed at all.
import type { Theme } from '../../types'

export interface Slice {
  read: (theme: Theme) => unknown
  write: (draft: Theme, value: unknown) => void
}

export type Snapshot = readonly string[] // one JSON string per slice ("undefined" for missing values)

const freeze = (value: unknown): string => (value === undefined ? 'undefined' : JSON.stringify(value))

export function capture(theme: Theme, slices: readonly Slice[]): Snapshot {
  return slices.map(s => freeze(s.read(theme)))
}

export function hasChanges(theme: Theme, slices: readonly Slice[], snapshot: Snapshot): boolean {
  return slices.some((s, i) => freeze(s.read(theme)) !== snapshot[i])
}

/** A theme mutation that puts every slice back as it was in the snapshot. */
export function restore(slices: readonly Slice[], snapshot: Snapshot) {
  return (draft: Theme) => {
    slices.forEach((s, i) => {
      const saved = snapshot[i]
      s.write(draft, saved === 'undefined' ? undefined : (JSON.parse(saved) as unknown))
    })
  }
}
