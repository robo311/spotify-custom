// Helper self-update, announced in Spotify's top bar next to the studio button: a pill in the theme's accent, shaped
// like Spotify's own top-bar buttons, present only while an update is available, installing or failed. One click
// installs (same as the studio's update row).
import { ArrowDownToLine, RotateCw } from 'lucide-static'
import { useApp, useEnv } from '../context'
import { css, useStyles } from '../styles/sheet'
import { Icon } from '../ui/Icon'

const styles = css`
  .b-topupdate {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    margin-right: 8px;
    padding: 0 14px 0 12px;
    border: 0;
    border-radius: 9999px;
    background: var(--sc-accent, #1ed760);
    color: var(--sc-on-accent, #000);
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
    transition: transform 160ms var(--b-spring);
  }
  .b-topupdate:hover:not(:disabled) {
    transform: scale(1.04);
  }
  .b-topupdate:active:not(:disabled) {
    transform: scale(0.96);
    transition-duration: 60ms;
  }
  .b-topupdate:disabled {
    cursor: default;
    opacity: 0.7;
  }
  .b-topupdate:focus-visible {
    outline: 2px solid var(--sc-text, #fff);
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    .b-topupdate {
      transition: none;
    }
  }
`

export function UpdateButton() {
  useStyles(styles)
  const { store } = useEnv()
  const update = useApp(s => s.update)
  if (update.state === 'none') return null

  const version = update.latest ? `Spotify Custom ${update.latest}` : 'A Spotify Custom update'
  const { label, title, icon } =
    update.state === 'available'
      ? { label: update.latest ? `Update ${update.latest}` : 'Update', title: `${version} is available. Click to install.`, icon: ArrowDownToLine }
      : update.state === 'installing'
        ? { label: 'Updating…', title: 'Spotify Custom restarts in a moment', icon: ArrowDownToLine }
        : { label: 'Update failed · retry', title: `Couldn’t update${update.message ? `: ${update.message}` : ''}`, icon: RotateCw }

  return (
    <button type="button" class="b-topupdate" title={title} disabled={update.state === 'installing'} onClick={() => store.installUpdate()}>
      <Icon svg={icon} size={14} />
      {label}
    </button>
  )
}
