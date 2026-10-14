// Pure: how one layer is drawn. Free layers are an <img> placed by its centre at a height relative to the bar (so they
// can poke out past any edge, clipped by the container); fill layers are an <img> covering the bar, zoomed around a
// focus point; tile layers repeat the picture along the bar. Effects are per layer.
import type { BarLayer } from '../types'

export type Declarations = Record<string, string>

const FADES: Record<Exclude<BarLayer['fade'], 'none'>, string> = {
  left: 'linear-gradient(to right, transparent, #000 40%)',
  right: 'linear-gradient(to left, transparent, #000 40%)',
  both: 'linear-gradient(to right, transparent, #000 20%, #000 80%, transparent)',
}

/** The container: fills the bar under its content, clips what pokes out, never takes the pointer. */
export const CONTAINER_STYLE: Declarations = {
  position: 'absolute',
  inset: '0',
  'z-index': '-1',
  overflow: 'hidden',
  'pointer-events': 'none',
  'border-radius': 'inherit',
  // cqw/cqh: tile offsets are relative to the bar, which background-position percentages can't express.
  'container-type': 'size',
}

/** The element a layer needs: a picture element for free and fill, a background-painted box for tile. */
export const layerTag = (layer: BarLayer): 'img' | 'div' => (layer.fit === 'tile' ? 'div' : 'img')

const n = (v: number) => String(Math.round(v * 100) / 100)

function effects(layer: BarLayer): Declarations {
  const filters = [layer.blur > 0 && `blur(${layer.blur}px)`, layer.brightness !== 100 && `brightness(${layer.brightness}%)`].filter(Boolean)
  return {
    ...(layer.opacity < 100 ? { opacity: n(layer.opacity / 100) } : {}),
    ...(filters.length > 0 ? { filter: filters.join(' ') } : {}),
    ...(layer.fade !== 'none' ? { 'mask-image': FADES[layer.fade] } : {}),
  }
}

/** Inline styles for one layer's element; `url` is the picture (tile paints it as a background). */
export function layerStyle(layer: BarLayer, url: string): Declarations {
  const base: Declarations = { position: 'absolute', display: 'block', 'max-width': 'none', 'user-select': 'none' }
  switch (layer.fit) {
    case 'free':
      return {
        ...base,
        left: `${n(layer.x)}%`,
        top: `${n(layer.y)}%`,
        height: `${n(layer.size)}%`,
        width: 'auto',
        translate: '-50% -50%',
        ...effects(layer),
      }
    case 'fill': {
      // Blur bleeds transparent fringes in from the edges: grow past them; the container clips back to the bar.
      const bleed = layer.blur * 2
      return {
        ...base,
        inset: bleed > 0 ? `-${bleed}px` : '0',
        width: bleed > 0 ? `calc(100% + ${bleed * 2}px)` : '100%',
        height: bleed > 0 ? `calc(100% + ${bleed * 2}px)` : '100%',
        'object-fit': 'cover',
        'object-position': `${n(layer.x)}% ${n(layer.y)}%`,
        ...(layer.size !== 100 ? { scale: n(layer.size / 100), 'transform-origin': `${n(layer.x)}% ${n(layer.y)}%` } : {}),
        ...effects(layer),
      }
    }
    case 'tile':
      return {
        ...base,
        inset: '0',
        'background-image': `url("${url.replace(/["\\\n]/g, encodeURIComponent)}")`,
        'background-repeat': 'repeat-x',
        'background-size': `auto ${n(layer.size)}cqh`,
        'background-position': `${n(layer.x)}cqw calc(${n(layer.y)}cqh - ${n(layer.size / 2)}cqh)`,
        ...effects(layer),
      }
  }
}

export function toCssText(decls: Declarations): string {
  return Object.entries(decls)
    .map(([prop, value]) => `${prop}: ${value}`)
    .join('; ')
}
