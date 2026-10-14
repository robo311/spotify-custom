// Arrange mode: the bar being arranged becomes a canvas. A catcher over the bar takes the pointer (Spotify's buttons
// and window dragging pause), every visible layer gets a box (dashed where it pokes out past the bar, with a faint ghost
// of the picture there), and the selected free layer gets corner handles. Drags preview straight on the layer element
// and save once on release (one undo step); scroll and arrow keys save as they go (coalesced). Cancel puts back how the
// bar's layers were when arranging started; Done and Esc keep the changes.
import { useCallback, useEffect, useLayoutEffect, useState } from 'preact/hooks'
import type { BarLayer } from '../../types'
import { BAR_SELECTORS, layerElement, layerUrl, previewLayer } from '../../bar-layers'
import { useApp, useEnv, useUi } from '../context'
import { css, useStyles } from '../styles/sheet'
import { dragLayer, nudgeLayer, resizeLayer, topLayerAt, wheelLayer, type Box } from '../lib/arrange-geometry'
import { listenEscape } from '../lib/escape-key'
import { layersOf, updateLayer } from '../lib/layer-edits'
import { startPointerDrag } from '../lib/pointer-drag'
import { lookup } from '../lib/record'
import { suspendWindowDrag } from '../lib/window-drag'
import { usePartSession } from '../pick/use-part-session'
import { ArrangeToolbar } from './ArrangeToolbar'

const styles = css`
  .b-arr__catch {
    position: fixed;
    pointer-events: auto;
    cursor: move;
    box-shadow: 0 0 0 1px var(--b-accent);
    touch-action: none;
  }
  .b-arr__box {
    position: fixed;
    pointer-events: auto;
    cursor: move;
    box-sizing: border-box;
    border: 1px dashed color-mix(in oklab, var(--b-text) 55%, transparent);
    touch-action: none;
  }
  .b-arr__box[data-selected] {
    border: 1.5px solid var(--b-accent);
  }
  .b-arr__ghost {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0.35;
    pointer-events: none;
  }
  .b-arr__handle {
    position: absolute;
    width: 10px;
    height: 10px;
    margin: -5px;
    border-radius: 2px;
    background: var(--b-accent);
    box-shadow: 0 0 0 1.5px var(--b-bg);
  }
  .b-arr__handle[data-corner='nw'] { left: 0; top: 0; cursor: nwse-resize; }
  .b-arr__handle[data-corner='ne'] { right: 0; top: 0; margin-right: -5px; cursor: nesw-resize; }
  .b-arr__handle[data-corner='sw'] { left: 0; bottom: 0; margin-bottom: -5px; cursor: nesw-resize; }
  .b-arr__handle[data-corner='se'] { right: 0; bottom: 0; margin: 0 -5px -5px 0; cursor: nwse-resize; }
  .b-arr__bar {
    position: fixed;
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: calc(100vw - 32px);
    padding: 6px 6px 6px 8px;
    border-radius: var(--b-r-md);
    background: var(--b-panel);
    box-shadow: inset 0 0 0 1px var(--b-line), 0 8px 24px rgb(0 0 0 / 0.35);
    color: var(--b-text);
    font: 12px var(--b-ui);
    -webkit-app-region: no-drag;
    app-region: no-drag;
  }
  .b-arr__chips {
    display: flex;
    gap: 4px;
    overflow-x: auto;
  }
  .b-arr__chip {
    padding: 4px 8px;
    border: 0;
    border-radius: var(--b-r-sm);
    background: var(--b-well);
    color: var(--b-sub);
    font: inherit;
    white-space: nowrap;
    cursor: pointer;
  }
  .b-arr__chip[aria-pressed='true'] {
    background: var(--b-accent);
    color: var(--b-on-accent);
  }
  .b-arr__hint {
    color: var(--b-sub);
    white-space: nowrap;
  }
`

const NO_LAYERS: BarLayer[] = []
type Rect = Box['rect']
const CORNERS = ['nw', 'ne', 'sw', 'se'] as const

const toRect = (r: DOMRect): Rect => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom })
const px = (n: number) => `${Math.round(n)}px`

/** A path that covers the box except where the bar is: the ghost only shows what pokes out. */
function outsideBar(box: Rect, bar: Rect): string {
  const w = box.right - box.left
  const h = box.bottom - box.top
  const l = bar.left - box.left
  const t = bar.top - box.top
  const r = bar.right - box.left
  const b = bar.bottom - box.top
  return `path(evenodd, "M0 0H${w}V${h}H0Z M${l} ${t}H${r}V${b}H${l}Z")`
}

function naturalSize(el: HTMLElement | null): { width: number; height: number } | undefined {
  return el instanceof HTMLImageElement && el.naturalWidth > 0 ? { width: el.naturalWidth, height: el.naturalHeight } : undefined
}

export function ArrangeLayer({ partId }: { partId: string }) {
  useStyles(styles)
  const { store, ui, root } = useEnv()
  const session = usePartSession(partId)
  const layers = useApp(s => lookup(s.active.parts, partId)?.layers ?? NO_LAYERS)
  const selected = useUi(s => (s.layer?.part === partId ? s.layer.id : null))
  const [bar, setBar] = useState<Rect | null>(null)
  const [boxes, setBoxes] = useState<Box[]>([])
  const visible = layers.filter(l => !l.hidden)
  const topId = visible.at(-1)?.id

  const select = useCallback((id: string) => ui.set(s => ({ ...s, layer: { part: partId, id } })), [ui, partId])
  const exit = useCallback(() => ui.set(s => ({ ...s, arranging: undefined })), [ui])
  const save = useCallback(
    (id: string, patch: Partial<BarLayer>, key: string) => store.edit(updateLayer(partId, id, patch), { coalesceKey: `layers.${partId}.${id}.${key}` }),
    [store, partId],
  )
  /** Visible layers as they are now (handlers outlive renders). */
  const current = useCallback(() => layersOf(store.get().active, partId).filter(l => !l.hidden), [store, partId])

  /** Reads the bar and every visible layer's box from the page. */
  const measure = useCallback(() => {
    const el = document.querySelector(BAR_SELECTORS[partId] ?? '')
    setBar(el ? toRect(el.getBoundingClientRect()) : null)
    setBoxes(
      current().flatMap(l => {
        const layerEl = layerElement(partId, l.id)
        return layerEl ? [{ id: l.id, rect: toRect(layerEl.getBoundingClientRect()) }] : []
      }),
    )
  }, [current, partId])

  useEffect(suspendWindowDrag, [])
  useEffect(() => listenEscape(root, exit), [root, exit])
  // The runtime redraws layers on the next frame after a theme change: measure after it.
  useLayoutEffect(() => {
    let inner = 0
    const outer = requestAnimationFrame(() => (inner = requestAnimationFrame(measure)))
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [layers, measure])
  useEffect(() => {
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])
  // Pick a layer to start with: the one selected in the studio, else the top one.
  useEffect(() => {
    if (!selected && topId) select(topId)
  }, [selected, topId, select])

  // Arrow keys nudge the selected layer, unless a control in the studio has focus (sliders use arrows too).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.key.startsWith('Arrow') || e.defaultPrevented) return
      const target = e.composedPath()[0]
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [role="radiogroup"], [contenteditable]')) return
      const layer = current().find(l => l.id === ui.get().layer?.id)
      if (!layer) return
      e.preventDefault()
      e.stopPropagation()
      save(layer.id, nudgeLayer(layer, e.key, e.shiftKey), 'move')
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [current, save, ui])

  /** The toolbar can sit over a layer's ghost below the bar: presses and scrolls there are the toolbar's. */
  const onToolbar = (e: Event) => e.target instanceof Element && e.target.closest('.b-arr__bar') !== null

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || !bar || onToolbar(e)) return
    const corner = e.target instanceof HTMLElement ? e.target.dataset.corner : undefined
    const id = corner ? selected : topLayerAt(boxes, e.clientX, e.clientY, selected)
    const layer = visible.find(l => l.id === id)
    if (!layer) return
    e.preventDefault()
    e.stopPropagation()
    select(layer.id)
    const size = { width: bar.right - bar.left, height: bar.bottom - bar.top }
    const el = layerElement(partId, layer.id)
    const picture = naturalSize(el)
    const box = boxes.find(b => b.id === layer.id)?.rect
    const centre = box ? { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 } : { x: e.clientX, y: e.clientY }
    const startDistance = Math.hypot(e.clientX - centre.x, e.clientY - centre.y)
    let latest: Partial<BarLayer> | null = null

    startPointerDrag(e, {
      onMove(ev) {
        latest = corner
          ? { size: resizeLayer(layer, layer.size, startDistance, Math.hypot(ev.clientX - centre.x, ev.clientY - centre.y)) }
          : dragLayer(layer, ev.clientX - e.clientX, ev.clientY - e.clientY, size, picture)
        previewLayer(partId, { ...layer, ...latest })
        measure()
      },
      onEnd() {
        if (latest) save(layer.id, latest, corner ? 'size' : 'move')
      },
    })
  }

  const onWheel = (e: WheelEvent) => {
    if (onToolbar(e)) return
    const id = topLayerAt(boxes, e.clientX, e.clientY, selected) ?? selected
    const layer = visible.find(l => l.id === id)
    if (!layer) return
    select(layer.id)
    save(layer.id, { size: wheelLayer(layer, e.deltaY) }, 'size')
  }

  const cancel = () => {
    session.cancel()
    exit()
  }

  if (!bar) return null
  const below = bar.top < window.innerHeight / 2
  const toolbarStyle = {
    left: px((bar.left + bar.right) / 2),
    translate: '-50% 0',
    ...(below ? { top: px(bar.bottom + 8) } : { bottom: px(window.innerHeight - bar.top + 8) }),
  }

  return (
    <div data-sc-builder-ui onPointerDown={onPointerDown} onWheel={onWheel}>
      <div
        class="b-arr__catch"
        style={{ left: px(bar.left), top: px(bar.top), width: px(bar.right - bar.left), height: px(bar.bottom - bar.top) }}
      />
      {boxes.map(({ id, rect }) => {
        const layer = visible.find(l => l.id === id)
        if (!layer) return null
        const isSelected = id === selected
        const url = layerUrl(layer)
        const pokesOut = rect.left < bar.left || rect.top < bar.top || rect.right > bar.right || rect.bottom > bar.bottom
        return (
          <div
            key={id}
            class="b-arr__box"
            data-selected={isSelected || undefined}
            data-layer={id}
            style={{ left: px(rect.left), top: px(rect.top), width: px(rect.right - rect.left), height: px(rect.bottom - rect.top) }}
          >
            {pokesOut && url && layer.fit === 'free' && (
              <img class="b-arr__ghost" src={url} alt="" style={{ clipPath: outsideBar(rect, bar) }} />
            )}
            {isSelected && layer.fit === 'free' && CORNERS.map(c => <span key={c} class="b-arr__handle" data-corner={c} />)}
          </div>
        )
      })}
      <ArrangeToolbar layers={visible} selected={selected} style={toolbarStyle} onSelect={select} onCancel={cancel} onDone={exit} />
    </div>
  )
}
