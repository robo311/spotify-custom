// Spectrum: the song's live frequency bands drawn along the progress bar, rising out of its line. A canvas of ours
// sits right before Spotify's bar (so the bar paints over it) and never takes pointer events: seeking, dragging and
// hover keep working. The played part is drawn solid, the rest faded, so it still reads as progress.
// Shapes: bars, mirrored bars, a line, LED-meter blocks, and bars with falling peak caps.
import type { ReactiveLook } from '../../types'
import { AUDIO_BANDS } from '../frame'
import type { AudioLevels } from '../envelope'
import { PROGRESS, PROGRESS_BAR, PROGRESS_SLOT } from '../selectors'
import { amount, type EffectContext, type ReactiveEffect } from './effect'

const CANVAS_ID = 'sc-rx-spectrum'
/** Canvas height; centred on the bar line, so bars can rise HEIGHT / 2 above it (into the gap under the buttons). */
const HEIGHT = 36
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

export const spectrumCss = `
${PROGRESS_SLOT} { position: relative; }
#${CANVAS_ID} {
  position: absolute; left: 0; right: 0; top: calc(50% - ${HEIGHT / 2}px); height: ${HEIGHT}px; width: 100%;
  pointer-events: none;
}`

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

/** Played share from Spotify's inline "--progress-bar-transform: 42.5%"; 0 when unknown. */
export function playedShare(raw: string): number {
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n / 100)) : 0
}

export function startSpectrum(): ReactiveEffect {
  const canvas = Object.assign(document.createElement('canvas'), { id: CANVAS_ID })
  canvas.setAttribute('aria-hidden', 'true')
  const g = canvas.getContext('2d')
  let bar: HTMLElement | null = null
  let bars: Bar[] = []
  let width = 0
  let dpr = 1
  const peaks: Peak[] = Array.from({ length: AUDIO_BANDS }, () => ({ value: 0, heldMs: 0 }))
  let lastDraw = performance.now()

  const resize = () => {
    dpr = window.devicePixelRatio || 1
    width = canvas.clientWidth
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(HEIGHT * dpr)
    bars = layoutBars(width)
  }
  const sizes = new ResizeObserver(resize)
  sizes.observe(canvas)

  const heal = () => {
    const progress = document.querySelector(PROGRESS)
    if (progress && canvas.nextElementSibling !== progress) progress.before(canvas)
    bar = progress?.querySelector<HTMLElement>(PROGRESS_BAR) ?? null
  }

  const draw = (levels: AudioLevels, look: ReactiveLook, color: string, reducedMotion: boolean) => {
    if (!g || width === 0) return
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, width, HEIGHT)
    if (levels.level < SILENT && levels.bands.every(v => v < SILENT)) return // paused: leave Spotify's bar alone
    const mid = HEIGHT / 2
    const played = playedShare(bar?.style.getPropertyValue('--progress-bar-transform') ?? '') * width
    g.fillStyle = color
    g.strokeStyle = color
    // Reduced motion: a still strip whose strength follows the music, instead of moving bars.
    const value = (i: number) => (reducedMotion ? 0.3 : levels.bands[i])
    const strength = reducedMotion ? 0.25 + 0.6 * levels.level : 1

    if (look.spectrum.shape === 'line') {
      g.lineWidth = 1.5
      g.lineJoin = 'round'
      for (const part of [{ from: 0, to: played, alpha: 1 }, { from: played, to: width, alpha: UNPLAYED_ALPHA }]) {
        g.save()
        g.beginPath()
        g.rect(part.from, 0, part.to - part.from, HEIGHT)
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

    const now = performance.now()
    const dt = Math.min(100, now - lastDraw) // a long gap (paused, hidden) shouldn't drop every cap at once
    lastDraw = now
    bars.forEach((b, i) => {
      const h = Math.max(1, reach(value(i), mid - 1, look.spectrum.intensity))
      g.globalAlpha = (b.x + b.width / 2 <= played ? 1 : UNPLAYED_ALPHA) * strength
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

  heal()
  return {
    update(levels, ctx: EffectContext) {
      draw(levels, ctx.look, ctx.look.spectrum.color === 'cover' && ctx.cover ? ctx.cover : ctx.accent, ctx.reducedMotion)
    },
    heal,
    dispose() {
      sizes.disconnect()
      canvas.remove()
    },
  }
}
