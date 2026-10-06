// Beat pulse: the cover, the play button and the studio button kick on beats. Each beat starts one short Web
// Animation of the individual `scale` property: it composes with Spotify's own hover/press transforms, runs on the
// compositor, and never touches style attributes (writing those on Spotify's elements makes the theme's [style*=]
// and :has() selectors re-match on every write: measured ~1 s of main-thread work per 3 s for the cover alone).
// Reduced motion: no pulse.
import type { ReactiveLook } from '../../types'
import { ENTRY, NOW_PLAYING_COVER, PLAY_PAUSE } from '../selectors'
import { amount, type ReactiveEffect } from './effect'

const KICK_MS = 240
const KICK_EASING = 'cubic-bezier(.2,.8,.2,1)'
/** The beat envelope must jump at least this much in one frame to count as a new beat. */
const ONSET = 0.08

interface Target {
  selector: string
  enabled(look: ReactiveLook): boolean
  /** Largest extra scale at full beat and intensity. */
  max: number
  el: HTMLElement | null
  kick: Animation | null
}

/** Pure: the peak scale for a beat (0–1) at an intensity (0–100). */
export function kickScale(beat: number, intensity: number, max: number): number {
  return 1 + beat * max * amount(intensity)
}

/** Pure: did a new beat start between two frames of the (decaying) beat envelope? */
export function beatOnset(previous: number, current: number): boolean {
  return current - previous > ONSET
}

export function startPulse(): ReactiveEffect {
  const targets: Target[] = [
    { selector: NOW_PLAYING_COVER, enabled: l => l.pulse.cover, max: 0.08, el: null, kick: null },
    { selector: PLAY_PAUSE, enabled: l => l.pulse.play, max: 0.14, el: null, kick: null },
    { selector: ENTRY, enabled: l => l.pulse.entry, max: 0.2, el: null, kick: null },
  ]
  let previousBeat = 0

  const heal = () => {
    for (const t of targets) {
      if (t.el?.isConnected) continue
      t.kick?.cancel()
      t.kick = null
      t.el = document.querySelector<HTMLElement>(t.selector)
    }
  }

  heal()
  return {
    update(levels, ctx) {
      const onset = beatOnset(previousBeat, levels.beat)
      previousBeat = levels.beat
      if (!onset || ctx.reducedMotion) return
      for (const t of targets) {
        if (!t.el?.isConnected || !t.enabled(ctx.look)) continue
        const peak = kickScale(levels.beat, ctx.look.pulse.intensity, t.max).toFixed(3)
        t.kick?.cancel()
        t.kick = t.el.animate([{ scale: peak }, { scale: '1' }], { duration: KICK_MS, easing: KICK_EASING })
      }
    },
    heal,
    dispose() {
      for (const t of targets) t.kick?.cancel()
    },
  }
}
