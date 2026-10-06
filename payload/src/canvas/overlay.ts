// Where the Canvas video goes, and our <video> overlays on those places. Overlays are our own children laid over
// Spotify's cover (never replacing it), so removing them shows the cover again.
import { ALBUM_BANNER, ALBUM_COVER, PLAYER_COVER } from './selectors'

export const OVERLAY_CLASS = 'sc-canvas-cover'

/** Layout for the overlays and their hosts (hosts are found by the overlay they hold, so no class on Spotify's nodes). */
export const OVERLAY_CSS = `
:has(> video.${OVERLAY_CLASS}) { position: relative; }
video.${OVERLAY_CLASS} {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
  border-radius: inherit; pointer-events: none; z-index: 1;
}`

interface Where {
  album: boolean // the theme puts the Canvas on the album page
  playerBar: boolean // … and in the player bar
  banner: boolean // the album header uses the banner layout (its cover is hidden; the backdrop shows it)
  onPlayingAlbum: boolean // the open page is the album of the song that's playing
}

export function coverTargets({ album, playerBar, banner, onPlayingAlbum }: Where): Element[] {
  const targets: (Element | null)[] = []
  if (playerBar) targets.push(document.querySelector(PLAYER_COVER))
  if (album && onPlayingAlbum) targets.push(document.querySelector(banner ? ALBUM_BANNER : ALBUM_COVER))
  return targets.filter((t): t is Element => t !== null)
}

/** Ensures exactly one overlay per target showing the stream, and none anywhere else. A null stream removes all. */
export function syncOverlays(targets: readonly Element[], stream: MediaStream | null): void {
  const wanted = stream ? new Set(targets) : new Set<Element>()
  for (const overlay of document.querySelectorAll<HTMLVideoElement>(`video.${OVERLAY_CLASS}`)) {
    if (!overlay.parentElement || !wanted.has(overlay.parentElement)) {
      overlay.srcObject = null
      overlay.remove()
    }
  }
  if (!stream) return
  for (const target of wanted) {
    let overlay = target.querySelector<HTMLVideoElement>(`:scope > video.${OVERLAY_CLASS}`)
    if (!overlay) {
      overlay = document.createElement('video')
      overlay.className = OVERLAY_CLASS
      overlay.muted = true
      overlay.autoplay = true
      overlay.playsInline = true
      overlay.setAttribute('aria-hidden', 'true')
      target.append(overlay)
    }
    if (overlay.srcObject !== stream) {
      overlay.srcObject = stream
      void overlay.play().catch(() => undefined)
    }
  }
}
