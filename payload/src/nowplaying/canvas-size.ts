// How wide a Canvas encoding to load for the hero. Canvases are portrait (9:16) and cover the hero (object-fit: cover),
// so a tall hero (the column without Up next) needs more video width than its own: sized by width alone, the video was
// stretched past its pixels and looked soft, most of all as a still frame while the song is paused.
const CANVAS_ASPECT = 9 / 16

/** Pure: the encoding width (device pixels) that covers a box of width × height CSS pixels. */
export function canvasWidthFor(width: number, height: number, dpr: number): number {
  return Math.round(Math.max(width, height * CANVAS_ASPECT) * dpr)
}
