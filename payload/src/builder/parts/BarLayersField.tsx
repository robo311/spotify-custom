// Picture layers behind a bar (top bar, player bar): up to five, combined bottom to top. Add, select, hide, reorder and
// delete them here; the selected one's settings show below; Arrange moves and resizes them on the real bar.
import { useState } from 'preact/hooks'
import { ImagePlus, Move, Replace } from 'lucide-static'
import type { BarLayer } from '../../types'
import { bannerToDataUrl, pictureBudget } from '../../art'
import { BAR_LAYER_MAX_CHARS, BAR_LAYERS_MAX, defaultBarLayer } from '../../theme/model'
import { useApp, useEnv, useUi } from '../context'
import { css, useStyles } from '../styles/sheet'
import { pickFile } from '../lib/files'
import { addLayer, layersOf, moveLayer, nextLayerId, removeLayer, updateLayer, uploadedChars, type LayerRef } from '../lib/layer-edits'
import { lookup } from '../lib/record'
import { Button } from '../ui/Button'
import { LayerRow } from './LayerRow'
import { LayerSettings } from './LayerSettings'

const styles = css`
  .b-layers {
    display: grid;
    gap: 10px;
  }
  .b-layers__list {
    display: grid;
    gap: 2px;
  }
  .b-layers__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .b-layers__error {
    color: var(--b-warn);
    font-size: 12px;
  }
`

/** The bar's height in Spotify (px) and the picture size to suggest: wide, with room to move it up and down. */
const BAR_SIZES: Partial<Record<string, { height: number; suggest: string }>> = {
  topBar: { height: 64, suggest: '2400 × 160 px' },
  playerBar: { height: 72, suggest: '2400 × 180 px' },
}

const ACCEPT = 'image/png, image/jpeg, image/webp, image/gif, image/avif'
const NO_LAYERS: BarLayer[] = []

/** "moon.png" → "moon". */
const nameOf = (file: File) => file.name.replace(/\.[^.]+$/, '').trim() || 'Picture'

export function BarLayersField({ partId }: { partId: string }) {
  useStyles(styles)
  const { store, ui } = useEnv()
  const layers = useApp(s => lookup(s.active.parts, partId)?.layers ?? NO_LAYERS)
  const selectedId = useUi(s => (s.layer?.part === partId ? s.layer.id : null))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const size = BAR_SIZES[partId]
  const selected = layers.find(l => l.id === selectedId)

  const select = (id: string) => ui.set(s => ({ ...s, layer: { part: partId, id } }))

  /** Upload a picture: as a new layer on top, or into `replacing` (keeping its placement and effects). */
  const upload = async (replacing?: LayerRef) => {
    setError(null)
    const file = await pickFile(ACCEPT)
    if (!file) return
    const budget = pictureBudget(uploadedChars(store.get().active, replacing))
    if (budget === null) {
      setError('There’s no room for another picture in this theme. Remove one, or use built-in art.')
      return
    }
    setBusy(true)
    try {
      const data = await bannerToDataUrl(file, budget)
      if (data.length > BAR_LAYER_MAX_CHARS) {
        setError('That picture is too detailed to keep in a theme. Try a smaller or simpler one.')
        return
      }
      if (replacing) {
        store.edit(updateLayer(partId, replacing.id, { src: { data }, name: nameOf(file) }))
        return
      }
      const current = layersOf(store.get().active, partId)
      const id = nextLayerId(current)
      // The first picture fills the bar; later ones are things to place on it.
      const fit = current.length === 0 ? 'fill' : 'free'
      store.edit(addLayer(partId, { ...defaultBarLayer(id), name: nameOf(file), src: { data }, fit }))
      select(id)
    } catch {
      setError('That picture couldn’t be read. Try a JPG, PNG or WebP.')
    } finally {
      setBusy(false)
    }
  }

  const topFirst = [...layers].reverse()

  return (
    <div class="b-layers">
      {layers.length > 0 && (
        <div class="b-layers__list" role="list" aria-label="Pictures, top first">
          {topFirst.map(layer => (
            <div role="listitem" key={layer.id}>
              <LayerRow
                layer={layer}
                selected={layer.id === selectedId}
                first={layer === layers[0]}
                last={layer === layers[layers.length - 1]}
                onSelect={() => select(layer.id)}
                onToggleHidden={() => store.edit(updateLayer(partId, layer.id, { hidden: !layer.hidden }))}
                onMove={step => store.edit(moveLayer(partId, layer.id, step))}
                onDelete={() => store.edit(removeLayer(partId, layer.id))}
              />
            </div>
          ))}
        </div>
      )}
      <div class="b-layers__actions">
        <Button icon={ImagePlus} data-tour="add-picture" disabled={busy || layers.length >= BAR_LAYERS_MAX} onClick={() => void upload()}>
          {busy ? 'Preparing…' : 'Add picture'}
        </Button>
        {layers.some(l => !l.hidden) && (
          <Button icon={Move} data-tour="arrange" onClick={() => ui.set(s => ({ ...s, picking: false, arranging: partId }))}>
            Arrange on the bar
          </Button>
        )}
      </div>
      {error && (
        <div class="b-layers__error" role="alert">
          {error}
        </div>
      )}
      {size && (
        <span class="b-hint">
          Best: wide pictures, at least {size.suggest}. The bar shows a {size.height} px strip ({size.height * 2} px on sharp
          screens); bigger pictures are scaled down to 2560 px wide. Up to {BAR_LAYERS_MAX} pictures: the first fills the
          bar, the rest go on top where you place them.
        </span>
      )}
      {selected && (
        <>
          <span class="b-label">{selected.name}</span>
          <LayerSettings partId={partId} layer={selected} />
          <div class="b-layers__actions">
            <Button icon={Replace} disabled={busy} onClick={() => void upload({ part: partId, id: selected.id })}>
              Replace picture
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
