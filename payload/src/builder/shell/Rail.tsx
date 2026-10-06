// Vertical tab rail. Roving focus: arrow keys move between tabs, Home/End jump to the ends.
import { useEnv, useUi, type TabId } from '../context'
import { css, useStyles } from '../styles/sheet'
import { savePrefs } from '../lib/prefs'
import { Icon } from '../ui/Icon'
import { TABS } from './tabs'

// One lit key slides to the active tab: the rail's only motion, and it answers the click.
const TAB_H = 52
const TAB_GAP = 2
const RAIL_PAD = 6

const styles = css`
  .b-rail {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: ${TAB_GAP}px;
    width: 68px;
    margin: 10px 0 10px 10px;
    padding: ${RAIL_PAD}px;
    border-radius: var(--b-r-lg);
    background: var(--b-well);
    box-shadow: var(--b-well-edge);
    overflow-y: auto;
    scrollbar-width: none;
  }
  .b-rail__key {
    position: absolute;
    top: ${RAIL_PAD}px;
    left: ${RAIL_PAD}px;
    right: ${RAIL_PAD}px;
    height: ${TAB_H}px;
    border-radius: var(--b-r-md);
    background: var(--b-key);
    box-shadow: var(--b-key-edge);
    transform: translateY(calc(var(--i) * ${TAB_H + TAB_GAP}px));
    transition: transform 280ms var(--b-ease);
    pointer-events: none;
  }
  .b-rail__tab {
    position: relative;
    display: grid;
    flex: none;
    align-content: center;
    justify-items: center;
    gap: 3px;
    height: ${TAB_H}px;
    padding: 0 2px;
    border-radius: var(--b-r-md);
    color: var(--b-sub);
    font-size: 10.5px;
    font-weight: 500;
    transition: color var(--b-fast) var(--b-ease), background var(--b-fast) var(--b-ease);
  }
  .b-rail__tab:hover {
    color: var(--b-text);
  }
  .b-rail__tab:hover:not([aria-selected='true']) {
    background: var(--b-hover);
  }
  .b-rail__tab[aria-selected='true'] {
    color: var(--b-text);
  }
  .b-rail__tab[aria-selected='true'] .b-icon {
    color: var(--b-accent);
  }
  .b-rail__tab:focus-visible {
    outline-offset: -2px;
  }
`

export function Rail() {
  useStyles(styles)
  const { ui } = useEnv()
  const tab = useUi(s => s.tab)

  const select = (id: TabId) => {
    ui.set(s => ({ ...s, tab: id }))
    savePrefs({ tab: id })
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const i = TABS.findIndex(t => t.id === tab)
    const target = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: TABS.length - 1 }[e.key]
    if (target === undefined) return
    e.preventDefault()
    const next = TABS[(target + TABS.length) % TABS.length]
    select(next.id)
    const rail = e.currentTarget as HTMLElement
    requestAnimationFrame(() => rail.querySelector<HTMLElement>(`#b-tab-${next.id}`)?.focus())
  }

  return (
    <nav class="b-rail" role="tablist" aria-orientation="vertical" aria-label="Theme studio sections" onKeyDown={onKeyDown}>
      <span class="b-rail__key" aria-hidden="true" style={{ '--i': Math.max(0, TABS.findIndex(t => t.id === tab)) }} />
      {TABS.map(t => (
        <button
          key={t.id}
          id={`b-tab-${t.id}`}
          type="button"
          role="tab"
          class="b-rail__tab"
          aria-selected={t.id === tab}
          aria-controls="b-panel"
          tabIndex={t.id === tab ? 0 : -1}
          onClick={() => select(t.id)}
        >
          <Icon svg={t.icon} size={18} />
          {t.label}
        </button>
      ))}
    </nav>
  )
}
