// Quiet persistence feedback in the header: "Saving…", then "Saved ✓" that settles into a small check;
// amber when changes only live until Spotify restarts; red with Retry when a save failed.
import { useEffect, useRef, useState } from 'preact/hooks'
import { Check, CircleAlert, CloudOff } from 'lucide-static'
import type { AppState } from '../../types'
import { useApp, useEnv } from '../context'
import { css, useStyles } from '../styles/sheet'
import { Icon } from '../ui/Icon'

const styles = css`
  .b-save {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 20px;
    font-size: 11.5px;
    color: var(--b-sub);
    white-space: nowrap;
  }
  .b-save__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--b-sub);
    animation: b-save-pulse 1s ease-in-out infinite;
  }
  @keyframes b-save-pulse {
    50% {
      opacity: 0.3;
    }
  }
  .b-save__text {
    transition: opacity 600ms var(--b-ease);
  }
  .b-save[data-settled='true'] .b-save__text {
    opacity: 0;
    width: 0;
    overflow: hidden;
  }
  .b-save[data-status='saved'] .b-icon {
    color: #4cc38a;
  }
  .b-save[data-status='local'] {
    padding: 0 8px;
    border-radius: 999px;
    background: color-mix(in oklch, var(--b-warn) 14%, transparent);
    color: var(--b-warn);
  }
  .b-save[data-status='error'] {
    color: #f08a8a;
  }
  .b-save__retry {
    color: inherit;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

const SETTLE_MS = 2000
const LOCAL_TIP = 'Not connected to Spotify Custom: changes last until Spotify restarts. Open the Spotify Custom app to keep them.'

/** "Saved" is only announced right after a save; on open, a calm check is enough. */
function useSettled(status: AppState['saveStatus']): boolean {
  const [settled, setSettled] = useState(true)
  const previousRef = useRef(status)
  useEffect(() => {
    const was = previousRef.current
    previousRef.current = status
    if (status !== 'saved' || was === 'saved') return
    setSettled(false)
    const t = setTimeout(() => setSettled(true), SETTLE_MS)
    return () => clearTimeout(t)
  }, [status])
  return settled
}

export function SaveIndicator() {
  useStyles(styles)
  const { store } = useEnv()
  const status = useApp(s => s.saveStatus)
  const settled = useSettled(status)

  switch (status) {
    case 'pending':
      return (
        <span class="b-save" data-status="pending" role="status">
          <span class="b-save__dot" aria-hidden="true" />
          Saving…
        </span>
      )
    case 'saved':
      return (
        <span class="b-save" data-status="saved" data-settled={settled} role="status" title="All changes saved">
          <Icon svg={Check} size={12} />
          <span class="b-save__text">Saved</span>
        </span>
      )
    case 'local':
      return (
        <span class="b-save" data-status="local" role="status" title={LOCAL_TIP} aria-label={LOCAL_TIP}>
          <Icon svg={CloudOff} size={12} />
          Not connected
        </span>
      )
    case 'error':
      return (
        <span class="b-save" data-status="error" role="alert">
          <Icon svg={CircleAlert} size={12} />
          Couldn’t save
          {' · '}
          <button type="button" class="b-save__retry" onClick={() => store.retrySave()}>
            Retry
          </button>
        </span>
      )
  }
}
