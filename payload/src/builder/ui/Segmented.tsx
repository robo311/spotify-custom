// Segmented control (single choice among 2–5 options) with a sliding indicator. Arrow keys move the choice.
import type { ComponentChildren } from 'preact'
import { css, useStyles } from '../styles/sheet'

const styles = css`
  .b-seg {
    position: relative;
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    padding: 3px;
    border-radius: var(--b-r-sm);
    background: var(--b-well);
    box-shadow: var(--b-well-edge);
  }
  .b-seg__thumb {
    position: absolute;
    top: 3px;
    bottom: 3px;
    left: 3px;
    width: calc((100% - 6px) / var(--n));
    border-radius: 4px;
    background: var(--b-key);
    box-shadow: var(--b-key-edge);
    transform: translateX(calc(100% * var(--i)));
    transition: transform var(--b-med) var(--b-ease);
  }
  .b-seg__opt {
    position: relative;
    min-height: 28px;
    padding: 0 8px;
    border-radius: 4px;
    color: var(--b-sub);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color var(--b-fast) var(--b-ease);
  }
  .b-seg__opt[aria-checked='true'] {
    color: var(--b-text);
  }
  .b-seg__opt:hover {
    color: var(--b-text);
  }
`

export interface SegmentOption<T extends string> {
  value: T
  label: ComponentChildren
  title?: string
}

interface SegmentedProps<T extends string> {
  label: string // accessible group name
  value: T
  options: readonly SegmentOption<T>[]
  onChange: (value: T) => void
}

export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  useStyles(styles)
  const index = Math.max(0, options.findIndex(o => o.value === value))

  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    onChange(options[(index + step + options.length) % options.length].value)
    const group = e.currentTarget as HTMLElement
    requestAnimationFrame(() => group.querySelector<HTMLElement>('[aria-checked="true"]')?.focus())
  }

  return (
    <div class="b-seg" role="radiogroup" aria-label={label} style={{ '--n': options.length, '--i': index }} onKeyDown={onKeyDown}>
      <span class="b-seg__thumb" aria-hidden="true" />
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          role="radio"
          class="b-seg__opt"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          title={o.title}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
