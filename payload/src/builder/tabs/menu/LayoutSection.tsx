// The right-click menu: on/off, the preset (Stock, Spotify Custom, Custom) and the layout editor. Editing a built-in
// preset makes it yours as Custom (menu-edits editLayout). A live preview of the panel sits under the list.
import { useEffect, useRef, useState } from 'preact/hooks'
import { ChevronRight, Eye, EyeOff, Heading, Plus, SeparatorHorizontal, SquareMenu, X } from 'lucide-static'
import { arrange, MENU_ITEMS, MenuPreview, OURS, STOCK } from '../../../menu'
import { MENU_GROUP_LABEL_MAX } from '../../../theme/model'
import type { MenuEntry, MenuPreset } from '../../../types'
import { useApp, useEnv } from '../../context'
import { css, useStyles } from '../../styles/sheet'
import { Button, IconButton } from '../../ui/Button'
import { Field } from '../../ui/Field'
import { Icon } from '../../ui/Icon'
import { OptionTiles } from '../../ui/OptionTiles'
import { ResetButton } from '../../ui/ResetButton'
import { Section } from '../../ui/Section'
import { Toggle } from '../../ui/Toggle'
import { DragList } from './DragList'
import { addGroup, addItem, addSeparator, editLayout, missingItems, moveEntry, removeEntry, resetLayout, setGroupLabel, setHidden, shownLayout } from './menu-edits'
import { MiniMenu } from './MiniMenu'

const styles = css`
  .b-mrow__text {
    flex: 1;
    min-width: 0;
    display: grid;
  }
  .b-mrow__title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
  }
  .b-mrow__text[data-hidden='true'] {
    opacity: 0.45;
  }
  .b-mrow__text[data-hidden='true'] .b-mrow__title {
    text-decoration: line-through;
    text-decoration-color: var(--b-line);
  }
  .b-mrow__sub {
    color: var(--b-sub);
  }
  /* A separator reads as what it draws: a hairline across the row. */
  .b-mrow__rule {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--b-sub);
    font-size: 12px;
  }
  .b-mrow__rule::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--b-line);
  }
  .b-mrow__group {
    flex: 1;
    min-width: 0;
    height: 28px;
    padding: 0 8px;
    border: 0;
    border-radius: var(--b-r-sm);
    background: var(--b-slot);
    box-shadow: var(--b-well-edge);
    font-size: 12px;
    font-weight: 600;
    outline: none;
  }
  .b-mrow__group:focus-visible {
    box-shadow: inset 0 0 0 2px var(--b-accent);
  }
  .b-mrow__group::placeholder {
    color: var(--b-sub);
    font-weight: 500;
  }
  .b-menu-adds {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .b-menu-preview {
    display: grid;
    justify-items: start;
  }
`

const LAYOUT_PRESETS: readonly { value: MenuPreset; label: string; title: string; hint: string }[] = [
  { value: 'stock', label: 'Stock', title: 'Spotify’s own order', hint: 'Spotify’s own order. Change anything below and it becomes your Custom layout.' },
  {
    value: 'ours',
    label: 'Spotify Custom',
    title: 'Collect, go to, play and share, then remove',
    hint: 'Collect first, then go somewhere, then play and share, then remove. Change anything below and it becomes your Custom layout.',
  },
  { value: 'custom', label: 'Custom', title: 'Your own layout', hint: 'Your layout. Drag to reorder, hide what you don’t use, and add separators or named groups.' },
]

const ITEMS = new Map(MENU_ITEMS.map(i => [i.key, i]))
const nameOf = (e: MenuEntry) => (e.kind === 'item' ? (ITEMS.get(e.key)?.label ?? e.key) : e.kind === 'group' ? `group ${e.label}` : 'separator')

/** Stable row keys: items by their key, separators and groups by how many of their kind came before. */
function rowKeys(layout: readonly MenuEntry[]): string[] {
  const seen = { separator: 0, group: 0 }
  return layout.map(e => (e.kind === 'item' ? `item:${e.key}` : `${e.kind}:${seen[e.kind]++}`))
}

function GroupLabel({ label, focus, onFocused, onInput }: { label: string; focus: boolean; onFocused: () => void; onInput: (label: string) => void }) {
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
      class="b-mrow__group"
      value={label}
      maxLength={MENU_GROUP_LABEL_MAX}
      placeholder="Group name"
      aria-label="Group name"
      onInput={e => onInput(e.currentTarget.value)}
    />
  )
}

export function LayoutSection() {
  useStyles(styles)
  const { store } = useEnv()
  const menu = useApp(s => s.settings.menu)
  const layout = shownLayout(menu)
  const keys = rowKeys(layout)
  const missing = missingItems(layout)
  // Index of a group just added, so its name field takes focus.
  const [focusAt, setFocusAt] = useState(-1)
  const edit = (mutate: (layout: MenuEntry[]) => void) => store.editSettings(s => editLayout(s.menu, mutate))
  const custom = menu.preset === 'custom' && menu.custom.length > 0

  const row = (entry: MenuEntry, i: number) => {
    if (entry.kind === 'separator') {
      return (
        <>
          <span class="b-mrow__rule">Separator</span>
          <IconButton icon={X} size={15} label="Remove separator" onClick={() => edit(l => removeEntry(l, i))} />
        </>
      )
    }
    if (entry.kind === 'group') {
      return (
        <>
          <GroupLabel label={entry.label} focus={focusAt === i} onFocused={() => setFocusAt(-1)} onInput={v => edit(l => setGroupLabel(l, i, v))} />
          <IconButton icon={X} size={15} label={`Remove group ${entry.label}`} onClick={() => edit(l => removeEntry(l, i))} />
        </>
      )
    }
    const def = ITEMS.get(entry.key)
    const name = def?.label ?? entry.key
    const hidden = entry.hidden === true
    return (
      <>
        <span class="b-mrow__text" data-hidden={hidden}>
          <span class="b-mrow__title">{name}</span>
          {def?.contextual && <span class="b-hint">Only in some menus</span>}
        </span>
        {def?.submenu && (
          <span class="b-mrow__sub" title="Opens a submenu">
            <Icon svg={ChevronRight} size={14} />
          </span>
        )}
        <IconButton icon={hidden ? EyeOff : Eye} label={hidden ? `Show ${name}` : `Hide ${name}`} aria-pressed={hidden} onClick={() => edit(l => setHidden(l, i, !hidden))} />
      </>
    )
  }

  return (
    <Section
      id="menuLayout"
      tour="menu-layout"
      title="Right-click menu"
      icon={SquareMenu}
      aside={
        menu.enabled &&
        custom && (
          <ResetButton
            label="Discard your layout and go back to Spotify Custom"
            onClick={() =>
              store.editSettings(s => {
                resetLayout(s.menu)
              })
            }
          />
        )
      }
    >
      <Toggle
        label="Our right-click menu"
        description={menu.enabled ? 'For songs: in lists, the queue and the player bar' : 'Off: Spotify’s own menu, untouched'}
        checked={menu.enabled}
        onChange={v =>
          store.editSettings(s => {
            s.menu.enabled = v
          })
        }
      />
      {menu.enabled && (
        <>
          <OptionTiles<MenuPreset>
            label="Menu layout"
            columns={3}
            value={menu.preset}
            options={LAYOUT_PRESETS.map(p => ({
              value: p.value,
              label: p.label,
              title: p.title,
              preview: <MiniMenu layout={p.value === 'stock' ? STOCK : p.value === 'ours' ? OURS : menu.custom.length > 0 ? menu.custom : OURS} />,
            }))}
            onChange={v =>
              store.editSettings(s => {
                s.menu.preset = v
              })
            }
          />
          <span class="b-hint">{LAYOUT_PRESETS.find(p => p.value === menu.preset)?.hint}</span>
          <DragList label="Menu rows" items={layout} keyOf={(_, i) => keys[i]} nameOf={nameOf} onMove={(from, to) => edit(l => moveEntry(l, from, to))}>
            {row}
          </DragList>
          <div class="b-menu-adds">
            <Button icon={SeparatorHorizontal} onClick={() => edit(addSeparator)}>
              Add separator
            </Button>
            <Button
              icon={Heading}
              onClick={() => {
                setFocusAt(layout.length)
                edit(l => addGroup(l, 'New group'))
              }}
            >
              Add group
            </Button>
          </div>
          {missing.length > 0 && (
            <Field label="Not in your menu">
              <span class="b-hint">These show at the end of the menu. Add one to give it a place.</span>
              <DragList label="Not in your menu" items={missing} keyOf={i => i.key} nameOf={i => i.label} onMove={() => undefined} movable={false}>
                {item => (
                  <>
                    <span class="b-mrow__text">
                      <span class="b-mrow__title">{item.label}</span>
                    </span>
                    <IconButton icon={Plus} label={`Add ${item.label}`} onClick={() => edit(l => addItem(l, item.key))} />
                  </>
                )}
              </DragList>
            </Field>
          )}
          <Field label="Preview">
            <div class="b-menu-preview">
              <MenuPreview rows={arrange(layout, MENU_ITEMS)} />
            </div>
          </Field>
        </>
      )}
    </Section>
  )
}
