// One menu panel: rows, separators, group labels, an optional search field. Presentational only: the menu stack
// (stack.ts) owns the state and passes callbacks; the studio preview renders it static.
import { useLayoutEffect, useRef } from 'preact/hooks'
import type { Entry, Icon, PanelRow } from './model'
import { place, type Anchor } from './position'

export interface PanelProps {
  rows: PanelRow[]
  label: string
  /** Where to open; none = drawn in place (the studio preview). */
  anchor?: Anchor
  /** 0 = the menu, 1+ = submenus (enter from the side). */
  depth?: number
  active?: number
  /** The row whose submenu is open. */
  open?: number
  /** The last input was the keyboard: the active row gets a focus ring. */
  keyboard?: boolean
  /** The search field's text; undefined = no field. */
  search?: string
  status?: string | null
  onHover?: (index: number) => void
  onPick?: (index: number) => void
  onQuery?: (text: string) => void
}

const CHEVRON = 'M6 3.5 10.5 8 6 12.5'
const CHECK = 'M3.5 8.5 6.5 11.5 12.5 4.5'

const Line = ({ d }: { d: string }) => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path class="line" d={d} />
  </svg>
)

/** Spotify's icon, cloned again per mount (a node can live in one place only). */
function SvgClone({ node }: { node: SVGElement }) {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    ref.current?.replaceChildren(node.cloneNode(true))
  }, [node])
  return <span class="icon" ref={ref} aria-hidden="true" />
}

const FOLDER = 'M2 4.5h4l1.5 1.5H14v6.5H2z'
const NOTE = 'M6 12V3.5l6.5-1.5V10.5M6 12a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0zm6.5-1.5a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0z'

function IconView({ icon }: { icon: Icon }) {
  if (icon.kind === 'svg') return <SvgClone node={icon.node} />
  if (icon.kind === 'folder')
    return (
      <span class="cover empty icon" aria-hidden="true">
        <Line d={FOLDER} />
      </span>
    )
  return icon.src ? (
    <img class="cover" src={icon.src} alt="" loading="lazy" draggable={false} />
  ) : (
    <span class="cover empty icon" aria-hidden="true">
      <Line d={NOTE} />
    </span>
  )
}

function Item({ entry, index, active, open, iconSlot, onHover, onPick }: {
  entry: Entry
  index: number
  /** Other rows have icons: keep this row's label in line with theirs. */
  iconSlot: boolean
  active: boolean
  open: boolean
  onHover?: (index: number) => void
  onPick?: (index: number) => void
}) {
  return (
    <div
      class="row"
      role="menuitem"
      aria-disabled={entry.disabled ? 'true' : undefined}
      aria-haspopup={entry.submenu ? 'menu' : undefined}
      aria-expanded={entry.submenu ? open : undefined}
      data-active={active ? '' : undefined}
      data-open={open ? '' : undefined}
      data-i={index}
      onPointerMove={() => onHover?.(index)}
      onClick={() => onPick?.(index)}
    >
      {entry.icon ? <IconView icon={entry.icon} /> : iconSlot && <span class="icon" aria-hidden="true" />}
      <span class="label">{entry.label}</span>
      {entry.checked && (
        <span class="end check" aria-hidden="true">
          <Line d={CHECK} />
        </span>
      )}
      {entry.submenu && (
        <span class="end" aria-hidden="true">
          <Line d={CHEVRON} />
        </span>
      )}
    </div>
  )
}

const SEARCH = 'M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zm7 2-3.5-3.5'

export function Panel(props: PanelProps) {
  const { rows, anchor, active = -1, open = -1 } = props
  const ref = useRef<HTMLDivElement>(null)
  const iconSlot = rows.some(r => r.kind === 'item' && r.entry.icon)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !anchor) return
    const at = place({ width: el.offsetWidth, height: el.offsetHeight }, anchor, { width: innerWidth, height: innerHeight })
    el.style.left = `${at.x}px`
    el.style.top = `${at.y}px`
    el.toggleAttribute('data-up', at.flippedUp)
  })

  useLayoutEffect(() => {
    if (props.keyboard) ref.current?.querySelector('[data-active]')?.scrollIntoView({ block: 'nearest' })
  }, [active, props.keyboard])

  return (
    <div
      ref={ref}
      class={anchor ? 'panel' : 'panel static'}
      role="menu"
      aria-label={props.label}
      data-depth={props.depth ?? 0}
      data-sub={props.depth ? '' : undefined}
      data-kbd={props.keyboard ? '' : undefined}
    >
      {props.search !== undefined && (
        <div class="search">
          <Line d={SEARCH} />
          <input
            type="text"
            value={props.search}
            placeholder="Find a playlist"
            aria-label="Find a playlist"
            spellcheck={false}
            onInput={e => props.onQuery?.(e.currentTarget.value)}
          />
        </div>
      )}
      {props.status ? (
        <div class="status">{props.status}</div>
      ) : (
        <ul class="rows" role="none">
          {rows.map((row, i) => (
            <li key={row.kind === 'item' ? row.entry.id : `${row.kind}${i}`} role="none">
              {row.kind === 'item' ? (
                <Item entry={row.entry} index={i} active={i === active} open={i === open} iconSlot={iconSlot} onHover={props.onHover} onPick={props.onPick} />
              ) : row.kind === 'separator' ? (
                <div class="sep" role="separator" />
              ) : (
                <div class="group" role="presentation">{row.label}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
