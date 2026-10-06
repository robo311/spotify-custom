// The look of the playing song's row (shown under "Highlight the playing song" while it's on): style, colour,
// strength, and whether the title takes the colour too.
import { useState } from 'preact/hooks'
import type { PageStyle } from '../../../types'
import { PLAYING_STRENGTH_MAX, PLAYING_STRENGTH_MIN } from '../../../theme/model'
import { useApp } from '../../context'
import { ColorField } from '../../ui/ColorField'
import { Field } from '../../ui/Field'
import { Segmented } from '../../ui/Segmented'
import { Slider } from '../../ui/Slider'
import { Toggle } from '../../ui/Toggle'
import type { PageEdit } from './groups'

export function PlayingRowFields({ page, edit }: { page: PageStyle; edit: PageEdit }) {
  const accent = useApp(s => s.active.palette.accent)
  const [colourOpen, setColourOpen] = useState(false)

  return (
    <div style={{ display: 'grid', gap: '10px', padding: '4px 0 8px 12px', borderLeft: '2px solid var(--b-line)' }}>
      <Field label="Style">
        <Segmented<PageStyle['playingStyle']>
          label="Playing song style"
          value={page.playingStyle}
          onChange={v => edit('playingStyle', v)}
          options={[
            { value: 'bar', label: 'Bar', title: 'A bar on the left and a soft tint' },
            { value: 'wash', label: 'Wash', title: 'An even tint over the row' },
            { value: 'fade', label: 'Fade', title: 'Colour from the left, fading out' },
            { value: 'outline', label: 'Outline', title: 'A thin ring around the row' },
          ]}
        />
      </Field>
      <div style={{ margin: '0 -8px' }}>
        <ColorField
          label="Colour"
          value={page.playingColor ?? undefined}
          autoValue={accent}
          open={colourOpen}
          onToggle={() => setColourOpen(!colourOpen)}
          onChange={hex => edit('playingColor', hex ?? null, 'page.playingColor')}
        />
      </div>
      <Slider
        label="Strength"
        min={PLAYING_STRENGTH_MIN}
        max={PLAYING_STRENGTH_MAX}
        unit="%"
        value={page.playingStrength}
        onInput={v => edit('playingStrength', v, 'page.playingStrength')}
      />
      <Toggle label="Colour the title" description="The song’s name in the same colour" checked={page.playingTitle} onChange={v => edit('playingTitle', v)} />
    </div>
  )
}
