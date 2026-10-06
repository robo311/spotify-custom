// A paused Web Animation used as a dial: setting a 0–1 position applies the matching in-between keyframe values
// without writing the element's style attribute (on Spotify's elements that write is what's expensive, see pulse.ts)
// and lets the compositor handle opacity/transform.

const SPAN_MS = 1000

export interface Scrub {
  /** 0–1 along the keyframes; repeated values are skipped. */
  set(position: number): void
  cancel(): void
}

export function scrub(el: Element, keyframes: Keyframe[]): Scrub {
  const animation = el.animate(keyframes, { duration: SPAN_MS, fill: 'both' })
  animation.pause()
  let written = -1
  return {
    set(position) {
      const time = Math.round(Math.min(1, Math.max(0, position)) * SPAN_MS)
      if (time === written) return
      written = time
      animation.currentTime = time
    },
    cancel() {
      animation.cancel()
    },
  }
}
