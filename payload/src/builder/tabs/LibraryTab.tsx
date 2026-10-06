// Library artwork: give Liked Songs and your folders their own picture or icon (Spotify can't).
// Personal settings, not part of themes, so they never travel in share codes.
import { useEffect, useRef, useState } from 'preact/hooks'
import { FolderPlus, Paintbrush } from 'lucide-static'
import { useApp, useEnv, useUi } from '../context'
import { css, useStyles } from '../styles/sheet'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { Section } from '../ui/Section'
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
  const { ui } = useEnv()
  const items = useApp(s => s.libraryItems)
  const requested = useUi(s => s.editingArtwork)
  const [openUri, setOpenUri] = useState<string | null>(requested)
  const rootRef = useRef<HTMLDivElement>(null)
  const liked = items.filter(i => i.kind === 'liked')
  const folders = items.filter(i => i.kind !== 'liked')

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
      <Section
        title="Library artwork"
        aside={
          items.length > 0 && (
            <Button icon={Paintbrush} onClick={() => ui.set(s => ({ ...s, picking: true }))}>
              Pick in library
            </Button>
          )
        }
      >
        <span class="b-hint">Give Liked Songs and your folders their own picture or icon. These looks are just for you, so they aren’t included when you share a theme.</span>
      </Section>
      {liked.length > 0 && <Section title="Liked Songs">{rows(liked)}</Section>}
      <Section title="Folders">
        {folders.length ? rows(folders) : <EmptyState icon={FolderPlus}>Folders you create in your Spotify library show up here.</EmptyState>}
      </Section>
    </div>
  )
}
