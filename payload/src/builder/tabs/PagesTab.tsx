// Pages: the look of album, playlist, song and artist pages (theme.pageStyle), in three sub-tabs: General (what
// every page shares), Albums & playlists, and Artists. Which setting lives where: pages/groups.ts.
import { useState } from 'preact/hooks'
import type { PageStyle } from '../../types'
import { useApp, useEnv } from '../context'
import { KeyTabs, type KeyTab } from '../ui/KeyTabs'
import { ResetButton } from '../ui/ResetButton'
import { AlbumsTab } from './pages/AlbumsTab'
import { ArtistsTab } from './pages/ArtistsTab'
import { GeneralTab } from './pages/GeneralTab'
import { isGroupCustomised, resetGroup, type PageEdit, type PagesTabId } from './pages/groups'

const TABS: readonly KeyTab<PagesTabId>[] = [
  { id: 'general', label: 'General' },
  { id: 'albums', label: 'Albums' },
  { id: 'artists', label: 'Artists' },
]

/** What each tab changes, under the tabs (the Albums tab also styles playlist headers). */
const SCOPE: Record<PagesTabId, string> = {
  general: 'Titles, play button and song lists on every page.',
  albums: 'Album, song and playlist pages.',
  artists: 'Artist pages.',
}

const RESET_LABEL: Record<PagesTabId, string> = {
  general: 'Reset titles, play button and track lists',
  albums: 'Reset album and playlist headers',
  artists: 'Reset artist pages',
}

/** The sub-tab last open, so switching to another builder tab and back returns to it. */
let lastTab: PagesTabId = 'general'

export function PagesTab() {
  const { store } = useEnv()
  const page = useApp(s => s.active.pageStyle)
  const [tab, setTab] = useState(lastTab)
  const edit: PageEdit = <K extends keyof PageStyle>(key: K, value: PageStyle[K], coalesceKey?: string) =>
    store.edit(
      t => {
        t.pageStyle = { ...t.pageStyle, [key]: value }
      },
      { coalesceKey },
    )
  const choose = (id: PagesTabId) => {
    lastTab = id
    setTab(id)
  }

  return (
    <>
      {/* Same inset as the sections (Section: margin 0 12px, 12px above the first). */}
      <div style={{ margin: '12px 12px 0' }}>
        <KeyTabs label="Page type" tabs={TABS} value={tab} onChange={choose} />
      </div>
      {/* Inset from the tabs, a little short of the section titles below. */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between', minHeight: '28px', margin: '6px 20px 0 18px' }}>
        <span class="b-hint">{SCOPE[tab]}</span>
        {isGroupCustomised(page, tab) && (
          <ResetButton
            label={RESET_LABEL[tab]}
            onClick={() =>
              store.edit(t => {
                t.pageStyle = resetGroup(t.pageStyle, tab)
              })
            }
          />
        )}
      </div>
      {tab === 'general' && <GeneralTab page={page} edit={edit} />}
      {tab === 'albums' && <AlbumsTab page={page} edit={edit} />}
      {tab === 'artists' && <ArtistsTab page={page} edit={edit} />}
    </>
  )
}
