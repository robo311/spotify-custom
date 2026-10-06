// Lyrics background choice as visual tiles: each preview is a tiny lyrics screen drawn with the colours it would use.
import { useState } from 'preact/hooks'
import type { LyricsBackground } from '../../../types'
import { useApp, useEnv } from '../../context'
import { css, useStyles } from '../../styles/sheet'
import { resolveLyricLines } from '../../lib/lyrics'
import { NOW_PLAYING_COVER } from '../../selectors'
import { OptionTiles, type TileOption } from '../../ui/OptionTiles'

const styles = css`
  .b-lscreen {
    position: relative;
    display: grid;
    align-content: center;
    gap: 6px;
    height: 74px;
    padding: 0 12px;
    background: var(--bg);
  }
  .b-lscreen__cover {
    position: absolute;
    inset: -20px;
    background: var(--cover) center / cover;
    filter: blur(14px) brightness(0.55) saturate(1.3);
  }
  .b-lscreen__line {
    position: relative;
    height: 5px;
    border-radius: 3px;
    background: var(--c);
  }
  .b-lscreen__line--active {
    height: 7px;
  }
  .b-lscreen[data-align='center'] .b-lscreen__line {
    justify-self: center;
  }
`

const SPOTIFY_SAMPLE = 'linear-gradient(135deg, #a1493a 0%, #7b3d8f 55%, #2e6f7e 100%)'
const FALLBACK_COVER = 'linear-gradient(135deg, #3a3f5c, #6b4b3e)'

const TILES: readonly Omit<TileOption<LyricsBackground>, 'preview'>[] = [
  { value: 'spotify', label: 'Spotify', title: 'Spotify’s colour for each song' },
  { value: 'theme', label: 'Theme', title: 'Your theme’s background' },
  { value: 'accent', label: 'Accent', title: 'Your accent colour' },
  { value: 'cover-blur', label: 'Blurred cover', title: 'The album art, softly blurred' },
]

function currentCover(): string | null {
  const img = document.querySelector(NOW_PLAYING_COVER)
  return img instanceof HTMLImageElement && img.src ? img.src : null
}

export function BackgroundTiles() {
  useStyles(styles)
  const { store } = useEnv()
  const lyrics = useApp(s => s.active.lyrics)
  const palette = useApp(s => s.active.palette)
  const [cover] = useState(currentCover)

  const backgroundOf = (bg: LyricsBackground): string =>
    bg === 'spotify' ? SPOTIFY_SAMPLE : bg === 'theme' ? palette.background : bg === 'accent' ? palette.accent : '#111111'

  const options: TileOption<LyricsBackground>[] = TILES.map(tile => {
    const lines = resolveLyricLines({ ...lyrics, background: tile.value }, palette)
    return {
      ...tile,
      preview: (
        <span class="b-lscreen" data-align={lyrics.align} style={{ '--bg': backgroundOf(tile.value) }}>
          {tile.value === 'cover-blur' && <span class="b-lscreen__cover" style={{ '--cover': cover ? `url("${cover}")` : FALLBACK_COVER }} />}
          <span class="b-lscreen__line" style={{ '--c': lines.pastLine, width: '58%' }} />
          <span class="b-lscreen__line b-lscreen__line--active" style={{ '--c': lines.activeLine, width: '82%' }} />
          <span class="b-lscreen__line" style={{ '--c': lines.inactiveLine, width: '66%' }} />
        </span>
      ),
    }
  })

  return (
    <OptionTiles
      label="Lyrics background"
      value={lyrics.background}
      options={options}
      onChange={v =>
        store.edit(t => {
          t.lyrics.background = v
        })
      }
    />
  )
}
