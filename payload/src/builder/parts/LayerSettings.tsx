// Settings for the selected picture layer: fit, placement (ranges reach past the bar's edges for free and tiled layers)
// and its own effects.
import type { BarLayer } from '../../types'
import { BAR_LAYER_BLUR_MAX, BAR_LAYER_BRIGHTNESS, BAR_LAYER_SIZE, BAR_LAYER_X, BAR_LAYER_Y } from '../../theme/model'
import { useEnv } from '../context'
import { setLayerFit, updateLayer } from '../lib/layer-edits'
import { Field } from '../ui/Field'
import { Segmented } from '../ui/Segmented'
import { Slider } from '../ui/Slider'

const FIT_OPTIONS = [
  { value: 'free', label: 'Free', title: 'Place it anywhere at any size, even partly outside the bar' },
  { value: 'fill', label: 'Fill', title: 'Cover the whole bar at any window width' },
  { value: 'tile', label: 'Tile', title: 'Repeat it along the bar' },
] as const

const FADE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'both', label: 'Both' },
] as const

export function LayerSettings({ partId, layer }: { partId: string; layer: BarLayer }) {
  const { store } = useEnv()
  const set = <K extends keyof BarLayer>(key: K, value: BarLayer[K]) =>
    store.edit(updateLayer(partId, layer.id, { [key]: value }), { coalesceKey: `layers.${partId}.${layer.id}.${key}` })
  const fill = layer.fit === 'fill'
  const x = fill ? { min: 0, max: 100 } : BAR_LAYER_X
  const y = fill ? { min: 0, max: 100 } : BAR_LAYER_Y
  const size = fill ? BAR_LAYER_SIZE.fill : BAR_LAYER_SIZE.free

  return (
    <>
      <Field label="Fit">
        <Segmented<BarLayer['fit']> label="Fit" value={layer.fit} options={FIT_OPTIONS} onChange={v => store.edit(setLayerFit(partId, layer.id, v))} />
      </Field>
      <Slider label={fill ? 'Zoom' : 'Size'} min={size.min} max={size.max} unit="%" value={Math.round(layer.size)} onInput={v => set('size', v)} />
      <Slider label="Left – right" min={x.min} max={x.max} unit="%" value={Math.round(layer.x)} onInput={v => set('x', v)} />
      <Slider label="Up – down" min={y.min} max={y.max} unit="%" value={Math.round(layer.y)} onInput={v => set('y', v)} />
      <Slider label="Opacity" min={0} max={100} unit="%" value={layer.opacity} onInput={v => set('opacity', v)} />
      <Slider label="Blur" min={0} max={BAR_LAYER_BLUR_MAX} unit="px" value={layer.blur} onInput={v => set('blur', v)} />
      <Slider
        label="Brightness"
        min={BAR_LAYER_BRIGHTNESS.min}
        max={BAR_LAYER_BRIGHTNESS.max}
        unit="%"
        value={layer.brightness}
        onInput={v => set('brightness', v)}
      />
      <Field label="Fade edges">
        <Segmented<BarLayer['fade']> label="Fade edges" value={layer.fade} options={FADE_OPTIONS} onChange={v => set('fade', v)} />
      </Field>
    </>
  )
}
