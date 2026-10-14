// Themes: pick a preset or one of your themes, begin from a colour or picture, and share a look or bring one in.
import { WandSparkles } from 'lucide-static'
import { Section } from '../ui/Section'
import { GallerySections } from './themes/GallerySections'
import { ShareSections } from './themes/ShareSections'
import { StartFrom } from './themes/StartFrom'

export function ThemesTab() {
  return (
    <>
      <GallerySections />

      <Section title="Start from" icon={WandSparkles}>
        <StartFrom />
      </Section>

      <ShareSections />
    </>
  )
}
