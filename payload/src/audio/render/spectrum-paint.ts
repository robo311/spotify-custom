// Paints the spectrum: the song's live frequency bands rising out of the progress bar's line. The played part is
// solid, the rest faded, so it still reads as progress. Shapes: bars, mirrored bars, a line, LED-meter blocks, and
// bars with falling peak caps. Runs in the scene (worker or page); geometry is pure.
import type { ReactiveLook } from '../../types'
import { AUDIO_BANDS } from '../frame'
import type { AudioLevels } from '../envelope'
import { amount } from '../effects/effect'
import type { PaintContext, PaintTarget } from './protocol'

/** Canvas height; centred on the bar line, so bars can rise HEIGHT / 2 above it (into the gap under the buttons). */
export const SPECTRUM_HEIGHT = 36
const GAP = 3
const UNPLAYED_ALPHA = 0.38
const SILENT = 0.004
/** Blocks: LED-meter segments, BLOCK px tall with BLOCK_GAP between them. */
const BLOCK = 3
const BLOCK_GAP = 1
/** Peaks: a cap PEAK_CAP px tall that hangs at the band's recent high, then falls at PEAK_FALL (share of full height per second). */
const PEAK_CAP = 2
export const PEAK_HOLD_MS = 300
const PEAK_FALL = 1.2

export interface Bar {
  x: number
  width: number
}

/** Pure: AUDIO_BANDS bars spread over width with GAP between them (fractional widths are fine on a canvas). */
export function layoutBars(width: number, count = AUDIO_BANDS, gap = GAP): Bar[] {
  const barWidth = Math.max(1, (width - gap * (count - 1)) / count)
  return Array.from({ length: count }, (_, i) => ({ x: i * (barWidth + gap), width: barWidth }))
}

/** Pure: how far a band reaches from the line (px), given the room available and the intensity (0–100). */
export function reach(value: number, room: number, intensity: number): number {
  return Math.min(room, value * room * (0.35 + 0.65 * amount(intensity)))
}

/** Pure: how many whole blocks fit in a reach of `height` px (a partial block stays dark, like a real meter). */
export function litBlocks(height: number): number {
  return Math.max(0, Math.floor((height + BLOCK_GAP) / (BLOCK + BLOCK_GAP)))
}

export interface Peak {
  value: number // 0–1, same scale as the band
  heldMs: number // time since it was last pushed up
}

/** Pure: a peak cap jumps up with its band, hangs for PEAK_HOLD_MS, then falls, never below the band. */
export function stepPeak(peak: Peak, value: number, dtMs: number): Peak {
  if (value >= peak.value) return { value, heldMs: 0 }
  const heldMs = peak.heldMs + dtMs
  const fallingMs = Math.min(dtMs, heldMs - PEAK_HOLD_MS)
  if (fallingMs <= 0) return { value: peak.value, heldMs }
  return { value: Math.max(value, peak.value - (PEAK_FALL * fallingMs) / 1000), heldMs }
}

export interface SpectrumPainter {
  size(width: number, dpr: number): void
  played(share: number): void
  /** dtMs: time since the last paint (for the falling peak caps). */
  paint(levels: AudioLevels, ctx: PaintContext, dtMs: number): void
}

export function createSpectrumPainter(canvas: PaintTarget): SpectrumPainter {
  const g = canvas.getContext('2d')
  let bars: Bar[] = []
  let width = 0
  let dpr = 1
  let played = 0
  let blank = true
  const peaks: Peak[] = Array.from({ length: AUDIO_BANDS }, () => ({ value: 0, heldMs: 0 }))

  const draw = (levels: AudioLevels, look: ReactiveLook, color: string, reducedMotion: boolean, dtMs: number) => {
    if (!g || width === 0) return
    const silent = levels.level < SILENT && levels.bands.every(v => v < SILENT)
    if (silent && blank) return // nothing to clear: no new frame
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, width, SPECTRUM_HEIGHT)
    blank = silent
    if (silent) return // paused: leave Spotify's bar alone
    const mid = SPECTRUM_HEIGHT / 2
    const playedX = played * width
    g.fillStyle = color
    g.strokeStyle = color
    // Reduced motion: a still strip whose strength follows the music, instead of moving bars.
    const value = (i: number) => (reducedMotion ? 0.3 : levels.bands[i])
    const strength = reducedMotion ? 0.25 + 0.6 * levels.level : 1

    if (look.spectrum.shape === 'line') {
      g.lineWidth = 1.5
      g.lineJoin = 'round'
      for (const part of [{ from: 0, to: playedX, alpha: 1 }, { from: playedX, to: width, alpha: UNPLAYED_ALPHA }]) {
        g.save()
        g.beginPath()
        g.rect(part.from, 0, part.to - part.from, SPECTRUM_HEIGHT)
        g.clip()
        g.globalAlpha = part.alpha * strength
        g.beginPath()
        bars.forEach((b, i) => {
          const y = mid - reach(value(i), mid - 1, look.spectrum.intensity)
          if (i === 0) g.moveTo(b.x + b.width / 2, y)
          else g.lineTo(b.x + b.width / 2, y)
        })
        g.stroke()
        g.restore()
      }
      return
    }

    const dt = Math.min(100, dtMs) // a long gap (paused, hidden) shouldn't drop every cap at once
    bars.forEach((b, i) => {
      const h = Math.max(1, reach(value(i), mid - 1, look.spectrum.intensity))
      g.globalAlpha = (b.x + b.width / 2 <= playedX ? 1 : UNPLAYED_ALPHA) * strength
      switch (look.spectrum.shape) {
        case 'mirror':
          g.fillRect(b.x, mid - h, b.width, h * 2)
          break
        case 'blocks':
          for (let k = 0; k < litBlocks(h); k++) g.fillRect(b.x, mid - (k + 1) * BLOCK - k * BLOCK_GAP, b.width, BLOCK)
          break
        case 'peaks': {
          g.fillRect(b.x, mid - h, b.width, h)
          peaks[i] = stepPeak(peaks[i], value(i), dt)
          const cap = reach(peaks[i].value, mid - 1, look.spectrum.intensity)
          if (cap > h + PEAK_CAP) g.fillRect(b.x, mid - cap - PEAK_CAP, b.width, PEAK_CAP)
          break
        }
        default:
          g.fillRect(b.x, mid - h, b.width, h)
      }
    })
  }

  return {
    size(cssWidth, ratio) {
      dpr = ratio
      width = cssWidth
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(SPECTRUM_HEIGHT * dpr) // resizing clears the canvas
      blank = true
      bars = layoutBars(width)
    },
    played(share) {
      played = share
    },
    paint(levels, ctx, dtMs) {
      const color = ctx.look.spectrum.color === 'cover' && ctx.cover ? ctx.cover : ctx.accent
      draw(levels, ctx.look, color, ctx.reducedMotion, dtMs)
    },
  }
}
