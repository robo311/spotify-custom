// Worker entry: runs the reactive scene off the page. Canvases arrive as OffscreenCanvas, so what it paints goes to
// the screen without the page rendering a frame (on Spotify's page that frame costs several ms).
import type { ToScene } from './protocol'
import { createScene } from './scene'

const scene = createScene({
  post: msg => postMessage(msg),
  now: () => performance.now(),
  requestFrame: fn => requestAnimationFrame(fn),
  cancelFrame: id => cancelAnimationFrame(id),
})
addEventListener('message', (e: MessageEvent<ToScene>) => scene.handle(e.data))
postMessage({ type: 'ready' })
