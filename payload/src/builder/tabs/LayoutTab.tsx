// Layout: hide whole areas from the window map, arrange the top bar and the Now playing panel, tidy up buttons,
// compact the player.
import { LAYOUT_OPTIONS } from '../../parts'
import type { LayoutConfig } from '../../types'
import { useApp, useEnv } from '../context'
import { setHidden } from '../lib/theme-edits'
import { Field } from '../ui/Field'
import { Section } from '../ui/Section'
import { Segmented } from '../ui/Segmented'
import { Toggle } from '../ui/Toggle'
import { MiniMap } from './layout/MiniMap'
import { NowPlayingSection } from './layout/NowPlayingSection'

/** Hide options that live in the top bar: shown in its own section, the rest under "Hide buttons". */
const TOP_BAR_OPTIONS = new Set(['backForward', 'topBarHome', 'whatsNew', 'friendActivity'])

export function LayoutTab() {
  const { store } = useEnv()
  const layout = useApp(s => s.active.layout)
  const canvasPlayerBar = useApp(s => s.active.effects.canvasPlayerBar)

  return (
    <>
      <Section title="Window">
        <MiniMap />
        <span class="b-hint">Click an area to hide or show it.</span>
        <Segmented<'left' | 'right'>
          label="Library side"
          value={layout.librarySide}
          onChange={side => store.edit(t => {
            t.layout.librarySide = side
          })}
          options={[
            { value: 'left', label: 'Library on the left' },
            { value: 'right', label: 'On the right' },
          ]}
        />
      </Section>

      <Section title="Top bar">
        <Field label="Home and search">
          <Segmented<LayoutConfig['searchPosition']>
            label="Home and search"
            value={layout.searchPosition}
            onChange={position => store.edit(t => {
              t.layout.searchPosition = position
            })}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'centre', label: 'Centre', title: 'Spotify’s own' },
              { value: 'right', label: 'Right' },
            ]}
          />
        </Field>
        <Field label="Hide">
          {LAYOUT_OPTIONS.filter(option => TOP_BAR_OPTIONS.has(option.id)).map(option => (
            <Toggle key={option.id} label={option.label} checked={layout.hidden.includes(option.id)} onChange={v => store.edit(setHidden(option.id, v))} />
          ))}
        </Field>
      </Section>

      <NowPlayingSection />

      <Section title="Player">
        <Toggle
          label="Compact player"
          description="A slimmer player bar with more room for pages"
          checked={layout.compactPlayer}
          onChange={v => store.edit(t => {
            t.layout.compactPlayer = v
          })}
        />
        <Toggle
          label="Canvas as the cover"
          description="The playing song’s looping video in the small cover, while the Now playing panel plays it"
          checked={canvasPlayerBar}
          onChange={v => store.edit(t => {
            t.effects.canvasPlayerBar = v
          })}
        />
      </Section>

      {LAYOUT_OPTIONS.length > 0 && (
        <Section title="Hide buttons">
          {LAYOUT_OPTIONS.filter(option => !TOP_BAR_OPTIONS.has(option.id)).map(option => (
            <Toggle key={option.id} label={option.label} checked={layout.hidden.includes(option.id)} onChange={v => store.edit(setHidden(option.id, v))} />
          ))}
        </Section>
      )}
    </>
  )
}
