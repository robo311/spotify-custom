// Rename / delete controls under one of your own themes. Delete asks inline, not with a browser dialog.
import { useState } from 'preact/hooks'
import { Pencil, Trash2 } from 'lucide-static'
import type { Theme } from '../../../types'
import { useEnv } from '../../context'
import { css, useStyles } from '../../styles/sheet'
import { Button, IconButton } from '../../ui/Button'

const styles = css`
  .b-uta {
    display: flex;
    align-items: center;
    gap: 2px;
    min-height: 30px;
    padding: 0 4px;
  }
  .b-uta__input {
    flex: 1;
    min-width: 0;
    height: 28px;
    padding: 0 8px;
    border: 0;
    border-radius: var(--b-r-sm);
    background: var(--b-hover);
    box-shadow: inset 0 0 0 2px var(--b-accent);
    outline: none;
  }
  .b-uta__confirm {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    padding: 4px;
    font-size: 12px;
  }
`

export function UserThemeActions({ theme }: { theme: Theme }) {
  useStyles(styles)
  const { store } = useEnv()
  const [mode, setMode] = useState<'idle' | 'rename' | 'confirm-delete'>('idle')

  const commit = (value: string) => {
    const name = value.trim()
    if (name && name !== theme.name) store.renameTheme(theme.id, name)
    setMode('idle')
  }

  if (mode === 'rename') {
    return (
      <div class="b-uta">
        <input
          class="b-uta__input"
          aria-label={`New name for ${theme.name}`}
          value={theme.name}
          ref={el => el?.select()}
          onBlur={e => commit(e.currentTarget.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') commit(e.currentTarget.value)
            if (e.key === 'Escape') {
              e.stopPropagation()
              setMode('idle')
            }
          }}
        />
      </div>
    )
  }

  if (mode === 'confirm-delete') {
    return (
      <div class="b-uta__confirm" role="group" aria-label={`Delete ${theme.name}?`}>
        <Button variant="danger" onClick={() => store.deleteTheme(theme.id)}>
          Delete
        </Button>
        <Button onClick={() => setMode('idle')}>Keep</Button>
      </div>
    )
  }

  return (
    <div class="b-uta">
      <IconButton icon={Pencil} size={14} label={`Rename ${theme.name}`} onClick={() => setMode('rename')} />
      <IconButton icon={Trash2} size={14} label={`Delete ${theme.name}`} onClick={() => setMode('confirm-delete')} />
    </div>
  )
}
