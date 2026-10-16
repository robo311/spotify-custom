// Shortcut buttons: one-click actions beside a song, chosen per place (song rows, the queue, the player bar, search), up to
// SHORTCUTS_MAX each, in the order they sit; Spotify's own add button can stay or go. A preview shows the result.
import { useState } from 'preact/hooks'
import { CirclePlus, Disc3, Eye, EyeOff, Heart, Link, ListX, MousePointerClick, Radio, UserRound, X } from 'lucide-static'
import { ADD_TO_PLAYLIST_ICON, ADD_TO_QUEUE_ICON } from '../../../shortcuts'
import { SHORTCUTS_MAX, SPOTIFY_ADD_SURFACES } from '../../../theme/model'
import type { ShortcutAction, ShortcutSurface, SpotifyAddSurface } from '../../../types'
import { useApp, useEnv } from '../../context'
import { useSearchPeek } from '../../hooks/use-search-peek'
import { moveItem } from '../../lib/reorder'
import { css, useStyles } from '../../styles/sheet'
import { Button, IconButton } from '../../ui/Button'
import { Icon } from '../../ui/Icon'
import { KeyTabs, type KeyTab } from '../../ui/KeyTabs'
import { Field } from '../../ui/Field'
import { Section } from '../../ui/Section'
import { DragList } from './DragList'
import { shortcutChoices, toggleShortcut } from './menu-edits'
import { ShortcutPreview } from './ShortcutPreview'

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
  .b-scut__name[data-hidden='true'] {
    opacity: 0.45;
    text-decoration: line-through;
    text-decoration-color: var(--b-line);
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
  'add-to-queue': { label: 'Add to queue', icon: ADD_TO_QUEUE_ICON },
  'add-to-liked-songs': { label: 'Like', icon: Heart },
  'add-to-playlist': { label: 'Add to playlist', icon: ADD_TO_PLAYLIST_ICON },
  'go-to-album': { label: 'Go to album', icon: Disc3 },
  'go-to-artist': { label: 'Go to artist', icon: UserRound },
  'go-to-radio': { label: 'Go to song radio', icon: Radio },
  share: { label: 'Copy song link', icon: Link },
  'remove-from-queue': { label: 'Remove from queue', icon: ListX },
}

const PLACES: readonly (KeyTab<ShortcutSurface> & { hint: string })[] = [
  { id: 'rows', label: 'Song rows', hint: 'Appear when you point at a song in albums, playlists and search results.' },
  { id: 'queue', label: 'Queue', hint: 'Appear when you point at a song in the Queue and Recently played panel.' },
  { id: 'playerBar', label: 'Player bar', hint: 'Always there, next to the song that’s playing.' },
  { id: 'search', label: 'Search', hint: 'Appear when you point at a song in the suggestions under the search box.' },
]

const ICONS = Object.fromEntries(Object.entries(ACTIONS).map(([a, d]) => [a, d.icon])) as Record<ShortcutAction, string>

const hasSpotifyAdd = (place: ShortcutSurface): place is SpotifyAddSurface => (SPOTIFY_ADD_SURFACES as readonly string[]).includes(place)

/** The place last open, so leaving the tab and coming back returns to it. */
let lastPlace: ShortcutSurface = 'rows'

export function ShortcutsSection() {
  useStyles(styles)
  const { store } = useEnv()
  const shortcuts = useApp(s => s.settings.menu.shortcuts)
  const hiddenAdd = useApp(s => s.settings.menu.hideSpotifyAdd)
  const [place, setPlace] = useState(lastPlace)
  // Search suggestions only show while open: hold them open while their buttons are being chosen.
  useSearchPeek('menuShortcuts', place === 'search')
  const chosen = shortcuts[place]
  const full = chosen.length >= SHORTCUTS_MAX
  const available = shortcutChoices(place).filter(a => !chosen.includes(a))
  const edit = (mutate: (list: ShortcutAction[]) => void) => store.editSettings(s => mutate(s.menu.shortcuts[place]))
  const label = (a: ShortcutAction) => ACTIONS[a].label
  const spotifyAdd = hasSpotifyAdd(place) ? !hiddenAdd.includes(place) : null
  const toggleSpotifyAdd = (at: SpotifyAddSurface) =>
    store.editSettings(s => {
      const hidden = s.menu.hideSpotifyAdd
      s.menu.hideSpotifyAdd = hidden.includes(at) ? hidden.filter(p => p !== at) : [...hidden, at]
    })

  return (
    <Section id="menuShortcuts" tour="menu-shortcuts" title="Shortcut buttons" icon={MousePointerClick}>
      <span class="b-hint">
        Buttons that sit right on a song, next to Spotify’s own. Put what you do most here, like Add to queue, and it takes one
        click instead of a trip through the right-click menu.
      </span>
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
      <Field label="Preview">
        <ShortcutPreview place={place} actions={chosen} icons={ICONS} spotifyAdd={spotifyAdd === true} />
      </Field>
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
      {hasSpotifyAdd(place) && (
        <DragList label="Spotify’s button" items={[place]} keyOf={p => p} nameOf={() => 'Spotify’s add button'} onMove={() => undefined} movable={false}>
          {at => (
            <>
              <span class="b-scut__name" data-hidden={spotifyAdd === false} title="Spotify’s own + for Liked Songs and playlists. It always sits after your buttons.">
                <Icon svg={CirclePlus} size={15} />
                Spotify’s add button
              </span>
              <IconButton
                icon={spotifyAdd ? Eye : EyeOff}
                label={spotifyAdd ? 'Hide Spotify’s add button' : 'Show Spotify’s add button'}
                aria-pressed={!spotifyAdd}
                onClick={() => toggleSpotifyAdd(at)}
              />
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
