// Spectrum, page side: our canvas sits right before Spotify's progress bar (so the bar paints over it) and never takes
// pointer events: seeking, dragging and hover keep working. The scene paints it (render/spectrum-paint.ts); this keeps
// it in place and tells the scene its size and how much of the song has played.
import { SPECTRUM_HEIGHT } from '../render/spectrum-paint'
import { PROGRESS, PROGRESS_BAR, PROGRESS_SLOT } from '../selectors'
import type { PaintPort, ReactiveEffect } from './effect'

const CANVAS_ID = 'sc-rx-spectrum'

export const spectrumCss = `
${PROGRESS_SLOT} { position: relative; }
#${CANVAS_ID} {
  position: absolute; left: 0; right: 0; top: calc(50% - ${SPECTRUM_HEIGHT / 2}px); height: ${SPECTRUM_HEIGHT}px; width: 100%;
  pointer-events: none;
}`

/** Played share from Spotify's inline "--progress-bar-transform: 42.5%"; 0 when unknown. */
export function playedShare(raw: string): number {
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n / 100)) : 0
}

export function startSpectrum(paint: PaintPort): ReactiveEffect {
  const canvas = Object.assign(document.createElement('canvas'), { id: CANVAS_ID })
  canvas.setAttribute('aria-hidden', 'true')
  paint.attach('spectrum', canvas)
  let bar: HTMLElement | null = null

  const sizes = new ResizeObserver(() => paint.size('spectrum', canvas.clientWidth, SPECTRUM_HEIGHT, window.devicePixelRatio || 1))
  sizes.observe(canvas)
  const readPlayed = () => paint.played(playedShare(bar?.style.getPropertyValue('--progress-bar-transform') ?? ''))
  // Spotify rewrites the share about once a second; only the bar's own style attribute is watched.
  const progress = new MutationObserver(readPlayed)

  const heal = () => {
    const slot = document.querySelector(PROGRESS)
    if (slot && canvas.nextElementSibling !== slot) slot.before(canvas)
    const next = slot?.querySelector<HTMLElement>(PROGRESS_BAR) ?? null
    if (next === bar) return
    bar = next
    progress.disconnect()
    if (bar) progress.observe(bar, { attributes: true, attributeFilter: ['style'] })
    readPlayed()
  }

  heal()
  return {
    heal,
    dispose() {
      sizes.disconnect()
      progress.disconnect()
      paint.detach('spectrum')
      canvas.remove()
    },
  }
}
