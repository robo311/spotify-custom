// Helper self-update notice: a slim row under the header, present only while an update is available, installing or
// failed. Plain text and one quiet button, in the same voice as the save indicator.
import { CircleAlert } from 'lucide-static'
import type { UpdateStatus } from '../../types'
import { useApp, useEnv } from '../context'
import { css, useStyles } from '../styles/sheet'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

const styles = css`
  .b-update {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 12px 7px 18px;
    box-shadow: inset 0 -1px 0 var(--b-line);
    font-size: 12px;
    color: var(--b-sub);
  }
  .b-update__text {
    display: flex;
    align-items: center;
    gap: 5px;
    flex: 1;
    min-width: 0;
  }
  .b-update__line {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .b-update__name {
    color: var(--b-text);
    font-weight: 600;
  }
  .b-update[data-state='failed'] .b-update__text .b-icon,
  .b-update[data-state='failed'] .b-update__name {
    color: #f08a8a;
  }
  .b-update .b-btn {
    flex: none;
    min-height: 26px;
    padding: 0 10px;
    font-size: 12px;
  }
`

function Message({ update }: { update: UpdateStatus }) {
  const name = update.latest ? `Spotify Custom ${update.latest}` : 'A Spotify Custom update'
  switch (update.state) {
    case 'available':
      return (
        <span class="b-update__line">
          <span class="b-update__name">{name}</span> is available
        </span>
      )
    case 'installing':
      return (
        <span class="b-update__line">
          <span class="b-update__name">Updating…</span> Spotify Custom restarts in a moment
        </span>
      )
    default:
      return (
        <>
          <Icon svg={CircleAlert} size={12} />
          <span class="b-update__line" title={update.message}>
            <span class="b-update__name">Couldn’t update</span>
            {update.message && ` · ${update.message}`}
          </span>
        </>
      )
  }
}

export function UpdateNotice() {
  useStyles(styles)
  const { store } = useEnv()
  const update = useApp(s => s.update)
  if (update.state === 'none') return null

  return (
    <div class="b-update" data-state={update.state} role={update.state === 'failed' ? 'alert' : 'status'}>
      <span class="b-update__text">
        <Message update={update} />
      </span>
      <Button disabled={update.state === 'installing'} onClick={() => store.installUpdate()}>
        {update.state === 'failed' ? 'Try again' : 'Update'}
      </Button>
    </div>
  )
}
