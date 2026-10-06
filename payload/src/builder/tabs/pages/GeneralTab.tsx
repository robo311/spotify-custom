// Pages › General: what every kind of page shares: title typography, the big play button, and track lists
// (album, playlist and song pages, and the Popular list on artist pages).
import { Columns3 } from 'lucide-static'
import type { PageStyle } from '../../../types'
import { Button } from '../../ui/Button'
import { Field } from '../../ui/Field'
import { OptionTiles } from '../../ui/OptionTiles'
import { Section } from '../../ui/Section'
import { Segmented } from '../../ui/Segmented'
import { Toggle } from '../../ui/Toggle'
import type { PageEdit } from './groups'
import { EqualiserField } from './EqualiserField'
import { chooseColumns } from './navigation'
import { PlayingRowFields } from './PlayingRowFields'
import { ROWS } from './previews'

export function GeneralTab({ page, edit }: { page: PageStyle; edit: PageEdit }) {
  return (
    <>
      <Section title="Titles">
        <span class="b-hint">Album, playlist and song titles, and artist names.</span>
        <Field label="Title weight">
          <Segmented<PageStyle['titleWeight']>
            label="Title weight"
            value={page.titleWeight}
            onChange={v => edit('titleWeight', v)}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'regular', label: 'Regular' },
              { value: 'spotify', label: 'Spotify' },
              { value: 'black', label: 'Black' },
            ]}
          />
        </Field>
        <Field label="Letter spacing">
          <Segmented<PageStyle['titleSpacing']>
            label="Letter spacing"
            value={page.titleSpacing}
            onChange={v => edit('titleSpacing', v)}
            options={[
              { value: 'tight', label: 'Tight' },
              { value: 'spotify', label: 'Spotify' },
              { value: 'wide', label: 'Wide' },
            ]}
          />
        </Field>
        <Toggle label="Capitals" description="Title in upper case" checked={page.titleUppercase} onChange={v => edit('titleUppercase', v)} />
      </Section>

      <Section title="Play button">
        <Field label="Size">
          <Segmented<PageStyle['playSize']>
            label="Play button size"
            value={page.playSize}
            onChange={v => edit('playSize', v)}
            options={[
              { value: 'small', label: 'Small' },
              { value: 'spotify', label: 'Spotify' },
              { value: 'large', label: 'Large' },
            ]}
          />
        </Field>
        <Field label="Shape">
          <Segmented<PageStyle['playShape']>
            label="Play button shape"
            value={page.playShape}
            onChange={v => edit('playShape', v)}
            options={[
              { value: 'spotify', label: 'Circle' },
              { value: 'rounded', label: 'Rounded' },
              { value: 'pill', label: 'Pill' },
            ]}
          />
        </Field>
      </Section>

      <Section title="Track list">
        <OptionTiles label="Row style" value={page.rows} options={ROWS} columns={3} onChange={v => edit('rows', v)} />
        <Field label="Song covers">
          <Segmented<PageStyle['thumbnails']>
            label="Song covers"
            value={page.thumbnails}
            onChange={v => edit('thumbnails', v)}
            options={[
              { value: 'spotify', label: 'Spotify' },
              { value: 'square', label: 'Square' },
              { value: 'round', label: 'Round' },
              { value: 'circle', label: 'Circle' },
              { value: 'cd', label: 'CD', title: 'Round, with a hole in the middle' },
              { value: 'hidden', label: 'Hide' },
            ]}
          />
        </Field>
        <Toggle
          label="Spin the playing song’s cover"
          description="In lists with covers: playlists and an artist’s top songs. Stops while paused."
          checked={page.playingSpin}
          onChange={v => edit('playingSpin', v)}
        />
        <Field label="Numbers">
          <Segmented<PageStyle['indexStyle']>
            label="Track numbers"
            value={page.indexStyle}
            onChange={v => edit('indexStyle', v)}
            options={[
              { value: 'spotify', label: 'Spotify' },
              { value: 'accent', label: 'Accent' },
              { value: 'hidden', label: 'Hide', title: 'The play button still shows on hover' },
            ]}
          />
        </Field>
        <EqualiserField page={page} edit={edit} />
        <div>
          <Toggle label="Highlight the playing song" checked={page.playingRow} onChange={v => edit('playingRow', v)} />
          {page.playingRow && <PlayingRowFields page={page} edit={edit} />}
          <Toggle label="Hide column titles" description="The # Title Album row above the songs" checked={page.hideColumnHeader} onChange={v => edit('hideColumnHeader', v)} />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
          <span class="b-hint">Columns (album, date added, plays…) are Spotify’s own setting: right-click the column titles.</span>
          <Button icon={Columns3} onClick={chooseColumns}>
            Choose columns
          </Button>
        </div>
      </Section>
    </>
  )
}
