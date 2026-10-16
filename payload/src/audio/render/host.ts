// Where the reactive scene runs. In a worker when the browser allows it: painting then never makes Spotify's page render
// a frame. Otherwise (no OffscreenCanvas, or a worker that can't start, e.g. a stricter page policy) on the page itself,
// driven by the same messages: the effects still work, at the old cost. Messages wait until the worker says it's
// ready, so a worker that fails late still falls back with every canvas untouched.
import type { FromScene, SurfaceId, ToScene } from './protocol'
import { createScene, type Scene } from './scene'
import SceneWorker from './worker?worker&inline'

/** ToScene as the page sends it: canvases are our own elements (transferred or used directly by the host). */
export type HostMessage = Exclude<ToScene, { type: 'attach' }> | { type: 'attach'; id: SurfaceId; canvas: HTMLCanvasElement }

export interface SceneHost {
  post(msg: HostMessage): void
  dispose(): void
}

/** A worker that doesn't say it's ready in this long is given up on. */
const READY_TIMEOUT_MS = 2000

export function startWorker(): Worker | null {
  if (typeof OffscreenCanvas === 'undefined' || !('transferControlToOffscreen' in HTMLCanvasElement.prototype)) return null
  return new SceneWorker({ name: 'spotify-custom reactive' })
}

function pageScene(onMessage: (msg: FromScene) => void): Scene {
  return createScene({
    post: onMessage,
    now: () => performance.now(),
    requestFrame: fn => requestAnimationFrame(fn),
    cancelFrame: id => cancelAnimationFrame(id),
  })
}

export function startSceneHost(onMessage: (msg: FromScene) => void, worker: () => Worker | null = startWorker): SceneHost {
  let scene: Scene | null = null
  let live: Worker | null = null
  let pending: HostMessage[] | null = []
  let timer: ReturnType<typeof setTimeout> | null = null

  const toWorker = (w: Worker, msg: HostMessage) => {
    if (msg.type !== 'attach') {
      w.postMessage(msg)
      return
    }
    const canvas = msg.canvas.transferControlToOffscreen()
    w.postMessage({ type: 'attach', id: msg.id, canvas }, [canvas])
  }
  const flush = (send: (msg: HostMessage) => void) => {
    const queued = pending ?? []
    pending = null
    if (timer !== null) clearTimeout(timer)
    timer = null
    for (const msg of queued) send(msg)
  }
  /** Runs the scene on the page from now on; `why` = the worker failed (reported), none = no worker support. */
  const toPage = (why?: unknown) => {
    if (!pending) return // already decided
    if (why !== undefined) console.warn('[spotify-custom] music-reactive effects run on the page (no worker), which costs more CPU', why)
    live?.terminate()
    live = null
    scene = pageScene(onMessage)
    const s = scene
    flush(msg => s.handle(msg))
  }

  let candidate: Worker | null = null
  try {
    candidate = worker()
  } catch (e) {
    toPage(e)
  }
  if (candidate) {
    const w = candidate
    live = w
    w.addEventListener('message', (e: MessageEvent<FromScene>) => {
      if (e.data.type !== 'ready') onMessage(e.data)
      else if (pending) flush(msg => toWorker(w, msg))
    })
    w.addEventListener('error', e => {
      if (pending) toPage(e.message || 'worker failed to start')
      else console.warn('[spotify-custom] music-reactive worker error', e.message)
    })
    timer = setTimeout(() => toPage('worker did not start'), READY_TIMEOUT_MS)
  } else {
    toPage()
  }

  return {
    post(msg) {
      if (pending) pending.push(msg)
      else if (live) toWorker(live, msg)
      else scene?.handle(msg)
    },
    dispose() {
      if (timer !== null) clearTimeout(timer)
      live?.terminate()
      scene?.dispose()
      pending = null
      live = null
      scene = null
    },
  }
}
