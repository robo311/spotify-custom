// Pick one of a few looks, each shown as a small live preview tile with a name under it.
import type { ComponentChildren } from 'preact'
import { css, useStyles } from '../styles/sheet'

const styles = css`
  .b-tiles {
    display: grid;
    grid-template-columns: repeat(var(--cols), 1fr);
    gap: 8px;
  }
  .b-tile {
    display: grid;
    gap: 6px;
    min-width: 0;
    padding: 4px 4px 6px;
    border-radius: var(--b-r-md);
    text-align: left;
    font-size: 12px;
    font-weight: 500;
    transition: background var(--b-fast) var(--b-ease);
  }
  .b-tile:hover {
    background: var(--b-hover);
  }
  .b-tile__preview {
    position: relative;
    display: grid;
    min-width: 0;
    border-radius: 5px;
    overflow: hidden;
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.06);
    transition: box-shadow var(--b-fast) var(--b-ease);
  }
  .b-tile[aria-checked='true'] .b-tile__preview {
    box-shadow: 0 0 0 2px var(--b-accent);
  }
  .b-tile__label {
    padding: 0 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export interface TileOption<T extends string> {
  value: T
  label: string
  title?: string
  preview: ComponentChildren
}

interface OptionTilesProps<T extends string> {
  label: string // accessible group name
  value: T
  options: readonly TileOption<T>[]
  onChange: (value: T) => void
  columns?: number
}

export function OptionTiles<T extends string>({ label, value, options, onChange, columns = 2 }: OptionTilesProps<T>) {
  useStyles(styles)
  return (
    <div class="b-tiles" role="radiogroup" aria-label={label} style={{ '--cols': columns }}>
      {options.map(o => (
        <button key={o.value} type="button" role="radio" class="b-tile" title={o.title} aria-checked={o.value === value} onClick={() => onChange(o.value)}>
          <span class="b-tile__preview">{o.preview}</span>
          <span class="b-tile__label">{o.label}</span>
        </button>
      ))}
    </div>
  )
}
