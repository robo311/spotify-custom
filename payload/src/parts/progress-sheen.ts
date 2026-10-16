// When the Flow progress bar's sheen sweeps: a few times after the song changes or you seek, and while the pointer is
// over the player bar. A sheen that never stops keeps the whole window redrawing every frame while music plays (most
// of the GPU left in use); a bar at rest costs nothing. Sweeps stop only at the end of one (the band is at the
// playhead then and would start over from the left anyway), so the bar never visibly cuts off mid-sweep.
import type { ProgressStyle } from '../types'
import type { PlaybackPosition } from '../spotify'
import { PLAYER_BAR } from './selectors'

/** On <html> while the sheen may sweep (progress.ts animates it only then, and only while music plays). */
export const SHEEN_ATTR = 'data-sc-sheen'
export const SHEEN_ANIMATION = 'sc-pb-sheen'
/** Sweeps after a song change or a seek. */
export const SWEEPS = 3
/** Position reports this far from where playback should be count as a seek (reports carry their own clock). */
const SEEK_TOLERANCE_MS = 1500

/** Pure: did playback jump to another song or another place between two of Spotify's position reports? */
export function sweepCause(prev: PlaybackPosition | null, next: PlaybackPosition | null): 'track' | 'seek' | null {
  if (!prev || !next) return null
  if (next.uri !== prev.uri) return 'track'
  const expected = prev.paused ? prev.positionMs : prev.positionMs + (next.at - prev.at)
  return Math.abs(next.positionMs - expected) > SEEK_TOLERANCE_MS ? 'seek' : null
}

export interface SheenDeps {
  style: () => ProgressStyle
  onPosition: (fn: (p: PlaybackPosition | null) => void) => () => void
  /** Whether a sweep is running now (default: asks the page's animations). */
  sweeping?: () => boolean
}

const sweepRunning = () =>
  document.getAnimations().some(a => a instanceof CSSAnimation && a.animationName === SHEEN_ANIMATION && a.playState === 'running')

export function startProgressSheen(deps: SheenDeps): { refresh(): void; dispose(): void } {
  const html = document.documentElement
  let sweepsLeft = 0
  let hovering = false
  let last: PlaybackPosition | null = null

  const wanted = () => deps.style() === 'flow' && (hovering || sweepsLeft > 0)
  const start = () => {
    if (wanted()) html.setAttribute(SHEEN_ATTR, '')
  }
  /** At the end of a sweep: stop if nothing wants another. */
  const onIteration = (e: AnimationEvent) => {
    if (e.animationName !== SHEEN_ANIMATION) return
    if (sweepsLeft > 0) sweepsLeft--
    if (!wanted()) html.removeAttribute(SHEEN_ATTR)
  }

  const stopPosition = deps.onPosition(p => {
    if (sweepCause(last, p)) {
      sweepsLeft = SWEEPS
      start()
    }
    last = p
  })
  const onOver = (e: PointerEvent) => {
    if (hovering || !(e.target instanceof Element) || !e.target.closest(PLAYER_BAR)) return
    hovering = true
    start()
  }
  const onOut = (e: PointerEvent) => {
    if (!hovering || (e.relatedTarget instanceof Element && e.relatedTarget.closest(PLAYER_BAR))) return
    hovering = false
    // A sweep in progress finishes first (onIteration stops it); with nothing sweeping (paused), stop now, or the
    // next play would start a sweep nobody asked for.
    if (!wanted() && !(deps.sweeping ?? sweepRunning)()) html.removeAttribute(SHEEN_ATTR)
  }
  document.addEventListener('pointerover', onOver)
  document.addEventListener('pointerout', onOut)
  document.addEventListener('animationiteration', onIteration)

  return {
    /** The progress bar style changed: drop a sheen that no longer applies. */
    refresh() {
      if (deps.style() !== 'flow') html.removeAttribute(SHEEN_ATTR)
    },
    dispose() {
      stopPosition()
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointerout', onOut)
      document.removeEventListener('animationiteration', onIteration)
      html.removeAttribute(SHEEN_ATTR)
    },
  }
}
