// Top bar: the strip at the top of the window. The bar itself (where Home and search sit, which buttons show, their
// icons, its colours), then the Home button, the search box and its suggestions.
import type { LayoutConfig } from '../../types'
import { useApp, useEnv } from '../context'
import { HideToggle } from '../parts/HideToggle'
import { PartSection } from '../parts/PartSection'
import { Field } from '../ui/Field'
import { Segmented } from '../ui/Segmented'
import { SearchSuggestionsFields } from './topbar/SearchSuggestionsFields'

export function TopBarTab() {
  const { store } = useEnv()
  const searchPosition = useApp(s => s.active.layout.searchPosition)

  return (
    <>
      <PartSection partId="topBar">
        <Field label="Home and search">
          <Segmented<LayoutConfig['searchPosition']>
            label="Home and search"
            value={searchPosition}
            onChange={position =>
              store.edit(t => {
                t.layout.searchPosition = position
              })
            }
            options={[
              { value: 'left', label: 'Left' },
              { value: 'centre', label: 'Centre', title: 'Spotify’s own' },
              { value: 'right', label: 'Right' },
            ]}
          />
        </Field>
        <div>
          <HideToggle id="backForward" label="Hide back and forward" />
          <HideToggle id="whatsNew" label="Hide What’s New" />
          <HideToggle id="friendActivity" label="Hide Friend Activity" />
        </div>
      </PartSection>

      <PartSection partId="homeButton">
        <HideToggle id="topBarHome" label="Hide the Home button" />
      </PartSection>

      <PartSection partId="searchBox" />

      <PartSection partId="searchDropdown" hint="Opens while you work here, showing what’s in the search box (or your recent searches).">
        <SearchSuggestionsFields />
      </PartSection>
    </>
  )
}
