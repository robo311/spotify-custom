// Home's shortcut cards: how tall they are and how many sit in a row (theme.homeStyle).
import type { HomeStyle } from '../../types'
import { useApp, useEnv } from '../context'
import { Field } from '../ui/Field'
import { Segmented } from '../ui/Segmented'

type Columns = `${HomeStyle['shortcutColumns']}`

export function ShortcutLayoutPicker() {
  const { store } = useEnv()
  const look = useApp(s => s.active.homeStyle)
  const edit = (mutate: (h: HomeStyle) => void) =>
    store.edit(t => {
      const next = { ...t.homeStyle }
      mutate(next)
      t.homeStyle = next
    })

  return (
    <>
      <Field label="Card size">
        <Segmented<HomeStyle['shortcutSize']>
          label="Card size"
          value={look.shortcutSize}
          onChange={v => edit(h => (h.shortcutSize = v))}
          options={[
            { value: 'spotify', label: 'Auto', title: 'Spotify picks the size for the window width' },
            { value: 'small', label: 'Small' },
            { value: 'medium', label: 'Medium' },
            { value: 'large', label: 'Large' },
          ]}
        />
      </Field>
      <Field label="Cards per row">
        <Segmented<Columns>
          label="Cards per row"
          value={`${look.shortcutColumns}`}
          onChange={v => edit(h => (h.shortcutColumns = Number(v) as HomeStyle['shortcutColumns']))}
          options={[
            { value: '0', label: 'Auto', title: 'Spotify picks the number for the window width' },
            { value: '2', label: '2' },
            { value: '3', label: '3' },
            { value: '4', label: '4' },
          ]}
        />
      </Field>
    </>
  )
}
