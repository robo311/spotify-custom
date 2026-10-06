// A list you can drag into a new order and hide items from (Home shelves, Now playing panel sections).
// Keyboard: focus a handle, Alt+↑/↓ moves the item; moves are announced to screen readers.
import { useState } from 'preact/hooks'
import { Eye, EyeOff, GripVertical } from 'lucide-static'
import { css, useStyles } from '../styles/sheet'
import { moveItem, type Keyed } from '../lib/reorder'
import { startPointerDrag } from '../lib/pointer-drag'
import { IconButton } from './Button'
import { Icon } from './Icon'

const styles = css`
  .b-sort {
    display: grid;
    gap: 2px;
    margin: 0 -8px;
    padding: 0;
    list-style: none;
  }
  .b-sort__item {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 42px;
    padding: 4px 4px 4px 2px;
    border-radius: var(--b-r-md);
    transition:
      background var(--b-fast) var(--b-ease),
      opacity var(--b-fast) var(--b-ease);
  }
  .b-sort__item:hover {
    background: var(--b-hover);
  }
  .b-sort__item[data-dragging='true'] {
    background: var(--b-elevated);
    box-shadow:
      inset 0 0 0 1px var(--b-line),
      0 8px 24px rgb(0 0 0 / 0.35);
  }
  .b-sort__item[data-hidden='true'] .b-sort__text {
    opacity: 0.45;
    text-decoration: line-through;
    text-decoration-color: var(--b-line);
  }
  .b-sort__handle {
    display: grid;
    place-items: center;
    width: 24px;
    height: 32px;
    border-radius: 4px;
    color: var(--b-sub);
    cursor: grab;
    touch-action: none;
  }
  .b-sort__handle:active {
    cursor: grabbing;
  }
  .b-sort__text {
    flex: 1;
    min-width: 0;
    display: grid;
  }
  .b-sort__title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
  }
`

export interface SortableItem extends Keyed {
  title: string
  /** One-line caveat under the title, e.g. "Changes daily". */
  note?: string
}

interface SortableListProps<T extends SortableItem> {
  label: string // accessible name of the list
  items: readonly T[]
  hidden: readonly string[]
  onReorder: (next: T[]) => void
  onToggleHidden: (key: string, hidden: boolean) => void
}

function indexAtPointer(list: HTMLElement, y: number): number {
  const rows = [...list.children] as HTMLElement[]
  const i = rows.findIndex(row => {
    const r = row.getBoundingClientRect()
    return y < r.top + r.height / 2
  })
  return i === -1 ? rows.length - 1 : i
}

export function SortableList<T extends SortableItem>({ label, items, hidden, onReorder, onToggleHidden }: SortableListProps<T>) {
  useStyles(styles)
  // While dragging, show the would-be order without touching saved settings.
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const view = drag ? moveItem(items, drag.from, drag.to) : items

  const moveBy = (index: number, delta: number) => {
    const to = Math.max(0, Math.min(items.length - 1, index + delta))
    if (to === index) return
    onReorder(moveItem(items, index, to))
    setAnnouncement(`${items[index].title} moved to position ${to + 1} of ${items.length}`)
  }

  const startDrag = (e: PointerEvent, from: number) => {
    const list = (e.currentTarget as HTMLElement).closest('ul')
    if (e.button !== 0 || !list) return
    e.preventDefault()
    let to = from
    setDrag({ from, to })
    startPointerDrag(e, {
      onMove: ev => {
        to = indexAtPointer(list, ev.clientY)
        setDrag({ from, to })
      },
      onEnd: () => {
        if (to !== from) onReorder(moveItem(items, from, to))
        setDrag(null)
      },
    })
  }

  return (
    <>
      <ul class="b-sort" aria-label={label}>
        {view.map((item, i) => {
          const isHidden = hidden.includes(item.key)
          const original = items.indexOf(item)
          return (
            <li key={item.key} class="b-sort__item" data-hidden={isHidden} data-dragging={drag !== null && drag.to === i}>
              <span
                class="b-sort__handle"
                role="button"
                tabIndex={0}
                aria-label={`Move ${item.title}. Alt plus arrow keys to move.`}
                onPointerDown={e => startDrag(e, original)}
                onKeyDown={e => {
                  if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
                  e.preventDefault()
                  moveBy(original, e.key === 'ArrowUp' ? -1 : 1)
                }}
              >
                <Icon svg={GripVertical} size={14} />
              </span>
              <span class="b-sort__text">
                <span class="b-sort__title">{item.title}</span>
                {item.note && <span class="b-hint">{item.note}</span>}
              </span>
              <IconButton
                icon={isHidden ? EyeOff : Eye}
                label={isHidden ? `Show ${item.title}` : `Hide ${item.title}`}
                aria-pressed={isHidden}
                onClick={() => onToggleHidden(item.key, !isHidden)}
              />
            </li>
          )
        })}
      </ul>
      <span class="b-visually-hidden" aria-live="polite">
        {announcement}
      </span>
    </>
  )
}
