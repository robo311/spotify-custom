// The right-click menu: on/off, the preset (Stock, Spotify Custom, Custom) and the layout, edited right in a preview
// drawn like the live menu (MenuEditor). Editing a built-in preset makes it yours as Custom (menu-edits editLayout).
import { useState } from 'preact/hooks'
import { Heading, Plus, SeparatorHorizontal, SquareMenu } from 'lucide-static'
import { OURS, STOCK } from '../../../menu'
import type { MenuEntry, MenuPreset } from '../../../types'
import { useApp, useEnv } from '../../context'
import { css, useStyles } from '../../styles/sheet'
import { Button, IconButton } from '../../ui/Button'
import { Field } from '../../ui/Field'
import { OptionTiles } from '../../ui/OptionTiles'
import { ResetButton } from '../../ui/ResetButton'
import { Section } from '../../ui/Section'
import { Toggle } from '../../ui/Toggle'
import { DragList } from './DragList'
import { addGroup, addItem, addSeparator, editLayout, missingItems, moveEntry, removeEntry, resetLayout, setGroupLabel, setHidden, shownLayout } from './menu-edits'
import { MenuEditor } from './MenuEditor'
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
  .b-menu-adds {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
`

const EDIT_HINT = 'Drag rows in the menu below to reorder, use the eye to hide what you don’t use, and add separators or named groups.'

const LAYOUT_PRESETS: readonly { value: MenuPreset; label: string; title: string; hint: string }[] = [
  { value: 'stock', label: 'Stock', title: 'Spotify’s own order', hint: `Spotify’s own order. ${EDIT_HINT} Any change makes it your Custom layout.` },
  {
    value: 'ours',
    label: 'Spotify Custom',
    title: 'Collect, go to, play and share, then remove',
    hint: `Collect first, then go somewhere, then play and share, then remove. ${EDIT_HINT} Any change makes it your Custom layout.`,
  },
  { value: 'custom', label: 'Custom', title: 'Your own layout', hint: `Your layout. ${EDIT_HINT}` },
]

export function LayoutSection() {
  useStyles(styles)
  const { store } = useEnv()
  const menu = useApp(s => s.settings.menu)
  const layout = shownLayout(menu)
  const missing = missingItems(layout)
  // Index of a group just added, so its name field takes focus.
  const [focusAt, setFocusAt] = useState(-1)
  const edit = (mutate: (layout: MenuEntry[]) => void) => store.editSettings(s => editLayout(s.menu, mutate))
  const custom = menu.preset === 'custom' && menu.custom.length > 0

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
          <MenuEditor
            layout={layout}
            onMove={(from, to) => edit(l => moveEntry(l, from, to))}
            onHidden={(i, hidden) => edit(l => setHidden(l, i, hidden))}
            onRemove={i => edit(l => removeEntry(l, i))}
            onRename={(i, label) => edit(l => setGroupLabel(l, i, label))}
            focusAt={focusAt}
            onFocused={() => setFocusAt(-1)}
          />
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
        </>
      )}
    </Section>
  )
}
