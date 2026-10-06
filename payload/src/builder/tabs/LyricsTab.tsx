// Lyrics: background, line colours, text, and how the lyrics page behaves. Edits go to theme.lyrics / theme.layout.
import { useState } from 'preact/hooks'
import { MicVocal } from 'lucide-static'
import type { FontId, LyricsStyle } from '../../types'
import { LYRICS_SCALE_MAX, LYRICS_SCALE_MIN } from '../../theme/model'
import { useApp, useEnv } from '../context'
import { autoLyricLines, type LyricLineColors } from '../lib/lyrics'
import { LYRICS_BUTTON } from '../selectors'
import { Button } from '../ui/Button'
import { ColorField } from '../ui/ColorField'
import { Section } from '../ui/Section'
import { Segmented } from '../ui/Segmented'
import { Slider } from '../ui/Slider'
import { Toggle } from '../ui/Toggle'
import { Field } from '../ui/Field'
import { FontPicker } from '../ui/FontPicker'
import { BackgroundTiles } from './lyrics/BackgroundTiles'

const LINES: readonly { key: keyof LyricLineColors; label: string; hint: string }[] = [
  { key: 'activeLine', label: 'Sung line', hint: 'The line being sung now' },
  { key: 'inactiveLine', label: 'Upcoming lines', hint: 'Lines still to come' },
  { key: 'pastLine', label: 'Sung lines', hint: 'Lines already sung' },
]

export function LyricsTab() {
  const { store } = useEnv()
  const lyrics = useApp(s => s.active.lyrics)
  const palette = useApp(s => s.active.palette)
  const keepLibrary = useApp(s => s.active.layout.lyricsKeepLibrary)
  const immersive = useApp(s => s.active.layout.lyricsImmersive)
  const nowPlaying = useApp(s => s.active.layout.lyricsNowPlaying)
  const [openLine, setOpenLine] = useState<keyof LyricLineColors | null>(null)
  const auto = autoLyricLines(lyrics.background, palette)

  const editLyrics = (mutate: (l: LyricsStyle) => void, coalesceKey?: string) => store.edit(t => mutate(t.lyrics), { coalesceKey })

  return (
    <>
      <Section
        title="Background"
        aside={
          <Button icon={MicVocal} onClick={() => document.querySelector<HTMLElement>(LYRICS_BUTTON)?.click()}>
            Show lyrics
          </Button>
        }
      >
        <BackgroundTiles />
      </Section>

      <Section title="Line colours">
        <div style={{ display: 'grid', gap: '2px', margin: '0 -8px' }}>
          {LINES.map(line => (
            <ColorField
              key={line.key}
              label={line.label}
              hint={line.hint}
              value={lyrics[line.key]}
              autoValue={auto[line.key]}
              open={openLine === line.key}
              onToggle={() => setOpenLine(openLine === line.key ? null : line.key)}
              onChange={hex =>
                store.edit(
                  t => {
                    const { [line.key]: _previous, ...rest } = t.lyrics
                    t.lyrics = hex === undefined ? rest : { ...rest, [line.key]: hex }
                  },
                  { coalesceKey: `lyrics.${line.key}` },
                )
              }
            />
          ))}
        </div>
      </Section>

      <Section title="Text">
        <Slider
          label="Size"
          min={LYRICS_SCALE_MIN * 100}
          max={LYRICS_SCALE_MAX * 100}
          step={5}
          unit="%"
          value={Math.round(lyrics.fontScale * 100)}
          onInput={v =>
            editLyrics(l => {
              l.fontScale = v / 100
            }, 'lyrics.fontScale')
          }
        />
        <Field label="Font">
          <FontPicker<FontId | 'theme'>
            label="Lyrics font"
            value={lyrics.font}
            withTheme
            onChange={v =>
              editLyrics(l => {
                l.font = v
              })
            }
          />
        </Field>
        <Field label="Alignment">
          <Segmented<LyricsStyle['align']>
            label="Alignment"
            value={lyrics.align}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Centred' },
            ]}
            onChange={v =>
              editLyrics(l => {
                l.align = v
              })
            }
          />
        </Field>
      </Section>

      <Section title="Lyrics page">
        <Toggle
          label="Keep library visible"
          description="Spotify hides your library while lyrics are open"
          checked={keepLibrary}
          onChange={v =>
            store.edit(t => {
              t.layout.lyricsKeepLibrary = v
            })
          }
        />
        <Toggle
          label="Now playing column"
          description="Cover, song and what's up next beside the lyrics"
          checked={nowPlaying}
          onChange={v =>
            store.edit(t => {
              t.layout.lyricsNowPlaying = v
            })
          }
        />
        <Toggle
          label="Immersive lyrics"
          description="Top bar and player fade away until you move the mouse over them"
          checked={immersive}
          onChange={v =>
            store.edit(t => {
              t.layout.lyricsImmersive = v
            })
          }
        />
      </Section>
    </>
  )
}
