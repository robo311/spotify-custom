// What a section shows when there's nothing to list yet: an icon, one line on how to get something here,
// and optionally the action that does it.
import type { ComponentChildren } from 'preact'
import { css, useStyles } from '../styles/sheet'
import { Icon } from './Icon'

const styles = css`
  .b-empty {
    display: flex;
    gap: 10px;
    padding: 12px 14px;
    border-radius: var(--b-r-md);
    box-shadow: inset 0 0 0 1px var(--b-line);
    color: var(--b-sub);
    font-size: 12.5px;
  }
  .b-empty > .b-icon {
    margin-top: 1px;
  }
  .b-empty__body {
    display: grid;
    justify-items: start;
    gap: 10px;
  }
`

export function EmptyState({ icon, children, action }: { icon: string; children: ComponentChildren; action?: ComponentChildren }) {
  useStyles(styles)
  return (
    <div class="b-empty">
      <Icon svg={icon} size={16} />
      <div class="b-empty__body">
        <span>{children}</span>
        {action}
      </div>
    </div>
  )
}
