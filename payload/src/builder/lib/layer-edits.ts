// Named theme mutations for a bar's picture layers (theme.parts[bar].layers), shared by the Image section and Arrange.
import type { BarLayer, Theme } from '../../types'
import { lookup } from './record'
import { setPartProp } from './theme-edits'

export interface LayerRef {
  part: string
  id: string
}

export function layersOf(theme: Theme, partId: string): BarLayer[] {
  return lookup(theme.parts, partId)?.layers ?? []
}

/** The first `layer-N` not taken yet. */
export function nextLayerId(layers: readonly BarLayer[]): string {
  const taken = new Set(layers.map(l => l.id))
  let n = 1
  while (taken.has(`layer-${n}`)) n++
  return `layer-${n}`
}

function setLayers(partId: string, change: (layers: BarLayer[]) => BarLayer[]) {
  return (t: Theme) => {
    const next = change(layersOf(t, partId))
    setPartProp(partId, 'layers', next.length > 0 ? next : undefined)(t)
  }
}

/** Adds on top of the stack. */
export function addLayer(partId: string, layer: BarLayer) {
  return setLayers(partId, layers => [...layers, layer])
}

export function updateLayer(partId: string, id: string, patch: Partial<Omit<BarLayer, 'id'>>) {
  return setLayers(partId, layers => layers.map(l => (l.id === id ? { ...l, ...patch } : l)))
}

/** Changing the fit re-centres the layer: free/tile place by centre and height, fill by focus point and zoom. */
export function setLayerFit(partId: string, id: string, fit: BarLayer['fit']) {
  return updateLayer(partId, id, { fit, x: 50, y: 50, size: 100 })
}

/** +1 = one step up (drawn over the next layer), -1 = one step down. */
export function moveLayer(partId: string, id: string, step: 1 | -1) {
  return setLayers(partId, layers => {
    const from = layers.findIndex(l => l.id === id)
    const to = from + step
    if (from < 0 || to < 0 || to >= layers.length) return layers
    const next = [...layers]
    ;[next[from], next[to]] = [next[to], next[from]]
    return next
  })
}

export function removeLayer(partId: string, id: string) {
  return setLayers(partId, layers => layers.filter(l => l.id !== id))
}

/** Characters of uploaded pictures in the whole theme (built-in art is free), not counting the layer being replaced. */
export function uploadedChars(theme: Theme, except?: LayerRef): number {
  let total = 0
  for (const [part, style] of Object.entries(theme.parts)) {
    for (const layer of style.layers ?? []) {
      if (part === except?.part && layer.id === except.id) continue
      if ('data' in layer.src) total += layer.src.data.length
    }
  }
  return total
}
