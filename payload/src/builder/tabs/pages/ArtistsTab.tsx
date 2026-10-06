// Pages › Artists (theme.pageStyle.artist*): the banner photo's treatment and height, and the size of the artist's name.
import { UserRound } from 'lucide-static'
import type { PageStyle } from '../../../types'
import { PAGE_TITLE_SCALE_MAX, PAGE_TITLE_SCALE_MIN } from '../../../theme/model'
import { Button } from '../../ui/Button'
import { Field } from '../../ui/Field'
import { Section } from '../../ui/Section'
import { Segmented } from '../../ui/Segmented'
import { Slider } from '../../ui/Slider'
import type { PageEdit } from './groups'
import { openPlayingArtist } from './navigation'

export function ArtistsTab({ page, edit }: { page: PageStyle; edit: PageEdit }) {
  return (
    <>
      <Section
        title="Banner"
        aside={
          <Button icon={UserRound} onClick={openPlayingArtist}>
            Show an artist
          </Button>
        }
      >
        <Field label="Banner photo">
          <Segmented<PageStyle['artistBanner']>
            label="Banner photo"
            value={page.artistBanner}
            onChange={v => edit('artistBanner', v)}
            options={[
              { value: 'spotify', label: 'Spotify' },
              { value: 'dim', label: 'Dim' },
              { value: 'blur', label: 'Blur' },
              { value: 'tint', label: 'Tint', title: 'Black and white, coloured with your accent' },
              { value: 'none', label: 'None', title: 'No photo: the theme’s own colours' },
            ]}
          />
        </Field>
        <Field label="Banner height">
          <Segmented<PageStyle['artistBannerHeight']>
            label="Banner height"
            value={page.artistBannerHeight}
            onChange={v => edit('artistBannerHeight', v)}
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'spotify', label: 'Spotify' },
              { value: 'tall', label: 'Tall' },
            ]}
          />
        </Field>
      </Section>

      <Section title="Name">
        <Slider
          label="Name size"
          min={PAGE_TITLE_SCALE_MIN * 100}
          max={PAGE_TITLE_SCALE_MAX * 100}
          step={5}
          unit="%"
          value={Math.round(page.artistNameScale * 100)}
          onInput={v => edit('artistNameScale', v / 100, 'page.artistNameScale')}
        />
      </Section>
    </>
  )
}
