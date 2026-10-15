// A list whose rows carry their own controls (inline label, eye, pin, remove) and can be dragged into a new order by
// a grip, like ui/SortableList but with free row content. Keyboard: focus a grip, Alt+↑/↓ moves the row.
import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { GripVertical } from 'lucide-static'
import { css, useStyles } from '../../styles/sheet'
import { moveItem } from '../../lib/reorder'
import { startPointerDrag } from '../../lib/pointer-drag'
import { Icon } from '../../ui/Icon'

const styles = css`
  .b-dlist {
    display: grid;
    gap: 2px;
    margin: 0 -8px;
    padding: 0;
    list-style: none;
  }
  .b-dlist__row {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    padding: 2px 4px 2px 2px;
    border-radius: var(--b-r-md);
    transition: background var(--b-fast) var(--b-ease);
  }
  .b-dlist__row:hover {
    background: var(--b-hover);
  }
  .b-dlist__row[data-dragging='true'] {
    background: var(--b-elevated);
    box-shadow:
      inset 0 0 0 1px var(--b-line),
      0 8px 24px rgb(0 0 0 / 0.35);
  }
  .b-dlist__grip {
    display: grid;
    place-items: center;
    flex: none;
    width: 24px;
    height: 30px;
    border-radius: 4px;
    color: var(--b-sub);
    cursor: grab;
    touch-action: none;
  }
  .b-dlist__grip:active {
    cursor: grabbing;
  }
  /* Rows that can't move keep the grip's width so their text lines up with the movable ones. */
  .b-dlist__grip[data-off='true'] {
    visibility: hidden;
  }
`

interface DragListProps<T> {
  label: string // accessible name of the list
  items: readonly T[]
  keyOf: (item: T, index: number) => string
  nameOf: (item: T) => string // for the grip's label and move announcements
  onMove: (from: number, to: number) => void
  children: (item: T, index: number) => ComponentChildren
  /** False: rows keep their place (no grips). */
  movable?: boolean
}

function indexAtPointer(list: HTMLElement, y: number): number {
  const rows = [...list.children] as HTMLElement[]
  const i = rows.findIndex(row => {
    const r = row.getBoundingClientRect()
    return y < r.top + r.height / 2
  })
  return i === -1 ? rows.length - 1 : i
}

export function DragList<T>({ label, items, keyOf, nameOf, onMove, children, movable = true }: DragListProps<T>) {
  useStyles(styles)
  // While dragging, show the would-be order without touching saved settings.
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const order = items.map((_, i) => i)
  const view = drag ? moveItem(order, drag.from, drag.to) : order

  const moveBy = (index: number, delta: number) => {
    const to = Math.max(0, Math.min(items.length - 1, index + delta))
    if (to === index) return
    onMove(index, to)
    setAnnouncement(`${nameOf(items[index])} moved to position ${to + 1} of ${items.length}`)
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
        if (to !== from) onMove(from, to)
        setDrag(null)
      },
    })
  }

  return (
    <>
      <ul class="b-dlist" aria-label={label}>
        {view.map((original, i) => {
          const item = items[original]
          return (
            <li key={keyOf(item, original)} class="b-dlist__row" data-dragging={drag !== null && drag.to === i}>
              {movable ? (
                <span
                  class="b-dlist__grip"
                  role="button"
                  tabIndex={0}
                  aria-label={`Move ${nameOf(item)}. Alt plus arrow keys to move.`}
                  onPointerDown={e => startDrag(e, original)}
                  onKeyDown={e => {
                    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
                    e.preventDefault()
                    moveBy(original, e.key === 'ArrowUp' ? -1 : 1)
                  }}
                >
                  <Icon svg={GripVertical} size={14} />
                </span>
              ) : (
                <span class="b-dlist__grip" data-off="true" aria-hidden="true" />
              )}
              {children(item, original)}
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
