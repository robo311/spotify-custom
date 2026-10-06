// Save / Cancel for a part editor: edits stay live while open; Cancel puts back exactly what this editor changed
// (one undo step). If the first edit forked a preset into "(my version)", Cancel returns to the preset and
// removes that fork, so cancelling leaves no trace.
import { useMemo, useState } from 'preact/hooks'
import { useApp, useEnv } from '../context'
import { capture, hasChanges, restore } from '../lib/edit-session'
import { partSlices } from '../lib/part-slices'

export interface PartSession {
  changed: boolean
  cancel: () => void
}

export function usePartSession(partId: string): PartSession {
  const { store } = useEnv()
  const slices = useMemo(() => partSlices(partId), [partId])
  const [start] = useState(() => {
    const s = store.get()
    return { snapshot: capture(s.active, slices), themeId: s.active.id, wasPreset: s.activeIsPreset, knownIds: new Set(s.userThemes.map(t => t.id)) }
  })
  const changed = useApp(s => s.active.id !== start.themeId || hasChanges(s.active, slices, start.snapshot))

  const cancel = () => {
    const now = store.get()
    const forkedHere = start.wasPreset && now.active.id !== start.themeId && !start.knownIds.has(now.active.id)
    if (forkedHere) {
      const fork = now.active.id
      store.selectTheme(start.themeId)
      store.deleteTheme(fork)
    } else if (hasChanges(now.active, slices, start.snapshot)) {
      store.edit(restore(slices, start.snapshot))
    }
  }

  return { changed, cancel }
}
