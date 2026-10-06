// One hover-preview intent shared by every theme card in the Start tab, so gliding between cards (even across
// the presets / your themes boundary) never flashes the active theme.
import { createContext } from 'preact'
import { useContext, useEffect, useState } from 'preact/hooks'
import { useEnv, useUi } from '../../context'
import { createPreviewIntent, type PreviewIntent } from '../../lib/preview-intent'

export const GalleryPreviewContext = createContext<PreviewIntent | null>(null)

/** Creates the intent for a gallery area; reverts when the drawer closes or the tab goes away. */
export function useGalleryPreview(): PreviewIntent {
  const { store } = useEnv()
  const open = useUi(s => s.open)
  const [intent] = useState(() => createPreviewIntent({ apply: theme => store.preview(theme) }))

  useEffect(() => {
    if (!open) intent.leaveGallery()
  }, [open, intent])
  useEffect(() => () => intent.leaveGallery(), [intent])

  return intent
}

export function useGalleryPreviewIntent(): PreviewIntent {
  const intent = useContext(GalleryPreviewContext)
  if (!intent) throw new Error('Theme cards must be inside a gallery preview area')
  return intent
}
