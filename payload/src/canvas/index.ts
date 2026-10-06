// The playing song's Canvas video in place of its cover (theme.effects.canvasAlbum / canvasPlayerBar): on the album
// page when that album is playing, and in the player bar. Spotify decodes the Canvas itself (its codec doesn't play in a plain
// <video> here), so its panel video is mirrored with captureStream(). The Canvas only exists while Spotify shows it in
// the right panel; without it the overlays go and the covers show again.
import type { Theme } from '../types'
import { spotify } from '../spotify'
import { coverTargets, OVERLAY_CSS, syncOverlays } from './overlay'
import { PANEL_CANVAS_VIDEO } from './selectors'

const STYLE_ID = 'sc-canvas-cover'

/** Chromium's HTMLMediaElement.captureStream (missing from TypeScript's DOM types). */
type Capturable = HTMLVideoElement & { captureStream?: () => MediaStream }

export interface CanvasCover {
  refresh(): void
  dispose(): void
}

export function startCanvasCover(getTheme: () => Theme): CanvasCover {
  const style = document.createElement('style')
  style.id = STYLE_ID
  document.head.append(style)

  let source: Capturable | null = null
  let stream: MediaStream | null = null
  let albumPath: string | null = null
  let warned = false

  const capture = () => {
    try {
      stream = source?.captureStream?.() ?? null
    } catch (e) {
      stream = null
      if (!warned) {
        warned = true
        console.warn('[spotify-custom] Canvas video could not be mirrored; covers stay as they are', e)
      }
    }
  }
  // A new song can load into the same element; its old stream would freeze on the last frame.
  const onLoaded = () => {
    capture()
    update()
  }

  const update = () => {
    const theme = getTheme()
    const { canvasAlbum, canvasPlayerBar } = theme.effects
    if (!canvasAlbum && !canvasPlayerBar) {
      style.textContent = ''
      syncOverlays([], null)
      return
    }
    style.textContent = OVERLAY_CSS
    const video = document.querySelector<Capturable>(PANEL_CANVAS_VIDEO)
    if (video !== source) {
      source?.removeEventListener('loadeddata', onLoaded)
      source = video
      source?.addEventListener('loadeddata', onLoaded)
      capture()
    }
    const onPlayingAlbum = albumPath !== null && spotify.currentPath() === albumPath
    const banner = theme.pageStyle.headerLayout === 'banner'
    syncOverlays(coverTargets({ album: canvasAlbum, playerBar: canvasPlayerBar, banner, onPlayingAlbum }), stream)
  }

  let frame = 0
  const schedule = () => {
    if (frame === 0) {
      frame = requestAnimationFrame(() => {
        frame = 0
        update()
      })
    }
  }
  // Covers, the panel and pages mount and unmount freely; re-place after each batch of changes.
  const observer = new MutationObserver(schedule)
  observer.observe(document.querySelector('[data-testid="root"]') ?? document.body, { childList: true, subtree: true })
  const stopPlayback = spotify.onPlayback(state => {
    albumPath = state?.track ? spotify.uriToPath(state.track.album.uri) : null
    schedule()
  })
  const stopNavigate = spotify.onNavigate(schedule)
  update()

  return {
    refresh: update,
    dispose() {
      observer.disconnect()
      stopPlayback()
      stopNavigate()
      if (frame !== 0) cancelAnimationFrame(frame)
      source?.removeEventListener('loadeddata', onLoaded)
      syncOverlays([], null)
      style.remove()
    },
  }
}
