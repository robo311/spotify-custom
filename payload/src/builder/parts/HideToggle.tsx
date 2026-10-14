// A switch that hides one of the small things in LAYOUT_OPTIONS (a button, a label), shown in its area's tab.
import { useApp, useEnv } from '../context'
import { setHidden } from '../lib/theme-edits'
import { Toggle } from '../ui/Toggle'

export function HideToggle({ id, label, description }: { id: string; label: string; description?: string }) {
  const { store } = useEnv()
  const hidden = useApp(s => s.active.layout.hidden.includes(id))
  return (
    <div data-hide={id} style={{ display: 'contents' }}>
      <Toggle label={label} description={description} checked={hidden} onChange={v => store.edit(setHidden(id, v))} />
    </div>
  )
}
