// Breathing background, page side: our layer at the bottom of the main view, or of the lyrics view while that covers
// the window, under Spotify's content (like Ambient Glow, which it can sit beside). The scene paints its canvas
// (render/backdrop-paint.ts); the layer itself never moves or resizes with the music: a moving or resizing layer under
// Spotify's content makes Chrome rework the layers above it every frame.
import { glowHost } from '../../theme/effects'
import { LYRICS_VIEW_LINE, SCROLL_HOST } from '../selectors'
import type { PaintPort, ReactiveEffect } from './effect'

const LAYER_ID = 'sc-rx-backdrop'

export const backdropCss = `
#${LAYER_ID} { position: absolute; inset: 0; pointer-events: none; }
#${LAYER_ID} > canvas { display: block; width: 100%; height: 100%; }`

/** The lyrics view's background box while it shows lyrics (it hides the main view then), else the main view's. */
export function backdropHost(): HTMLElement | null {
  return document.querySelector(LYRICS_VIEW_LINE)?.closest<HTMLElement>(SCROLL_HOST) ?? glowHost()
}

export function startBackdrop(paint: PaintPort): ReactiveEffect {
  const layer = Object.assign(document.createElement('div'), { id: LAYER_ID })
  layer.setAttribute('aria-hidden', 'true')
  const canvas = document.createElement('canvas')
  layer.append(canvas)
  paint.attach('backdrop', canvas)

  const heal = () => {
    const host = backdropHost()
    if (host && layer.parentElement !== host) host.prepend(layer) // first child: under Spotify's positioned content
  }

  heal()
  return {
    heal,
    dispose() {
      paint.detach('backdrop')
      layer.remove()
    },
  }
}
