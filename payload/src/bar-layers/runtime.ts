// Keeps each bar's picture layers (theme.parts[bar].layers) as our own elements, first inside the bar so they paint
// under its content. Elements are reused by layer id, so moving a layer restyles it without reloading the picture.
// Spotify re-renders and replaces bars: a narrow observer per bar plus a slow health check put them back.
import type { BarLayer, PartStyle } from '../types'
import { barArtUrl } from '../art'
import { BAR_SELECTORS, LAYER_CLASS, LAYER_ID_ATTR, LAYERS_CLASS } from './selectors'
import { CONTAINER_STYLE, layerStyle, layerTag, toCssText } from './style'

const HEALTH_CHECK_MS = 2000

export interface BarLayersController {
  /** Re-reads the layers (call when theme parts change). */
  refresh(): void
  dispose(): void
}

export function layerUrl(layer: BarLayer): string | null {
  return 'builtin' in layer.src ? barArtUrl(layer.src.builtin) : layer.src.data
}

/** Layers that paint: visible, with a picture we have. */
function drawn(style: PartStyle | undefined): { layer: BarLayer; url: string }[] {
  return (style?.layers ?? []).flatMap(layer => {
    const url = layer.hidden ? null : layerUrl(layer)
    return url ? [{ layer, url }] : []
  })
}

function syncLayer(container: HTMLElement, existing: Element | undefined, layer: BarLayer, url: string): HTMLElement {
  const tag = layerTag(layer)
  const el = existing instanceof HTMLElement && existing.tagName.toLowerCase() === tag ? existing : document.createElement(tag)
  el.className = LAYER_CLASS
  el.setAttribute(LAYER_ID_ATTR, layer.id)
  if (el instanceof HTMLImageElement) {
    el.alt = ''
    el.draggable = false
    if (el.getAttribute('src') !== url) el.src = url
  }
  const css = toCssText(layerStyle(layer, url))
  if (el.style.cssText !== css) el.style.cssText = css
  return el
}

/** Makes `bar`'s container hold exactly these layers, bottom first. */
function syncBar(bar: Element, layers: { layer: BarLayer; url: string }[]) {
  let container = bar.querySelector<HTMLElement>(`:scope > .${LAYERS_CLASS}`)
  if (layers.length === 0) {
    container?.remove()
    return
  }
  if (!container) {
    container = document.createElement('div')
    container.className = LAYERS_CLASS
    container.setAttribute('aria-hidden', 'true')
    container.style.cssText = toCssText(CONTAINER_STYLE)
  }
  if (bar.firstElementChild !== container) bar.prepend(container) // first: painted under Spotify's content
  const byId = new Map([...container.children].map(el => [el.getAttribute(LAYER_ID_ATTR) ?? '', el]))
  const wanted = layers.map(({ layer, url }) => syncLayer(container, byId.get(layer.id), layer, url))
  wanted.forEach((el, i) => {
    if (container.children[i] !== el) container.insertBefore(el, container.children[i] ?? null)
  })
  while (container.children.length > wanted.length) container.lastElementChild?.remove()
}

/** A drawn layer's element in its bar (Arrange measures and previews through it). */
export function layerElement(partId: string, id: string): HTMLElement | null {
  const selector = BAR_SELECTORS[partId]
  if (!selector) return null
  return document.querySelector<HTMLElement>(`${selector} > .${LAYERS_CLASS} > [${LAYER_ID_ATTR}="${CSS.escape(id)}"]`)
}

/**
 * Restyles a drawn layer without touching the theme: Arrange shows a drag live this way and saves once on release.
 * The next sync from the theme replaces it.
 */
export function previewLayer(partId: string, layer: BarLayer): void {
  const el = layerElement(partId, layer.id)
  const url = layerUrl(layer)
  if (el && url) el.style.cssText = toCssText(layerStyle(layer, url))
}

export function startBarLayers(getParts: () => Record<string, PartStyle>): BarLayersController {
  const observed = new Map<string, Element>()
  let frame = 0
  const observer = new MutationObserver(() => schedule())
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(sync)
  }

  function sync() {
    frame = 0
    const parts = getParts()
    for (const [partId, selector] of Object.entries(BAR_SELECTORS)) {
      const layers = drawn(Object.hasOwn(parts, partId) ? parts[partId] : undefined)
      const bar = document.querySelector(selector)
      if (bar) syncBar(bar, layers)
      // Watch only bars that have layers: Spotify replacing their children would drop ours.
      const watch = layers.length > 0 ? bar : null
      if (watch !== (observed.get(partId) ?? null)) {
        if (watch) observed.set(partId, watch)
        else observed.delete(partId)
        observer.disconnect()
        for (const el of observed.values()) observer.observe(el, { childList: true })
      }
    }
  }

  const timer = setInterval(() => {
    for (const [partId, bar] of observed) {
      const selector = BAR_SELECTORS[partId]
      if (!bar.isConnected || (selector && document.querySelector(selector) !== bar)) schedule()
    }
    // A bar that wasn't there before (e.g. the player bar after start-up).
    if (observed.size === 0 && Object.values(getParts()).some(p => drawn(p).length > 0)) schedule()
  }, HEALTH_CHECK_MS)

  sync()

  return {
    refresh: schedule,
    dispose() {
      clearInterval(timer)
      observer.disconnect()
      cancelAnimationFrame(frame)
      for (const el of document.querySelectorAll(`.${LAYERS_CLASS}`)) el.remove()
    },
  }
}
