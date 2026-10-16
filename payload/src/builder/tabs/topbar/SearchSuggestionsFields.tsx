// The search suggestions' own controls, above their colours: row spacing, cover and text sizes, how tall the dropdown
// grows, and which bits of text show. The dropdown stays open while you work here, so changes show as you make them.
import type { SearchDropdownLayout } from '../../../types'
import {
  SEARCH_HEIGHT_MAX,
  SEARCH_HEIGHT_MIN,
  SEARCH_IMAGE_MAX,
  SEARCH_IMAGE_MIN,
  SEARCH_TEXT_MAX,
  SEARCH_TEXT_MIN,
} from '../../../theme/model'
import { useApp, useEnv } from '../../context'
import { useSearchPeek } from '../../hooks/use-search-peek'
import { Field } from '../../ui/Field'
import { Segmented } from '../../ui/Segmented'
import { Slider } from '../../ui/Slider'
import { Toggle } from '../../ui/Toggle'

/** Where the height slider starts when the user turns it on: Spotify's own on 1.3.4. */
const SPOTIFY_HEIGHT = 398

export function SearchSuggestionsFields() {
  const { store } = useEnv()
  const layout = useApp(s => s.active.layout.searchDropdown)
  useSearchPeek('searchDropdown', true)
  const edit = <K extends keyof SearchDropdownLayout>(key: K, value: SearchDropdownLayout[K], coalesceKey?: string) =>
    store.edit(
      t => {
        t.layout.searchDropdown = { ...t.layout.searchDropdown, [key]: value }
      },
      { coalesceKey },
    )

  return (
    <>
      <Field label="Row spacing">
        <Segmented<SearchDropdownLayout['density']>
          label="Row spacing"
          value={layout.density}
          onChange={v => edit('density', v)}
          options={[
            { value: 'spotify', label: 'Spotify', title: 'Spotify’s own' },
            { value: 'compact', label: 'Compact' },
            { value: 'dense', label: 'Dense' },
          ]}
        />
      </Field>
      <Slider
        label="Cover size"
        min={SEARCH_IMAGE_MIN}
        max={SEARCH_IMAGE_MAX}
        step={4}
        unit="px"
        value={layout.imageSize}
        onInput={v => edit('imageSize', v, 'search.imageSize')}
      />
      <Slider
        label="Text size"
        min={SEARCH_TEXT_MIN}
        max={SEARCH_TEXT_MAX}
        unit="px"
        value={layout.textSize}
        onInput={v => edit('textSize', v, 'search.textSize')}
      />
      <Toggle
        label="Own height"
        description="How tall the dropdown grows before it scrolls"
        checked={layout.maxHeight !== null}
        onChange={on => edit('maxHeight', on ? SPOTIFY_HEIGHT : null)}
      />
      {layout.maxHeight !== null && (
        <Slider
          label="Height"
          min={SEARCH_HEIGHT_MIN}
          max={SEARCH_HEIGHT_MAX}
          step={10}
          unit="px"
          value={layout.maxHeight}
          onInput={v => edit('maxHeight', v, 'search.maxHeight')}
        />
      )}
      <div>
        <Toggle label="Hide the key hints" description="The ↑↓ and Enter bar at the top" checked={layout.hideHints} onChange={v => edit('hideHints', v)} />
        <Toggle
          label="Hide “Song •”"
          description="The type before the artist or owner. Artists keep theirs."
          checked={layout.hideTypeLabel}
          onChange={v => edit('hideTypeLabel', v)}
        />
      </div>
    </>
  )
}
