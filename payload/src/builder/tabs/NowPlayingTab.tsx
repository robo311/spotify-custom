// Now playing: Spotify's own panel on the right. The panel itself (hide, colours), its sections (reorder or hide),
// the song header at its top (cover, the gradient over it, title size, which buttons show), and the cards below it.
import { Clapperboard, Info, Rows3 } from 'lucide-static'
import type { NowPlayingLayout } from '../../types'
import { NPV_TITLE_SCALE_MAX, NPV_TITLE_SCALE_MIN } from '../../theme/model'
import { useApp, useEnv } from '../context'
import { PartSection } from '../parts/PartSection'
import { Field } from '../ui/Field'
import { Segmented } from '../ui/Segmented'
import { Slider } from '../ui/Slider'
import { nextOrder, orderByKeys } from '../lib/reorder'
import { EmptyState } from '../ui/EmptyState'
import { Section } from '../ui/Section'
import { SortableList } from '../ui/SortableList'
import { Toggle } from '../ui/Toggle'

function SongHeader() {
  const { store } = useEnv()
  const np = useApp(s => s.active.layout.nowPlaying)
  const edit = <K extends keyof NowPlayingLayout>(key: K, value: NowPlayingLayout[K], coalesceKey?: string) =>
    store.edit(
      t => {
        t.layout.nowPlaying = { ...t.layout.nowPlaying, [key]: value }
      },
      { coalesceKey },
    )

  return (
    <Section id="npvHeader" title="Song header" icon={Clapperboard}>
      <span class="b-hint">The cover or video at the top of the Now playing panel.</span>
      <Toggle label="Compact cover" description="A smaller cover or video at the top of the panel" checked={np.compactCover} onChange={v => edit('compactCover', v)} />
      <Field label="Cover height">
        <Segmented<NowPlayingLayout['coverHeight']>
          label="Cover height"
          value={np.coverHeight}
          onChange={v => edit('coverHeight', v)}
          options={[
            { value: 'short', label: 'Short' },
            { value: 'spotify', label: 'Square', title: 'Spotify’s own' },
            { value: 'tall', label: 'Tall' },
          ]}
        />
      </Field>
      <Field label="Gradient over the cover">
        <Segmented<NowPlayingLayout['coverShade']>
          label="Gradient over the cover"
          value={np.coverShade}
          onChange={v => edit('coverShade', v)}
          options={[
            { value: 'none', label: 'None' },
            { value: 'soft', label: 'Soft' },
            { value: 'spotify', label: 'Spotify' },
            { value: 'strong', label: 'Strong', title: 'Darker, so the text over it reads best' },
          ]}
        />
      </Field>
      <Slider
        label="Title size"
        min={NPV_TITLE_SCALE_MIN * 100}
        max={NPV_TITLE_SCALE_MAX * 100}
        step={5}
        unit="%"
        value={Math.round(np.titleScale * 100)}
        onInput={v => edit('titleScale', v / 100, 'npv.titleScale')}
      />
      <div>
        <Toggle label="Hide “Switch to video”" checked={np.hideVideoSwitch} onChange={v => edit('hideVideoSwitch', v)} />
        <Toggle label="Hide the Liked tick" description="The add-to-Liked button next to the title" checked={np.hideLikeButton} onChange={v => edit('hideLikeButton', v)} />
      </div>
    </Section>
  )
}

export function NowPlayingTab() {
  const { store } = useEnv()
  const sections = useApp(s => s.panelSections)
  const nowPlaying = useApp(s => s.active.layout.nowPlaying)

  return (
    <>
      <PartSection partId="rightPanel" title="Panel" />

      <Section id="npvSections" title="Sections" icon={Rows3}>
        {sections.length === 0 ? (
          <EmptyState icon={Info}>Open the Now playing view in Spotify to arrange its sections here.</EmptyState>
        ) : (
          <>
            <span class="b-hint">Drag to reorder, or hide what you don’t need.</span>
            <SortableList
              label="Now playing sections"
              items={orderByKeys(sections, nowPlaying.order)}
              hidden={nowPlaying.hidden}
              onReorder={next =>
                store.edit(t => {
                  t.layout.nowPlaying.order = nextOrder(t.layout.nowPlaying.order, next)
                })
              }
              onToggleHidden={(key, hide) =>
                store.edit(t => {
                  const rest = t.layout.nowPlaying.hidden.filter(k => k !== key)
                  t.layout.nowPlaying.hidden = hide ? [...rest, key] : rest
                })
              }
            />
          </>
        )}
      </Section>

      <SongHeader />

      <PartSection partId="npvCards" title="Cards" hint="About the artist, credits, tour and the queue. The lyrics preview follows the Lyrics tab." />
    </>
  )
}
