// Start: pick a preset or one of your themes, begin from a colour or picture, and turn on the living effects.
import { useApp, useEnv } from '../context'
import { Section } from '../ui/Section'
import { Toggle } from '../ui/Toggle'
import { Field } from '../ui/Field'
import { ProgressStylePicker } from '../parts/ProgressStylePicker'
import { GallerySections } from './start/GallerySections'
import { StartFrom } from './start/StartFrom'

export function StartTab() {
  const { store } = useEnv()
  const effects = useApp(s => s.active.effects)

  return (
    <>
      <GallerySections />

      <Section title="Start from">
        <StartFrom />
      </Section>

      <Section title="Effects">
        <Toggle
          label="Album Mode"
          description="Colours follow the cover of whatever’s playing"
          checked={effects.albumMode}
          onChange={v =>
            store.edit(t => {
              t.effects.albumMode = v
            })
          }
        />
        <Toggle
          label="Ambient glow"
          description="A soft light from the cover behind each page"
          checked={effects.ambientGlow}
          onChange={v =>
            store.edit(t => {
              t.effects.ambientGlow = v
            })
          }
        />
        <Field label="Progress bar">
          <ProgressStylePicker />
        </Field>
      </Section>
    </>
  )
}
