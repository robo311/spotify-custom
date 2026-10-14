// Player: the bar along the bottom. The bar itself (size, Canvas cover, colours), its play button, progress and
// volume bars, then which of its buttons show and their icons.
import { Shuffle } from 'lucide-static'
import type { IconName } from '../../icons'
import { useApp, useEnv } from '../context'
import { HideToggle } from '../parts/HideToggle'
import { PartSection } from '../parts/PartSection'
import { IconChoiceField } from '../ui/IconChoiceField'
import { Section } from '../ui/Section'
import { Toggle } from '../ui/Toggle'

/** Buttons whose icon can be swapped one by one, in the order they appear in the bar. */
const ICONS: readonly { name: IconName; label: string }[] = [
  { name: 'shuffle', label: 'Shuffle' },
  { name: 'prev', label: 'Previous' },
  { name: 'play', label: 'Play' },
  { name: 'pause', label: 'Pause' },
  { name: 'next', label: 'Next' },
  { name: 'repeat', label: 'Repeat' },
  { name: 'lyrics', label: 'Lyrics' },
  { name: 'queue', label: 'Queue' },
  { name: 'volume', label: 'Volume' },
  { name: 'volumeMuted', label: 'Muted' },
]

export function PlayerTab() {
  const { store } = useEnv()
  const compactPlayer = useApp(s => s.active.layout.compactPlayer)
  const canvasPlayerBar = useApp(s => s.active.effects.canvasPlayerBar)

  return (
    <>
      <PartSection partId="playerBar">
        <div>
          <Toggle
            label="Compact player"
            description="A slimmer player bar with more room for pages"
            checked={compactPlayer}
            onChange={v =>
              store.edit(t => {
                t.layout.compactPlayer = v
              })
            }
          />
          <Toggle
            label="Canvas as the cover"
            description="The playing song’s looping video in the small cover, while the Now playing panel plays it"
            checked={canvasPlayerBar}
            onChange={v =>
              store.edit(t => {
                t.effects.canvasPlayerBar = v
              })
            }
          />
        </div>
      </PartSection>

      <PartSection partId="playerPlayButton" />
      <PartSection partId="progressBar" />
      <PartSection partId="volumeBar" />

      <Section id="playerButtons" title="Buttons" icon={Shuffle}>
        <div>
          <HideToggle id="pip" label="Hide the mini player button" />
          <HideToggle id="lyricsButton" label="Hide the lyrics button" />
          <HideToggle id="fullscreenButton" label="Hide the full screen button" />
          <HideToggle id="qualityBadge" label="Hide the audio quality label" />
        </div>
        <span class="b-label">Icons</span>
        <span class="b-hint">Pick a different icon for any button. It wins over the icon pack.</span>
        <div style={{ display: 'grid', gap: '2px', margin: '0 -8px' }}>
          {ICONS.map(b => (
            <IconChoiceField key={b.name} name={b.name} label={b.label} />
          ))}
        </div>
      </Section>
    </>
  )
}
