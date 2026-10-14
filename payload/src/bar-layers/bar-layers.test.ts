import { describe, expect, it } from 'vitest'
import type { BarLayer, PartStyle } from '../types'
import { defaultBarLayer } from '../theme/model'
import { compileRecipe, PART_RECIPES } from '../parts/registry'
import { startBarLayers } from './runtime'
import { layerStyle } from './style'

const PNG = 'data:image/png;base64,iVBORw0KGgo='
const layer = (over: Partial<BarLayer> = {}): BarLayer => ({ ...defaultBarLayer('a'), src: { data: PNG }, ...over })

describe('layerStyle', () => {
  it('places a free layer by its centre at a height relative to the bar, so it can poke out past the edges', () => {
    expect(layerStyle(layer({ fit: 'free', x: -20, y: 180, size: 250 }), PNG)).toMatchObject({
      position: 'absolute', left: '-20%', top: '180%', height: '250%', width: 'auto', translate: '-50% -50%',
    })
  })

  it('covers the bar for fill, zooming around the focus point', () => {
    const style = layerStyle(layer({ fit: 'fill', x: 80, y: 30, size: 150 }), PNG)
    expect(style).toMatchObject({ 'object-fit': 'cover', 'object-position': '80% 30%', scale: '1.5', 'transform-origin': '80% 30%', inset: '0' })
    expect(layerStyle(layer({ fit: 'fill' }), PNG)).not.toHaveProperty('scale')
  })

  it('repeats a tile along the bar at its height, offset relative to the bar', () => {
    expect(layerStyle(layer({ fit: 'tile', x: 10, y: 50, size: 80 }), PNG)).toMatchObject({
      'background-image': `url("${PNG}")`,
      'background-repeat': 'repeat-x',
      'background-size': 'auto 80cqh',
      'background-position': '10cqw calc(50cqh - 40cqh)',
    })
  })

  it('applies each layer’s own effects only when changed', () => {
    expect(layerStyle(layer({ opacity: 40, blur: 3, brightness: 70, fade: 'both' }), PNG)).toMatchObject({
      opacity: '0.4',
      filter: 'blur(3px) brightness(70%)',
      'mask-image': 'linear-gradient(to right, transparent, #000 20%, #000 80%, transparent)',
      inset: '-6px', // blur bleed
    })
    const plain = layerStyle(layer(), PNG)
    expect(plain).not.toHaveProperty('filter')
    expect(plain).not.toHaveProperty('opacity')
  })
})

describe('bar host rule', () => {
  const topBar = PART_RECIPES.find(r => r.id === 'topBar') ?? PART_RECIPES[0]

  it('positions and isolates the bar only while it has a visible layer', () => {
    expect(compileRecipe(topBar, { layers: [layer()] })).toContain('position: relative !important')
    expect(compileRecipe(topBar, { layers: [layer({ hidden: true })] })).toBe('')
  })
})

describe('startBarLayers', () => {
  const frame = () => new Promise(r => requestAnimationFrame(() => r(null)))
  function setup(parts: Record<string, PartStyle>) {
    document.body.innerHTML = '<div data-testid="global-nav-bar"><button>Home</button></div><aside data-testid="now-playing-bar"></aside>'
    let current = parts
    const controller = startBarLayers(() => current)
    return {
      controller,
      set(next: Record<string, PartStyle>) {
        current = next
        controller.refresh()
      },
      layers: (bar = '[data-testid="global-nav-bar"]') => [...document.querySelectorAll(`${bar} > .sc-bar-layers > *`)],
    }
  }

  it('puts visible layers first inside their bar, bottom first, never taking the pointer', () => {
    const { layers } = setup({ topBar: { layers: [layer({ id: 'sky' }), layer({ id: 'moon', fit: 'free' }), layer({ id: 'off', hidden: true })] } })
    const bar = document.querySelector('[data-testid="global-nav-bar"]')
    expect(bar?.firstElementChild?.className).toBe('sc-bar-layers')
    expect(layers().map(el => el.getAttribute('data-sc-layer'))).toEqual(['sky', 'moon'])
    expect((bar?.firstElementChild as HTMLElement).style.pointerEvents).toBe('none')
    expect(layers('[data-testid="now-playing-bar"]')).toEqual([])
  })

  it('reuses elements when layers move or swap, and reorders them', async () => {
    const t = setup({ topBar: { layers: [layer({ id: 'a' }), layer({ id: 'b' })] } })
    const [a, b] = t.layers()
    t.set({ topBar: { layers: [layer({ id: 'b', x: 10 }), layer({ id: 'a' })] } })
    await frame()
    expect(t.layers()).toEqual([b, a])
    expect((b as HTMLImageElement).style.objectPosition).toBe('10% 50%')
  })

  it('puts the layers back when Spotify re-renders the bar’s children', async () => {
    const t = setup({ topBar: { layers: [layer()] } })
    const bar = document.querySelector('[data-testid="global-nav-bar"]')
    bar?.replaceChildren(document.createElement('button'))
    await frame()
    await frame()
    expect(t.layers()).toHaveLength(1)
    expect(bar?.firstElementChild?.className).toBe('sc-bar-layers')
  })

  it('removes the container when the last layer goes, and everything on dispose', async () => {
    const t = setup({ topBar: { layers: [layer()] }, playerBar: { layers: [layer()] } })
    t.set({ playerBar: { layers: [layer()] } })
    await frame()
    expect(document.querySelectorAll('.sc-bar-layers')).toHaveLength(1)
    t.controller.dispose()
    expect(document.querySelectorAll('.sc-bar-layers')).toHaveLength(0)
  })

  it('skips built-in art it does not know', () => {
    const t = setup({ topBar: { layers: [layer({ src: { builtin: 'from-the-future' } })] } })
    expect(t.layers()).toEqual([])
  })
})
