// A labelled colour row that expands into the full picker. "Auto" (undefined) means "use the theme's colour".
import type { ComponentChildren } from 'preact'
import { ChevronDown, RotateCcw } from 'lucide-static'
import { css, useStyles } from '../styles/sheet'
import { ColorPicker } from './color-picker/ColorPicker'
import { IconButton } from './Button'
import { Icon } from './Icon'
import { Swatch } from './Swatch'

const styles = css`
  .b-cfield {
    border-radius: var(--b-r-md);
    transition: background var(--b-fast) var(--b-ease);
  }
  .b-cfield[data-open='true'] {
    background: var(--b-hover);
    box-shadow: inset 0 0 0 1px var(--b-line);
  }
  .b-cfield__row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 44px;
    padding: 6px 8px;
    border-radius: var(--b-r-md);
    text-align: left;
  }
  .b-cfield__row:hover {
    background: var(--b-hover);
  }
  .b-cfield__text {
    flex: 1;
    min-width: 0;
    display: grid;
  }
  .b-cfield__label {
    font-weight: 500;
  }
  .b-cfield__value {
    color: var(--b-sub);
  }
  .b-cfield__chev {
    color: var(--b-sub);
    transition: transform var(--b-med) var(--b-ease);
  }
  .b-cfield[data-open='true'] .b-cfield__chev {
    transform: rotate(180deg);
  }
  .b-cfield__body {
    display: grid;
    gap: 8px;
    padding: 4px 10px 12px;
  }
  .b-cfield__reset {
    display: flex;
    justify-content: flex-end;
  }
`

interface ColorFieldProps {
  label: string
  hint?: string
  /** undefined = automatic (follows the theme); shown with autoValue. */
  value: string | undefined
  autoValue?: string
  onChange: (hex: string | undefined) => void
  open: boolean
  onToggle: () => void
  /** Badge next to the value (e.g. a contrast warning). */
  badge?: ComponentChildren
  /** Inside the expanded picker, under the hex row. */
  footer?: ComponentChildren
}

export function ColorField({ label, hint, value, autoValue, onChange, open, onToggle, badge, footer }: ColorFieldProps) {
  useStyles(styles)
  const shown = value ?? autoValue ?? '#000000'
  const clearable = autoValue !== undefined && value !== undefined

  return (
    <div class="b-cfield" data-open={open}>
      <button type="button" class="b-cfield__row" aria-expanded={open} onClick={onToggle}>
        <Swatch color={shown} size={22} />
        <span class="b-cfield__text">
          <span class="b-cfield__label">{label}</span>
          {hint && <span class="b-hint">{hint}</span>}
        </span>
        {badge}
        <span class="b-cfield__value b-mono">{value === undefined && autoValue !== undefined ? 'Auto' : shown}</span>
        <span class="b-cfield__chev">
          <Icon svg={ChevronDown} size={14} />
        </span>
      </button>
      {open && (
        <div class="b-cfield__body">
          <ColorPicker value={shown} onChange={onChange} footer={footer} />
          {clearable && (
            <div class="b-cfield__reset">
              <IconButton icon={RotateCcw} label={`Use the theme's colour for ${label.toLowerCase()}`} onClick={() => onChange(undefined)} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
