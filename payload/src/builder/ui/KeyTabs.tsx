// Horizontal tabs drawn like the studio's rail: a recessed channel with one lit key that slides to the chosen tab.
// Arrow keys move between tabs (roving focus).
import { css, useStyles } from '../styles/sheet'

const styles = css`
  .b-ktabs {
    position: relative;
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    padding: 3px;
    border-radius: var(--b-r-md);
    background: var(--b-well);
    box-shadow: var(--b-well-edge);
  }
  .b-ktabs__key {
    position: absolute;
    top: 3px;
    bottom: 3px;
    left: 3px;
    width: calc((100% - 6px) / var(--n));
    border-radius: 5px;
    background: var(--b-key);
    box-shadow: var(--b-key-edge);
    transform: translateX(calc(100% * var(--i)));
    transition: transform 260ms var(--b-ease);
  }
  .b-ktabs__tab {
    position: relative;
    min-height: 30px;
    padding: 0 10px;
    border-radius: 5px;
    color: var(--b-sub);
    font-weight: 600;
    font-size: 12.5px;
    /* The lit key slides by equal steps, so tabs share the width equally; a label never wraps the strip taller. */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color var(--b-fast) var(--b-ease);
  }
  .b-ktabs__tab:hover,
  .b-ktabs__tab[aria-selected='true'] {
    color: var(--b-text);
  }
  .b-ktabs__tab:focus-visible {
    outline-offset: -2px;
  }
`

export interface KeyTab<T extends string> {
  id: T
  label: string
}

interface KeyTabsProps<T extends string> {
  label: string // accessible name of the tab list
  tabs: readonly KeyTab<T>[]
  value: T
  onChange: (id: T) => void
}

export function KeyTabs<T extends string>({ label, tabs, value, onChange }: KeyTabsProps<T>) {
  useStyles(styles)
  const index = Math.max(0, tabs.findIndex(t => t.id === value))

  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = tabs[(index + step + tabs.length) % tabs.length]
    onChange(next.id)
    const list = e.currentTarget as HTMLElement
    requestAnimationFrame(() => list.querySelector<HTMLElement>('[aria-selected="true"]')?.focus())
  }

  return (
    <div class="b-ktabs" role="tablist" aria-label={label} style={{ '--n': tabs.length, '--i': index }} onKeyDown={onKeyDown}>
      <span class="b-ktabs__key" aria-hidden="true" />
      {tabs.map(t => (
        <button
          key={t.id}
          type="button"
          role="tab"
          class="b-ktabs__tab"
          aria-selected={t.id === value}
          tabIndex={t.id === value ? 0 : -1}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
