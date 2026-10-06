// The colour of Spotify's playing equaliser (the animated bars in place of the playing song's number). Auto follows
// the playing-row colour, which is the accent unless one was picked.
import { useState } from 'preact/hooks'
import type { PageStyle } from '../../../types'
import { useApp } from '../../context'
import { ColorField } from '../../ui/ColorField'
import type { PageEdit } from './groups'

export function EqualiserField({ page, edit }: { page: PageStyle; edit: PageEdit }) {
  const accent = useApp(s => s.active.palette.accent)
  const [open, setOpen] = useState(false)

  return (
    <div style={{ margin: '0 -8px' }}>
      <ColorField
        label="Equaliser colour"
        hint="The moving bars on the playing song"
        value={page.equaliserColor ?? undefined}
        autoValue={page.playingColor ?? accent}
        open={open}
        onToggle={() => setOpen(!open)}
        onChange={hex => edit('equaliserColor', hex ?? null, 'page.equaliserColor')}
      />
    </div>
  )
}
