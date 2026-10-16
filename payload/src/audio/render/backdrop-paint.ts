// Paints the breathing background: a light rising from the bottom of the view, a tight core following the bass and a
// wide halo the overall loudness. Both are elliptical radial gradients in one colour, painted small (they're soft, so
// the canvas is stretched over the view without visible loss) as an alpha mask and then filled with the colour; that
// equals the two CSS gradients `color-mix(in oklab, colour N%, transparent) → transparent` stacked, for any colour
// format. Runs in the scene (worker or page).
import type { ReactiveLook } from '../../types'
import type { AudioLevels } from '../envelope'
import { amount } from '../effects/effect'
import type { PaintContext, PaintTarget } from './protocol'

/** Canvas resolution; CSS stretches it over the view. */
export const BACKDROP_WIDTH = 240
export const BACKDROP_HEIGHT = 150

/** One light: an ellipse centred at (cx, cy) with radii (rx, ry), all shares of the view; alpha fades to 0 at `stop`. */
export interface Light {
  cx: number
  cy: number
  rx: number
  ry: number
  alpha: number
  stop: number
}

/** Halo under core, as the CSS layers were stacked. */
export const HALO: Light = { cx: 0.5, cy: 1.05, rx: 0.85, ry: 0.7, alpha: 0.34, stop: 0.72 }
export const CORE: Light = { cx: 0.5, cy: 1, rx: 0.45, ry: 0.35, alpha: 0.42, stop: 0.7 }

/** Pure: the light's colour. Falls back to the accent while there's no cover yet or no custom colour picked. */
export function backdropColor(background: ReactiveLook['background'], cover: string | null, accent: string): string {
  if (background.color === 'cover') return cover ?? accent
  if (background.color === 'custom') return background.customColor ?? accent
  return accent
}

/** Pure: core and halo opacity (0–1) for the current levels at an intensity (0–100). Silence = dark. */
export function breath(bass: number, level: number, intensity: number): { core: number; halo: number } {
  const k = amount(intensity)
  return { core: Math.min(1, bass * k), halo: Math.min(1, level * level * 1.3 * k) }
}

/**
 * Pure: the canvas transform that turns the unit circle into the light's ellipse on a width × height canvas, and the
 * whole canvas expressed in that unit space (what to fill so the gradient covers every pixel).
 */
export function lightGeometry(light: Light, width: number, height: number) {
  const sx = light.rx * width
  const sy = light.ry * height
  return {
    transform: [sx, 0, 0, sy, light.cx * width, light.cy * height] as const,
    fill: { x: -light.cx / light.rx, y: -light.cy / light.ry, width: 1 / light.rx, height: 1 / light.ry },
  }
}

export interface BackdropPainter {
  paint(levels: AudioLevels, ctx: PaintContext): void
}

export function createBackdropPainter(canvas: PaintTarget): BackdropPainter {
  canvas.width = BACKDROP_WIDTH
  canvas.height = BACKDROP_HEIGHT
  const g = canvas.getContext('2d')
  // The last painted state, in 8-bit steps (what the canvas can show anyway): unchanged frames aren't repainted.
  let painted = { core: 0, halo: 0, color: '' }

  const mask = (light: Light, opacity: number) => {
    if (!g || opacity <= 0) return
    const { transform, fill } = lightGeometry(light, BACKDROP_WIDTH, BACKDROP_HEIGHT)
    g.setTransform(...transform)
    const gradient = g.createRadialGradient(0, 0, 0, 0, 0, 1)
    gradient.addColorStop(0, `rgba(0, 0, 0, ${light.alpha})`)
    gradient.addColorStop(light.stop, 'rgba(0, 0, 0, 0)')
    g.globalAlpha = opacity
    g.fillStyle = gradient
    g.fillRect(fill.x, fill.y, fill.width, fill.height)
  }

  return {
    paint(levels, ctx) {
      if (!g) return
      const b = breath(levels.bass, levels.level, ctx.look.background.intensity)
      const next = { core: Math.round(b.core * 255), halo: Math.round(b.halo * 255), color: backdropColor(ctx.look.background, ctx.cover, ctx.accent) }
      const dark = next.core === 0 && next.halo === 0
      if (dark ? painted.core === 0 && painted.halo === 0 : next.core === painted.core && next.halo === painted.halo && next.color === painted.color) return
      painted = next
      g.globalCompositeOperation = 'source-over'
      g.globalAlpha = 1
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.clearRect(0, 0, BACKDROP_WIDTH, BACKDROP_HEIGHT)
      if (dark) return
      mask(HALO, next.halo / 255)
      mask(CORE, next.core / 255)
      g.globalCompositeOperation = 'source-in'
      g.globalAlpha = 1
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.fillStyle = next.color
      g.fillRect(0, 0, BACKDROP_WIDTH, BACKDROP_HEIGHT)
      g.globalCompositeOperation = 'source-over'
    },
  }
}
