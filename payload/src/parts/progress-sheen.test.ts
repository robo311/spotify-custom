import { afterEach, describe, expect, it } from 'vitest'
import type { PlaybackPosition } from '../spotify'
import type { ProgressStyle } from '../types'
import { SHEEN_ANIMATION, SHEEN_ATTR, startProgressSheen, sweepCause, SWEEPS } from './progress-sheen'

const at = (positionMs: number, atMs: number, patch: Partial<PlaybackPosition> = {}): PlaybackPosition => ({
  uri: 'spotify:track:a',
  positionMs,
  at: atMs,
  paused: false,
  ...patch,
})

function setup(style: ProgressStyle = 'flow') {
  document.body.innerHTML = '<div data-testid="now-playing-bar"><button id="in-bar"></button></div><main id="elsewhere"></main>'
  let report: (p: PlaybackPosition | null) => void = () => undefined
  let current = style
  let sweeping = false // happy-dom runs no CSS animations: the test says when a sweep is in progress
  const sheen = startProgressSheen({
    style: () => current,
    sweeping: () => sweeping,
    onPosition: fn => {
      report = fn
      return () => undefined
    },
  })
  const sweep = (name = SHEEN_ANIMATION) => document.dispatchEvent(Object.assign(new Event('animationiteration'), { animationName: name }))
  const pointer = (type: 'pointerover' | 'pointerout', id: string, related?: string) =>
    document.getElementById(id)?.dispatchEvent(
      Object.assign(new Event(type, { bubbles: true }), { relatedTarget: related ? document.getElementById(related) : null }),
    )
  return {
    sheen,
    report: (p: PlaybackPosition | null) => report(p),
    sweep,
    pointer,
    on: () => document.documentElement.hasAttribute(SHEEN_ATTR),
    setStyle: (s: ProgressStyle) => (current = s),
    setSweeping: (on: boolean) => (sweeping = on),
  }
}

afterEach(() => {
  document.documentElement.removeAttribute(SHEEN_ATTR)
  document.body.replaceChildren()
})

describe('sweepCause', () => {
  it('sees a new song and a jump in place, not playback running on, pausing or resuming', () => {
    expect(sweepCause(null, at(0, 0))).toBeNull() // first report: nothing to compare with
    expect(sweepCause(at(10_000, 0), at(13_000, 3000))).toBeNull() // ran on as expected
    expect(sweepCause(at(10_000, 0), at(12_900, 3000, { paused: true }))).toBeNull() // paused about where it was
    expect(sweepCause(at(12_900, 0, { paused: true }), at(12_900, 60_000))).toBeNull() // resumed after a minute
    expect(sweepCause(at(10_000, 0), at(60_000, 1000))).toBe('seek')
    expect(sweepCause(at(60_000, 0), at(5000, 1000))).toBe('seek') // backwards too
    expect(sweepCause(at(10_000, 0), at(0, 1000, { uri: 'spotify:track:b' }))).toBe('track')
  })
})

describe('progress sheen', () => {
  it(`sweeps ${SWEEPS} times after a song change, then stops at the end of a sweep`, () => {
    const t = setup()
    t.report(at(10_000, 0))
    expect(t.on()).toBe(false)
    t.report(at(0, 1000, { uri: 'spotify:track:b' }))
    expect(t.on()).toBe(true)
    for (let i = 1; i < SWEEPS; i++) {
      t.sweep()
      expect(t.on()).toBe(true)
    }
    t.sweep('sc-pb-stripes') // another animation's iteration doesn't count
    expect(t.on()).toBe(true)
    t.sweep()
    expect(t.on()).toBe(false)
    t.sheen.dispose()
  })

  it('sweeps while the pointer is over the player bar, finishing the sweep after it leaves', () => {
    const t = setup()
    t.pointer('pointerover', 'elsewhere')
    expect(t.on()).toBe(false)
    t.pointer('pointerover', 'in-bar')
    expect(t.on()).toBe(true)
    t.sweep()
    expect(t.on()).toBe(true) // still hovering
    t.setSweeping(true)
    t.pointer('pointerout', 'in-bar', 'elsewhere')
    expect(t.on()).toBe(true) // the sweep in progress finishes
    t.sweep()
    expect(t.on()).toBe(false)
    t.sheen.dispose()
  })

  it('stops at once when the pointer leaves while nothing sweeps (music paused)', () => {
    const t = setup()
    t.pointer('pointerover', 'in-bar')
    expect(t.on()).toBe(true)
    t.pointer('pointerout', 'in-bar', 'elsewhere') // nothing sweeping
    expect(t.on()).toBe(false)
    t.sheen.dispose()
  })

  it('stays still for other progress bar styles, and stops when the style changes away', () => {
    const t = setup('glow')
    t.report(at(10_000, 0))
    t.report(at(90_000, 500))
    t.pointer('pointerover', 'in-bar')
    expect(t.on()).toBe(false)
    t.setStyle('flow')
    t.pointer('pointerout', 'in-bar', 'elsewhere')
    t.pointer('pointerover', 'in-bar')
    expect(t.on()).toBe(true)
    t.setStyle('wave')
    t.sheen.refresh()
    expect(t.on()).toBe(false)
    t.sheen.dispose()
  })

  it('cleans up on dispose', () => {
    const t = setup()
    t.pointer('pointerover', 'in-bar')
    t.sheen.dispose()
    expect(t.on()).toBe(false)
    t.pointer('pointerout', 'in-bar', 'elsewhere')
    t.pointer('pointerover', 'in-bar')
    expect(t.on()).toBe(false)
  })
})
