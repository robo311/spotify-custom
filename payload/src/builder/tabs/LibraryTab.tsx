// Library: the sidebar (which side, hide, colours), then artwork: give Liked Songs, Your Episodes and your folders their
// own picture or icon (Spotify can't). Artwork is personal, not part of themes, so it never travels in share codes.
import { useEffect, useRef, useState } from 'preact/hooks'
import { Folder, FolderPlus, Heart, Image, Paintbrush, Podcast } from 'lucide-static'
import { useApp, useEnv, useUi } from '../context'
import { css, useStyles } from '../styles/sheet'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { Section } from '../ui/Section'
import { Segmented } from '../ui/Segmented'
import { PartSection } from '../parts/PartSection'
import { ArtworkRow } from './library/ArtworkRow'

const styles = css`
  .b-artlist {
    display: grid;
    gap: 2px;
    margin: 0 -8px;
  }
`

export function LibraryTab() {
  useStyles(styles)
  const { store, ui } = useEnv()
  const librarySide = useApp(s => s.active.layout.librarySide)
  const items = useApp(s => s.libraryItems)
  const requested = useUi(s => s.editingArtwork)
  const [openUri, setOpenUri] = useState<string | null>(requested)
  const rootRef = useRef<HTMLDivElement>(null)
  const liked = items.filter(i => i.kind === 'liked')
  const episodes = items.filter(i => i.kind === 'episodes')
  const folders = items.filter(i => i.kind === 'folder')

  // An item picked in pick mode opens here: expand it, bring it into view, then consume the request.
  useEffect(() => {
    if (!requested) return
    setOpenUri(requested)
    ui.set(s => ({ ...s, editingArtwork: null }))
    requestAnimationFrame(() => rootRef.current?.querySelector(`[data-uri="${CSS.escape(requested)}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
  }, [requested, ui])

  const rows = (list: typeof items) => (
    <div class="b-artlist">
      {list.map(item => (
        <ArtworkRow key={item.uri} item={item} open={openUri === item.uri} onToggle={() => setOpenUri(openUri === item.uri ? null : item.uri)} />
      ))}
    </div>
  )

  return (
    <div ref={rootRef}>
      <PartSection partId="sidebar">
        <Segmented<'left' | 'right'>
          label="Library side"
          value={librarySide}
          onChange={side =>
            store.edit(t => {
              t.layout.librarySide = side
            })
          }
          options={[
            { value: 'left', label: 'On the left' },
            { value: 'right', label: 'On the right' },
          ]}
        />
      </PartSection>
      <Section
        title="Artwork" icon={Image}
        aside={
          items.length > 0 && (
            <Button icon={Paintbrush} onClick={() => ui.set(s => ({ ...s, picking: true, arranging: undefined }))}>
              Pick in library
            </Button>
          )
        }
      >
        <span class="b-hint">Give Liked Songs, Your Episodes and your folders their own picture or icon. These looks are just for you, so they aren’t included when you share a theme.</span>
      </Section>
      {liked.length > 0 && <Section title="Liked Songs" icon={Heart}>{rows(liked)}</Section>}
      {episodes.length > 0 && <Section title="Your Episodes" icon={Podcast}>{rows(episodes)}</Section>}
      <Section title="Folders" icon={Folder}>
        {folders.length ? rows(folders) : <EmptyState icon={FolderPlus}>Folders you create in your Spotify library show up here.</EmptyState>}
      </Section>
    </div>
  )
}
