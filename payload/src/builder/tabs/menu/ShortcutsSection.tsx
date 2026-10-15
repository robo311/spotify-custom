// Shortcut buttons: one-click actions beside a song, chosen per place (song rows, the queue, the player bar), up to
// SHORTCUTS_MAX each, in the order they sit.
import { useState } from 'preact/hooks'
import { Disc3, Heart, Link, ListEnd, ListPlus, ListX, MousePointerClick, Radio, UserRound, X } from 'lucide-static'
import { SHORTCUTS_MAX } from '../../../theme/model'
import type { ShortcutAction, ShortcutSurface } from '../../../types'
import { useApp, useEnv } from '../../context'
import { moveItem } from '../../lib/reorder'
import { css, useStyles } from '../../styles/sheet'
import { Button, IconButton } from '../../ui/Button'
import { Icon } from '../../ui/Icon'
import { KeyTabs, type KeyTab } from '../../ui/KeyTabs'
import { Section } from '../../ui/Section'
import { DragList } from './DragList'
import { shortcutChoices, toggleShortcut } from './menu-edits'

const styles = css`
  .b-scut__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  .b-scut__count {
    color: var(--b-sub);
  }
  .b-scut__name {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
  }
  .b-scut__adds {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .b-scut__adds .b-btn {
    padding: 0 10px;
  }
`

const ACTIONS: Record<ShortcutAction, { label: string; icon: string }> = {
  'add-to-queue': { label: 'Add to queue', icon: ListEnd },
  'add-to-liked-songs': { label: 'Like', icon: Heart },
  'add-to-playlist': { label: 'Add to playlist', icon: ListPlus },
  'go-to-album': { label: 'Go to album', icon: Disc3 },
  'go-to-artist': { label: 'Go to artist', icon: UserRound },
  'go-to-radio': { label: 'Go to song radio', icon: Radio },
  share: { label: 'Copy song link', icon: Link },
  'remove-from-queue': { label: 'Remove from queue', icon: ListX },
}

const PLACES: readonly (KeyTab<ShortcutSurface> & { hint: string })[] = [
  { id: 'rows', label: 'Song rows', hint: 'On each song in albums, playlists and search results.' },
  { id: 'queue', label: 'Queue', hint: 'On the songs in the queue and Recently played.' },
  { id: 'playerBar', label: 'Player bar', hint: 'Next to the playing song in the player bar.' },
]

/** The place last open, so leaving the tab and coming back returns to it. */
let lastPlace: ShortcutSurface = 'rows'

export function ShortcutsSection() {
  useStyles(styles)
  const { store } = useEnv()
  const shortcuts = useApp(s => s.settings.menu.shortcuts)
  const [place, setPlace] = useState(lastPlace)
  const chosen = shortcuts[place]
  const full = chosen.length >= SHORTCUTS_MAX
  const available = shortcutChoices(place).filter(a => !chosen.includes(a))
  const edit = (mutate: (list: ShortcutAction[]) => void) => store.editSettings(s => mutate(s.menu.shortcuts[place]))
  const label = (a: ShortcutAction) => ACTIONS[a].label

  return (
    <Section id="menuShortcuts" tour="menu-shortcuts" title="Shortcut buttons" icon={MousePointerClick}>
      <span class="b-hint">One-click buttons beside a song, so the things you do most skip the menu.</span>
      <KeyTabs
        label="Where the buttons go"
        tabs={PLACES}
        value={place}
        onChange={id => {
          lastPlace = id
          setPlace(id)
        }}
      />
      <div class="b-scut__head">
        <span class="b-hint">{PLACES.find(p => p.id === place)?.hint}</span>
        <span class="b-mono b-scut__count" aria-label={`${chosen.length} of ${SHORTCUTS_MAX} buttons`}>
          {chosen.length}/{SHORTCUTS_MAX}
        </span>
      </div>
      {chosen.length > 0 && (
        <DragList
          label={`Buttons in ${PLACES.find(p => p.id === place)?.label ?? place}`}
          items={chosen}
          keyOf={a => a}
          nameOf={label}
          onMove={(from, to) => edit(list => list.splice(0, list.length, ...moveItem(list, from, to)))}
        >
          {a => (
            <>
              <span class="b-scut__name">
                <Icon svg={ACTIONS[a].icon} size={15} />
                {label(a)}
              </span>
              <IconButton icon={X} size={15} label={`Remove ${label(a)}`} onClick={() => edit(list => toggleShortcut(list, a))} />
            </>
          )}
        </DragList>
      )}
      <div class="b-scut__adds" role="group" aria-label="Add a button">
        {available.map(a => (
          <Button key={a} icon={ACTIONS[a].icon} disabled={full} onClick={() => edit(list => toggleShortcut(list, a))}>
            {label(a)}
          </Button>
        ))}
      </div>
      {full && <span class="b-hint">Up to {SHORTCUTS_MAX} buttons here. Remove one to add another.</span>}
    </Section>
  )
}
