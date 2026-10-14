// Pure maths for arranging bar layers with the pointer and keys: pixels on screen in, layer values (% of the bar) out.
import type { BarLayer } from '../../types'
import { BAR_LAYER_SIZE, BAR_LAYER_X, BAR_LAYER_Y } from '../../theme/model'

export interface Size {
  width: number
  height: number
}
export interface Box {
  id: string
  rect: { left: number; top: number; right: number; bottom: number }
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const tenth = (v: number) => Math.round(v * 10) / 10
const sizeRange = (layer: BarLayer) => (layer.fit === 'fill' ? BAR_LAYER_SIZE.fill : BAR_LAYER_SIZE.free)

/**
 * How far a fill layer's picture can pan, in px per axis: what sticks out past the bar once it covers the bar and is
 * zoomed (zoom scales around the focus point, which adds its own slack).
 */
function fillSlack(bar: Size, picture: Size, zoom: number): Size {
  const cover = Math.max(bar.width / picture.width, bar.height / picture.height)
  return {
    width: picture.width * cover - bar.width + bar.width * (zoom - 1),
    height: picture.height * cover - bar.height + bar.height * (zoom - 1),
  }
}

/** The layer's position after the pointer moved by (dx, dy) px since the drag started at `layer`'s position. */
export function dragLayer(layer: BarLayer, dx: number, dy: number, bar: Size, picture?: Size): { x: number; y: number } {
  if (layer.fit === 'fill') {
    // object-position: x % aligns that point of the picture with that point of the bar, so dragging right lowers it.
    const slack = picture ? fillSlack(bar, picture, layer.size / 100) : { width: 0, height: 0 }
    const pan = (v: number, d: number, room: number) => (room > 0.5 ? clamp(v - (d / room) * 100, 0, 100) : v)
    return { x: tenth(pan(layer.x, dx, slack.width)), y: tenth(pan(layer.y, dy, slack.height)) }
  }
  return {
    x: tenth(clamp(layer.x + (dx / bar.width) * 100, BAR_LAYER_X.min, BAR_LAYER_X.max)),
    y: tenth(clamp(layer.y + (dy / bar.height) * 100, BAR_LAYER_Y.min, BAR_LAYER_Y.max)),
  }
}

/** Corner drag: the size scales with the pointer's distance from the layer's centre (the shape is kept). */
export function resizeLayer(layer: BarLayer, startSize: number, startDistance: number, distance: number): number {
  const range = sizeRange(layer)
  return tenth(clamp(startSize * (distance / Math.max(1, startDistance)), range.min, range.max))
}

/** Scroll: up grows (zooms in for fill), down shrinks; proportional, so it feels the same at any size. */
export function wheelLayer(layer: BarLayer, deltaY: number): number {
  const range = sizeRange(layer)
  return tenth(clamp(layer.size * Math.exp(-deltaY * 0.0015), range.min, range.max))
}

const STEPS: Readonly<Record<string, [number, number]>> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }

/** Arrow keys: 1 % (10 % with Shift). Fill layers pan, so the picture moves the way the arrow points. */
export function nudgeLayer(layer: BarLayer, key: string, big: boolean): { x: number; y: number } {
  const [sx, sy] = STEPS[key] ?? [0, 0]
  const step = big ? 10 : 1
  if (layer.fit === 'fill') return { x: tenth(clamp(layer.x - sx * step, 0, 100)), y: tenth(clamp(layer.y - sy * step, 0, 100)) }
  return {
    x: tenth(clamp(layer.x + sx * step, BAR_LAYER_X.min, BAR_LAYER_X.max)),
    y: tenth(clamp(layer.y + sy * step, BAR_LAYER_Y.min, BAR_LAYER_Y.max)),
  }
}

const contains = (b: Box, x: number, y: number) => x >= b.rect.left && x <= b.rect.right && y >= b.rect.top && y <= b.rect.bottom

/** The layer to act on at a point: the selected one if the point is on it, else the topmost there (boxes bottom first). */
export function topLayerAt(boxes: readonly Box[], x: number, y: number, selected: string | null): string | null {
  const current = boxes.find(b => b.id === selected)
  if (current && contains(current, x, y)) return current.id
  for (let i = boxes.length - 1; i >= 0; i--) {
    if (contains(boxes[i], x, y)) return boxes[i].id
  }
  return null
}
