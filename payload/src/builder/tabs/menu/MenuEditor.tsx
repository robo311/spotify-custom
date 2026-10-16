// The menu layout edited where it's seen: the panel drawn with the live menu's own styles, every row draggable into a
// new order, items hidden or shown with their eye, separators and groups removed, group names typed in place. Hidden
// items stay in the picture, faded, so they can come back. Keyboard: focus a row's grip, Alt+↑/↓ moves it.
import { useEffect, useRef, useState } from 'preact/hooks'
import { ChevronRight, Eye, EyeOff, GripVertical, X } from 'lucide-static'
import { MENU_ITEMS, PanelFrame } from '../../../menu'
import { MENU_GROUP_LABEL_MAX } from '../../../theme/model'
import type { MenuEntry } from '../../../types'
import { startPointerDrag } from '../../lib/pointer-drag'
import { moveItem } from '../../lib/reorder'

// Inside the panel's shadow root: only the theme's --sc-* palette and the panel's own variables.
const EDITOR_CSS = /* css */ `
.panel.static { width: 100%; max-width: 340px; }
.rows > li { touch-action: none; }
.row, .line { position: relative; }
.rows > li:hover > :is(.row, .line) { background: var(--hover); }
.rows > li[data-dragging] > :is(.row, .line) {
  background: var(--hover);
  box-shadow: inset 0 0 0 1px var(--sc-border, rgb(255 255 255 / .1)), 0 6px 18px rgb(0 0 0 / .3);
}
.panel[data-dragging] { cursor: grabbing; }
.row[data-hidden] .label { opacity: .45; text-decoration: line-through; }
.line { display: flex; align-items: center; gap: 10px; min-height: 24px; padding: 0 10px; border-radius: var(--row-radius); }
.line .sep { flex: 1; margin: 0; }
.line.group-line { min-height: 30px; margin-top: 4px; }
.grip, .tool {
  all: unset; box-sizing: border-box; flex: none; display: grid; place-items: center; border-radius: 4px;
  color: var(--sc-text-subdued, #b3b3b3); opacity: 0; transition: opacity 120ms var(--ease);
}
.grip { width: 16px; height: 16px; cursor: grab; }
.tool { width: 24px; height: 24px; margin-right: -6px; cursor: pointer; }
.grip svg, .tool svg { width: 14px; height: 14px; }
.rows > li:hover :is(.grip, .tool), .grip:focus-visible, .tool:focus-visible, .tool[aria-pressed="true"] { opacity: 1; }
.tool:hover { color: var(--sc-text, #fff); background: var(--hover); }
.grip:focus-visible, .tool:focus-visible { outline: 2px solid var(--sc-accent, #1ed760); outline-offset: -2px; }
.tag { flex: none; color: var(--sc-text-subdued, #b3b3b3); font-size: 11px; }
.name {
  all: unset; flex: 1; min-width: 0; margin-left: -4px; padding: 2px 4px; border-radius: 4px;
  color: var(--sc-text-subdued, #b3b3b3); font-size: 12px; font-weight: 600;
}
.name::placeholder { color: var(--sc-text-subdued, #b3b3b3); opacity: .6; }
.name:focus-visible { color: var(--sc-text, #fff); box-shadow: inset 0 0 0 2px var(--sc-accent, #1ed760); }
@media (prefers-reduced-motion: reduce) { .grip, .tool { transition: none; } }
`

const ITEMS = new Map(MENU_ITEMS.map(i => [i.key, i]))

export const entryName = (e: MenuEntry): string =>
  e.kind === 'item' ? (ITEMS.get(e.key)?.label ?? e.key) : e.kind === 'group' ? `group ${e.label}` : 'separator'

/** Stable row keys: items by their key, separators and groups by how many of their kind came before. */
function rowKeys(layout: readonly MenuEntry[]): string[] {
  const seen = { separator: 0, group: 0 }
  return layout.map(e => (e.kind === 'item' ? `item:${e.key}` : `${e.kind}:${seen[e.kind]++}`))
}

const Svg = ({ svg }: { svg: string }) => <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: svg }} />

function Tool({ icon, label, pressed, onClick }: { icon: string; label: string; pressed?: boolean; onClick: () => void }) {
  return (
    <button type="button" class="tool" aria-label={label} title={label} aria-pressed={pressed} onClick={onClick}>
      <Svg svg={icon} />
    </button>
  )
}

function GroupName({ label, focus, onFocused, onInput }: { label: string; focus: boolean; onFocused: () => void; onInput: (label: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!focus) return
    ref.current?.focus()
    ref.current?.select()
    onFocused()
  }, [focus, onFocused])
  return (
    <input
      ref={ref}
      class="name"
      value={label}
      maxLength={MENU_GROUP_LABEL_MAX}
      placeholder="Group name"
      aria-label="Group name"
      spellcheck={false}
      onInput={e => onInput(e.currentTarget.value)}
    />
  )
}

export interface MenuEditorProps {
  layout: readonly MenuEntry[]
  onMove: (from: number, to: number) => void
  onHidden: (index: number, hidden: boolean) => void
  /** Removes a separator or group. */
  onRemove: (index: number) => void
  onRename: (index: number, label: string) => void
  /** A group just added: its name field takes focus. */
  focusAt: number
  onFocused: () => void
}

function indexAtPointer(list: Element, y: number): number {
  const rows = [...list.children]
  const i = rows.findIndex(row => {
    const r = row.getBoundingClientRect()
    return y < r.top + r.height / 2
  })
  return i === -1 ? rows.length - 1 : i
}

export function MenuEditor(props: MenuEditorProps) {
  const { layout } = props
  const keys = rowKeys(layout)
  // While dragging, show the would-be order without touching saved settings.
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const order = layout.map((_, i) => i)
  const view = drag ? moveItem(order, drag.from, drag.to) : order

  const moveBy = (index: number, delta: number) => {
    const to = Math.max(0, Math.min(layout.length - 1, index + delta))
    if (to === index) return
    props.onMove(index, to)
    setAnnouncement(`${entryName(layout[index])} moved to position ${to + 1} of ${layout.length}`)
  }

  const startDrag = (e: PointerEvent, from: number) => {
    const target = e.target as Element
    const list = target.closest('ul')
    if (e.button !== 0 || !list || target.closest('.tool, .name')) return
    e.preventDefault()
    let to = from
    setDrag({ from, to })
    startPointerDrag(e, {
      onMove: ev => {
        to = indexAtPointer(list, ev.clientY)
        setDrag({ from, to })
      },
      onEnd: () => {
        if (to !== from) props.onMove(from, to)
        setDrag(null)
      },
    })
  }

  const grip = (index: number) => (
    <span
      class="grip"
      role="button"
      tabIndex={0}
      aria-label={`Move ${entryName(layout[index])}. Alt plus arrow keys to move.`}
      onKeyDown={e => {
        if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
        e.preventDefault()
        moveBy(index, e.key === 'ArrowUp' ? -1 : 1)
      }}
    >
      <Svg svg={GripVertical} />
    </span>
  )

  const row = (entry: MenuEntry, i: number) => {
    if (entry.kind === 'separator') {
      return (
        <div class="line">
          {grip(i)}
          <div class="sep" role="separator" />
          <Tool icon={X} label="Remove separator" onClick={() => props.onRemove(i)} />
        </div>
      )
    }
    if (entry.kind === 'group') {
      return (
        <div class="line group-line">
          {grip(i)}
          <GroupName label={entry.label} focus={props.focusAt === i} onFocused={props.onFocused} onInput={v => props.onRename(i, v)} />
          <Tool icon={X} label={`Remove group ${entry.label}`} onClick={() => props.onRemove(i)} />
        </div>
      )
    }
    const def = ITEMS.get(entry.key)
    const name = def?.label ?? entry.key
    const hidden = entry.hidden === true
    return (
      <div class="row" data-hidden={hidden ? '' : undefined}>
        {grip(i)}
        <span class="label">{name}</span>
        {def?.contextual && <span class="tag">Some menus</span>}
        {def?.submenu && (
          <span class="end" title="Opens a submenu">
            <Svg svg={ChevronRight} />
          </span>
        )}
        <Tool icon={hidden ? EyeOff : Eye} label={hidden ? `Show ${name}` : `Hide ${name}`} pressed={hidden} onClick={() => props.onHidden(i, !hidden)} />
      </div>
    )
  }

  return (
    <>
      <PanelFrame css={EDITOR_CSS}>
        <div class="panel static" role="group" aria-label="Menu rows" data-dragging={drag ? '' : undefined}>
          <ul class="rows" role="list">
            {view.map((original, i) => (
              <li key={keys[original]} data-dragging={drag !== null && drag.to === i ? '' : undefined} onPointerDown={e => startDrag(e, original)}>
                {row(layout[original], original)}
              </li>
            ))}
          </ul>
        </div>
      </PanelFrame>
      <span class="b-visually-hidden" aria-live="polite">
        {announcement}
      </span>
    </>
  )
}
