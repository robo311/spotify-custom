// The "Add to playlist" submenu: its sort, covers, folders, and the playlists themselves (pin to keep one on top;
// with the Custom sort, drag into your own order). Playlists are read from Spotify when the section opens.
import { useEffect, useState } from 'preact/hooks'
import { ListMusic, Music, Pin, PinOff } from 'lucide-static'
import { spotify } from '../../../spotify'
import type { PlaylistMenuSettings } from '../../../types'
import { useApp, useEnv } from '../../context'
import { moveItem } from '../../lib/reorder'
import { css, useStyles } from '../../styles/sheet'
import { IconButton } from '../../ui/Button'
import { EmptyState } from '../../ui/EmptyState'
import { Field } from '../../ui/Field'
import { Icon } from '../../ui/Icon'
import { Section } from '../../ui/Section'
import { Segmented } from '../../ui/Segmented'
import { Toggle } from '../../ui/Toggle'
import { DragList } from './DragList'
import { flattenPlaylists, orderPlaylists, reorderPlaylists, togglePin, type FlatPlaylist } from './menu-edits'

const styles = css`
  .b-plrow__cover {
    display: grid;
    place-items: center;
    flex: none;
    width: 28px;
    height: 28px;
    border-radius: 4px;
    overflow: hidden;
    background: var(--b-slot);
    color: var(--b-sub);
  }
  .b-plrow__cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .b-plrow__text {
    flex: 1;
    min-width: 0;
    display: grid;
  }
  .b-plrow__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
  }
  .b-pl-list {
    max-height: 320px;
    overflow-y: auto;
    scrollbar-width: thin;
  }
`

type Loaded = { state: 'loading' } | { state: 'failed' } | { state: 'ready'; playlists: FlatPlaylist[] }

function usePlaylists(): Loaded {
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' })
  useEffect(() => {
    let live = true
    spotify.loadPlaylists().then(
      tree => live && setLoaded({ state: 'ready', playlists: flattenPlaylists(tree) }),
      () => live && setLoaded({ state: 'failed' }),
    )
    return () => {
      live = false
    }
  }, [])
  return loaded
}

export function PlaylistsSection() {
  useStyles(styles)
  const { store } = useEnv()
  const settings = useApp(s => s.settings.menu.playlists)
  const loaded = usePlaylists()
  const edit = (mutate: (p: PlaylistMenuSettings) => void) => store.editSettings(s => mutate(s.menu.playlists))
  const list = loaded.state === 'ready' ? orderPlaylists(loaded.playlists, settings) : []

  return (
    <Section id="menuPlaylists" tour="menu-playlists" title="Add to playlist" icon={ListMusic}>
      <span class="b-hint">The submenu of playlists you can add a song to.</span>
      <Field label="Order">
        <Segmented<PlaylistMenuSettings['sort']>
          label="Playlist order"
          value={settings.sort}
          options={[
            { value: 'library', label: 'Library', title: 'The order of your library' },
            { value: 'name', label: 'A–Z' },
            { value: 'custom', label: 'Custom', title: 'Drag the playlists below into your own order' },
          ]}
          onChange={v => edit(p => void (p.sort = v))}
        />
      </Field>
      <div>
        <Toggle label="Playlist covers" description="A small cover beside each name" checked={settings.covers} onChange={v => edit(p => void (p.covers = v))} />
        <Toggle
          label="Folders as submenus"
          description={settings.folders ? 'Playlists stay in their folders' : 'Off: one list, folders opened'}
          checked={settings.folders}
          onChange={v => edit(p => void (p.folders = v))}
        />
      </div>
      {loaded.state === 'failed' ? (
        <EmptyState icon={ListMusic}>Couldn’t read your playlists from Spotify right now. Your order and pins still apply.</EmptyState>
      ) : loaded.state === 'ready' && list.length === 0 ? (
        <EmptyState icon={ListMusic}>Playlists you own or can add to show up here.</EmptyState>
      ) : (
        loaded.state === 'ready' && (
          <Field label="Playlists">
            <span class="b-hint">{settings.sort === 'custom' ? 'Pin to keep a playlist on top. Drag to reorder.' : 'Pin to keep a playlist on top.'}</span>
            <div class="b-pl-list">
              <DragList
                label="Playlists"
                items={list}
                keyOf={p => p.uri}
                nameOf={p => p.name}
                movable={settings.sort === 'custom'}
                onMove={(from, to) => edit(p => reorderPlaylists(p, moveItem(list, from, to)))}
              >
                {p => {
                  const pinned = settings.pinned.includes(p.uri)
                  return (
                    <>
                      {settings.covers && (
                        <span class="b-plrow__cover">{p.image ? <img src={p.image} alt="" loading="lazy" /> : <Icon svg={Music} size={14} />}</span>
                      )}
                      <span class="b-plrow__text">
                        <span class="b-plrow__name">{p.name}</span>
                        {p.folder && <span class="b-hint">In {p.folder}</span>}
                      </span>
                      <IconButton
                        icon={pinned ? PinOff : Pin}
                        label={pinned ? `Unpin ${p.name}` : `Pin ${p.name} to the top`}
                        aria-pressed={pinned}
                        onClick={() => edit(s => togglePin(s, p.uri))}
                      />
                    </>
                  )
                }}
              </DragList>
            </div>
          </Field>
        )
      )}
    </Section>
  )
}
