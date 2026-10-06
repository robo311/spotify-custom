// Pages › Albums & playlists: the header of album, song and playlist pages (backdrop, layout, height) and its cover
// and title size. The banner layout applies to albums and songs only.
import { useState } from 'preact/hooks'
import { Disc3 } from 'lucide-static'
import type { PageStyle } from '../../../types'
import { COVER_SIZE_MAX, COVER_SIZE_MIN, PAGE_TITLE_SCALE_MAX, PAGE_TITLE_SCALE_MIN, SPOTIFY_COVER_SIZE } from '../../../theme/model'
import { useApp, useEnv } from '../../context'
import { Button } from '../../ui/Button'
import { ColorField } from '../../ui/ColorField'
import { Field } from '../../ui/Field'
import { OptionTiles } from '../../ui/OptionTiles'
import { Section } from '../../ui/Section'
import { Segmented } from '../../ui/Segmented'
import { Slider } from '../../ui/Slider'
import { Toggle } from '../../ui/Toggle'
import type { PageEdit } from './groups'
import { openPlayingAlbum } from './navigation'
import { BACKDROPS } from './previews'

export function AlbumsTab({ page, edit }: { page: PageStyle; edit: PageEdit }) {
  const { store } = useEnv()
  const accent = useApp(s => s.active.palette.accent)
  const canvasAlbum = useApp(s => s.active.effects.canvasAlbum)
  const [colourOpen, setColourOpen] = useState(false)
  const pickBackdrop = (backdrop: PageStyle['backdrop']) =>
    store.edit(t => {
      // An own colour starts from the accent, so picking the tile changes nothing until the colour is changed.
      t.pageStyle = { ...t.pageStyle, backdrop, backdropColor: backdrop === 'custom' ? (t.pageStyle.backdropColor ?? accent) : t.pageStyle.backdropColor }
    })

  return (
    <>
      <Section
        title="Header"
        aside={
          <Button icon={Disc3} onClick={openPlayingAlbum}>
            Show an album
          </Button>
        }
      >
        <OptionTiles label="Header backdrop" value={page.backdrop} options={BACKDROPS} columns={3} onChange={pickBackdrop} />
        {page.backdrop === 'custom' && (
          <div style={{ margin: '0 -8px' }}>
            <ColorField
              label="Backdrop colour"
              value={page.backdropColor ?? accent}
              open={colourOpen}
              onToggle={() => setColourOpen(!colourOpen)}
              onChange={hex => hex && edit('backdropColor', hex, 'page.backdropColor')}
            />
          </div>
        )}
        {page.backdrop !== 'none' && (
          <Slider
            label="Backdrop strength"
            min={0}
            max={100}
            step={5}
            unit="%"
            value={page.backdropStrength}
            onInput={v => edit('backdropStrength', v, 'page.backdropStrength')}
          />
        )}
        <Field label="Header height">
          <Segmented<PageStyle['headerHeight']>
            label="Header height"
            value={page.headerHeight}
            onChange={v => edit('headerHeight', v)}
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'spotify', label: 'Spotify' },
              { value: 'tall', label: 'Tall' },
            ]}
          />
        </Field>
        <Field label="Layout">
          <Segmented<PageStyle['headerLayout']>
            label="Header layout"
            value={page.headerLayout}
            onChange={v => edit('headerLayout', v)}
            options={[
              { value: 'spotify', label: 'Spotify' },
              { value: 'centred', label: 'Centred', title: 'Cover above a centred title' },
              { value: 'banner', label: 'Banner', title: 'The cover as a wide banner behind the title, like artist pages' },
            ]}
          />
        </Field>
        {page.headerLayout === 'banner' && <span class="b-hint">Albums and songs. Playlists keep Spotify’s layout: their covers are often text or mosaics.</span>}
      </Section>

      <Section title="Cover and title">
        <Slider
          label="Cover size"
          min={COVER_SIZE_MIN}
          max={COVER_SIZE_MAX}
          step={4}
          unit="px"
          value={page.coverSize ?? SPOTIFY_COVER_SIZE}
          onInput={v => edit('coverSize', v, 'page.coverSize')}
        />
        <Toggle
          label="Canvas video as cover"
          description="The playing song’s looping video in place of its album’s cover (or banner), while the Now playing panel plays it. For the player bar: Layout › Player."
          checked={canvasAlbum}
          onChange={v =>
            store.edit(t => {
              t.effects.canvasAlbum = v
            })
          }
        />
        <Slider label="Cover corners" min={0} max={24} unit="px" value={page.coverRadius ?? 4} onInput={v => edit('coverRadius', v, 'page.coverRadius')} />
        <Field label="Cover shadow">
          <Segmented<PageStyle['coverShadow']>
            label="Cover shadow"
            value={page.coverShadow}
            onChange={v => edit('coverShadow', v)}
            options={[
              { value: 'spotify', label: 'Spotify' },
              { value: 'none', label: 'None' },
              { value: 'lifted', label: 'Lifted' },
              { value: 'glow', label: 'Glow', title: 'Soft light in the cover’s own colour' },
            ]}
          />
        </Field>
        <Slider
          label="Title size"
          min={PAGE_TITLE_SCALE_MIN * 100}
          max={PAGE_TITLE_SCALE_MAX * 100}
          step={5}
          unit="%"
          value={Math.round(page.titleScale * 100)}
          onInput={v => edit('titleScale', v / 100, 'page.titleScale')}
        />
      </Section>
    </>
  )
}
