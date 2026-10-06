// Breathing background: a light (cover, accent or custom colour) rising from the bottom of the main view. A tight core follows
// the bass and a wide halo the overall loudness, so the light seems to swell. Its own layer, under Spotify's content
// (like Ambient Glow, which it can sit beside). Only opacity changes, through scrubbed animations: a moving or
// resizing layer under Spotify's content makes Chrome rework the layers above it every frame.
import type { ReactiveLook } from '../../types'
import { glowHost } from '../../theme/effects'
import { amount, type ReactiveEffect } from './effect'
import { scrub } from './scrub'

const LAYER_ID = 'sc-rx-backdrop'
const COLOR_VAR = '--sc-rx-backdrop-color'

export const backdropCss = `
#${LAYER_ID} { position: absolute; inset: 0; pointer-events: none; }
#${LAYER_ID} > div { position: absolute; inset: 0; opacity: 0; will-change: opacity; }
#${LAYER_ID} > .sc-rx-core {
  background: radial-gradient(45% 35% at 50% 100%, color-mix(in oklab, var(${COLOR_VAR}) 42%, transparent), transparent 70%);
}
#${LAYER_ID} > .sc-rx-halo {
  background: radial-gradient(85% 70% at 50% 105%, color-mix(in oklab, var(${COLOR_VAR}) 34%, transparent), transparent 72%);
}`

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

export function startBackdrop(): ReactiveEffect {
  const layer = Object.assign(document.createElement('div'), { id: LAYER_ID })
  layer.setAttribute('aria-hidden', 'true')
  const core = Object.assign(document.createElement('div'), { className: 'sc-rx-core' })
  const halo = Object.assign(document.createElement('div'), { className: 'sc-rx-halo' })
  layer.append(halo, core)
  const coreDial = scrub(core, [{ opacity: 0 }, { opacity: 1 }])
  const haloDial = scrub(halo, [{ opacity: 0 }, { opacity: 1 }])
  let color = ''

  const heal = () => {
    const host = glowHost()
    if (host && layer.parentElement !== host) host.prepend(layer) // first child: under Spotify's positioned content
  }

  heal()
  return {
    update(levels, ctx) {
      const next = backdropColor(ctx.look.background, ctx.cover, ctx.accent)
      if (next !== color) {
        color = next
        layer.style.setProperty(COLOR_VAR, color)
      }
      const now = breath(levels.bass, levels.level, ctx.look.background.intensity)
      coreDial.set(now.core)
      haloDial.set(now.halo)
    },
    heal,
    dispose() {
      coreDial.cancel()
      haloDial.cancel()
      layer.remove()
    },
  }
}
