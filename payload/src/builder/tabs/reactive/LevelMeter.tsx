// A small live spectrum in a recessed slot, so the user can see the helper is hearing the music. Drawn on a canvas
// from the audio engine's levels; idle (no frames) leaves it empty.
import { useEffect, useRef } from 'preact/hooks'
import { AUDIO_BANDS, reactiveMonitor } from '../../../audio'
import { css, useStyles } from '../../styles/sheet'

const HEIGHT = 28
const GAP = 2

const styles = css`
  .b-meter {
    display: block;
    width: 100%;
    height: ${HEIGHT}px;
    padding: 4px 6px;
    border-radius: var(--b-r-sm);
    background: var(--b-slot);
    box-shadow: var(--b-well-edge);
    box-sizing: border-box;
  }
  .b-meter canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
`

export function LevelMeter() {
  useStyles(styles)
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const g = canvas?.getContext('2d')
    if (!canvas || !g) return
    const color = getComputedStyle(canvas).getPropertyValue('--b-accent').trim() || '#3574f0'
    return reactiveMonitor.onLevels(levels => {
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr)
      if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr)
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, w, h)
      g.fillStyle = color
      const bar = (w - GAP * (AUDIO_BANDS - 1)) / AUDIO_BANDS
      for (let i = 0; i < AUDIO_BANDS; i++) {
        const v = Math.round(levels.bands[i] * h)
        if (v > 0) g.fillRect(i * (bar + GAP), h - v, bar, v)
      }
    })
  }, [])

  return (
    <span class="b-meter" aria-hidden="true">
      <canvas ref={ref} />
    </span>
  )
}
