// A preset tile's picture: the menu drawn as a tiny panel of text bars, so each layout's grouping reads at a glance.
import { arrange, MENU_ITEMS } from '../../../menu'
import type { MenuEntry } from '../../../types'
import { css, useStyles } from '../../styles/sheet'

const styles = css`
  .b-minimenu {
    display: grid;
    align-content: start;
    gap: 3px;
    height: 100%;
    padding: 7px 8px;
    background: var(--b-elevated);
  }
  .b-minimenu__item {
    height: 3px;
    border-radius: 1px;
    background: color-mix(in oklch, var(--b-text) 55%, transparent);
  }
  .b-minimenu__rule {
    height: 1px;
    margin: 1px -3px;
    background: var(--b-line);
  }
  .b-minimenu__group {
    width: 30%;
    height: 2px;
    margin-top: 2px;
    border-radius: 1px;
    background: var(--b-accent);
  }
`

export function MiniMenu({ layout }: { layout: readonly MenuEntry[] }) {
  useStyles(styles)
  return (
    <span class="b-minimenu" aria-hidden="true">
      {arrange(layout, MENU_ITEMS).map((row, i) =>
        row.kind === 'item' ? (
          <span key={i} class="b-minimenu__item" style={{ width: `${Math.min(92, 24 + row.item.label.length * 2.4)}%` }} />
        ) : (
          <span key={i} class={row.kind === 'group' ? 'b-minimenu__group' : 'b-minimenu__rule'} />
        ),
      )}
    </span>
  )
}
