// Ways to begin without choosing eight colours: one favourite colour, the album playing now, or any image.
import { useState } from 'preact/hooks'
import { Disc3, Droplet, Image as ImageIcon } from 'lucide-static'
import type { Palette } from '../../../types'
import { useEnv } from '../../context'
import { css, useStyles } from '../../styles/sheet'
import { paletteFromColor, paletteFromImage } from '../../../theme/palette'
import { pickFile, readFileAsDataUrl } from '../../lib/files'
import { NOW_PLAYING_COVER } from '../../selectors'
import { Button } from '../../ui/Button'
import { ColorPicker } from '../../ui/color-picker/ColorPicker'
import { Icon } from '../../ui/Icon'

const styles = css`
  .b-from {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }
  .b-from__opt {
    display: grid;
    justify-items: center;
    gap: 6px;
    padding: 12px 6px 10px;
    border-radius: var(--b-r-md);
    box-shadow: inset 0 0 0 1px var(--b-line);
    font-size: 12px;
    font-weight: 500;
    text-align: center;
    transition: background var(--b-fast) var(--b-ease);
  }
  .b-from__opt:hover,
  .b-from__opt[aria-expanded='true'] {
    background: var(--b-hover);
  }
  .b-from__opt:disabled {
    opacity: 0.5;
    cursor: progress;
  }
  .b-from__opt .b-icon {
    color: var(--b-accent);
  }
  .b-from__panel {
    display: grid;
    gap: 12px;
    padding: 12px;
    border-radius: var(--b-r-md);
    background: var(--b-hover);
  }
  .b-from__error {
    color: var(--b-warn);
    font-size: 12px;
  }
`

function currentCoverUrl(): string | null {
  const img = document.querySelector(NOW_PLAYING_COVER)
  return img instanceof HTMLImageElement ? img.currentSrc || img.src : null
}

export function StartFrom() {
  useStyles(styles)
  const { store } = useEnv()
  const [colorOpen, setColorOpen] = useState(false)
  const [seed, setSeed] = useState('#3574f0')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apply = (palette: Palette) => store.edit(t => {
    t.palette = palette
  })

  const fromImage = async (load: () => Promise<string | null>, missing: string) => {
    setError(null)
    setBusy(true)
    try {
      const src = await load()
      if (src) apply(await paletteFromImage(src))
      else if (missing) setError(missing)
    } catch {
      setError('Couldn’t read colours from that picture. Try another one.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div class="b-from">
        <button type="button" class="b-from__opt" aria-expanded={colorOpen} onClick={() => setColorOpen(!colorOpen)}>
          <Icon svg={Droplet} size={18} />
          One colour
        </button>
        <button type="button" class="b-from__opt" disabled={busy} onClick={() => void fromImage(() => Promise.resolve(currentCoverUrl()), 'Play something first, then try again.')}>
          <Icon svg={Disc3} size={18} />
          Album playing
        </button>
        <button
          type="button"
          class="b-from__opt"
          disabled={busy}
          onClick={() =>
            void fromImage(async () => {
              const file = await pickFile('image/*')
              return file ? readFileAsDataUrl(file) : null
            }, '')
          }
        >
          <Icon svg={ImageIcon} size={18} />
          A picture
        </button>
      </div>
      {error && (
        <div class="b-from__error" role="alert">
          {error}
        </div>
      )}
      {colorOpen && (
        <div class="b-from__panel">
          <span class="b-hint">Pick a colour you love. We’ll build a readable theme around it.</span>
          <ColorPicker value={seed} onChange={setSeed} />
          <Button variant="primary" onClick={() => apply(paletteFromColor(seed))}>
            Build my theme
          </Button>
        </div>
      )}
    </>
  )
}
