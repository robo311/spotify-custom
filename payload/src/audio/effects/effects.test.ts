import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultReactiveLook } from '../../theme/model'
import { AUDIO_BANDS } from '../frame'
import type { AudioLevels } from '../envelope'
import { backdropColor, breath } from './backdrop'
import { wantedEffects } from './controller'
import type { EffectContext } from './effect'
import { findActiveLineSelector, lyricKeyframes, lyricPosition, lyricsCss } from './lyrics'
import { beatOnset, kickScale, startPulse } from './pulse'
import { layoutBars, litBlocks, PEAK_HOLD_MS, playedShare, reach, stepPeak } from './spectrum'

function sheet(css: string): CSSStyleSheet {
  const s = new CSSStyleSheet()
  s.replaceSync(css)
  return s
}

const levels = (beat: number): AudioLevels => ({ level: 0.5, bass: 0.5, beat, bands: new Float32Array(AUDIO_BANDS) })
const context = (patch: Partial<EffectContext> = {}): EffectContext => {
  const look = defaultReactiveLook()
  look.pulse.on = true
  look.pulse.intensity = 100
  return { look, reducedMotion: false, accent: '#00ff00', cover: null, ...patch }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('wantedEffects', () => {
  it('runs nothing while the master switch is off, otherwise the effects that are on', () => {
    const look = defaultReactiveLook()
    look.spectrum.on = true
    look.lyrics.on = true
    expect(wantedEffects(false, look)).toEqual([])
    expect(wantedEffects(true, look)).toEqual(['spectrum', 'lyrics'])
  })
})

describe('spectrum geometry', () => {
  it('spreads 32 bars over the bar with gaps', () => {
    const bars = layoutBars(32 * 10 + 31 * 3)
    expect(bars).toHaveLength(AUDIO_BANDS)
    expect(bars[0]).toEqual({ x: 0, width: 10 })
    expect(bars[31].x + bars[31].width).toBeCloseTo(32 * 10 + 31 * 3)
  })

  it('reaches further with the intensity, never past the room', () => {
    expect(reach(1, 18, 100)).toBe(18)
    expect(reach(1, 18, 0)).toBeCloseTo(18 * 0.35)
    expect(reach(0.5, 18, 100)).toBe(9)
  })

  it('lights only whole blocks, like an LED meter', () => {
    expect(litBlocks(0)).toBe(0)
    expect(litBlocks(2.9)).toBe(0) // not even one full 3px block
    expect(litBlocks(3)).toBe(1)
    expect(litBlocks(7)).toBe(2) // 3 + 1 gap + 3
    expect(litBlocks(17)).toBe(4)
  })

  it('holds a peak cap, then lets it fall, never below the band', () => {
    const rise = stepPeak({ value: 0.2, heldMs: 500 }, 0.8, 16)
    expect(rise).toEqual({ value: 0.8, heldMs: 0 })
    const holding = stepPeak(rise, 0.1, PEAK_HOLD_MS - 1)
    expect(holding.value).toBe(0.8)
    const falling = stepPeak(holding, 0.1, 100)
    expect(falling.value).toBeLessThan(0.8)
    expect(falling.value).toBeGreaterThan(0.1)
    expect(stepPeak({ value: 0.3, heldMs: 10_000 }, 0.25, 10_000).value).toBe(0.25)
  })

  it("reads Spotify's played share", () => {
    expect(playedShare('42.5%')).toBeCloseTo(0.425)
    expect(playedShare('')).toBe(0)
    expect(playedShare('140%')).toBe(1)
  })
})

describe('beat pulse', () => {
  it('scales with beat and intensity', () => {
    expect(kickScale(0, 100, 0.1)).toBe(1)
    expect(kickScale(1, 100, 0.1)).toBeCloseTo(1.1)
    expect(kickScale(1, 50, 0.1)).toBeCloseTo(1.05)
  })

  it('only counts a jump of the beat envelope as a new beat, not its decay', () => {
    expect(beatOnset(0, 0.9)).toBe(true)
    expect(beatOnset(0.9, 0.8)).toBe(false)
    expect(beatOnset(0.5, 0.52)).toBe(false)
  })

  /** happy-dom has no Web Animations; record what would be animated. */
  const stubAnimate = () => {
    const calls: { el: Element; keyframes: Keyframe[] }[] = []
    const cancel = vi.fn()
    vi.spyOn(HTMLElement.prototype, 'animate').mockImplementation(function (this: HTMLElement, keyframes) {
      calls.push({ el: this, keyframes: keyframes as Keyframe[] })
      return { cancel, pause: vi.fn() } as unknown as Animation
    })
    return { calls, cancel }
  }

  it('kicks the play button once per beat, without touching its style attribute', () => {
    document.body.innerHTML = '<button data-testid="control-button-playpause"></button>'
    const play = document.querySelector('[data-testid="control-button-playpause"]')
    const { calls, cancel } = stubAnimate()
    const pulse = startPulse()
    pulse.update(levels(1), context())
    pulse.update(levels(0.8), context()) // decaying: same beat
    expect(calls).toHaveLength(1)
    expect(calls[0].el).toBe(play)
    expect(calls[0].keyframes).toEqual([{ scale: '1.140' }, { scale: '1' }])
    expect(play?.getAttribute('style')).toBeNull()
    pulse.dispose()
    expect(cancel).toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('stays still for reduced motion and for targets switched off', () => {
    document.body.innerHTML = '<button data-testid="control-button-playpause"></button>'
    const { calls } = stubAnimate()
    const pulse = startPulse()
    pulse.update(levels(1), context({ reducedMotion: true }))
    pulse.update(levels(0), context())
    const ctx = context()
    ctx.look.pulse.play = false
    pulse.update(levels(1), ctx)
    expect(calls).toHaveLength(0)
    pulse.dispose()
    vi.restoreAllMocks()
  })
})

describe('breathing background', () => {
  it('is dark in silence, follows bass (core) and loudness (halo), and fades out at zero intensity', () => {
    expect(breath(0, 0, 100)).toEqual({ core: 0, halo: 0 })
    expect(breath(1, 0, 100).core).toBe(1)
    expect(breath(0, 1, 100).halo).toBe(1)
    expect(breath(1, 1, 0)).toEqual({ core: 0, halo: 0 })
    expect(breath(0, 0.5, 100).halo).toBeLessThan(0.5) // quiet passages stay low
  })

  it('takes its colour from the cover, the accent or a custom pick (accent while either is missing)', () => {
    const bg = defaultReactiveLook().background
    expect(backdropColor({ ...bg, color: 'cover' }, '#112233', '#00ff00')).toBe('#112233')
    expect(backdropColor({ ...bg, color: 'cover' }, null, '#00ff00')).toBe('#00ff00')
    expect(backdropColor({ ...bg, color: 'accent' }, '#112233', '#00ff00')).toBe('#00ff00')
    expect(backdropColor({ ...bg, color: 'custom', customColor: '#ff8800' }, '#112233', '#00ff00')).toBe('#ff8800')
    expect(backdropColor({ ...bg, color: 'custom', customColor: null }, '#112233', '#00ff00')).toBe('#00ff00')
  })
})

describe('lyrics react', () => {
  it("finds Spotify's active-line rule by what it does", () => {
    const sheets = [
      sheet(
        '.line { color: var(--lyrics-color-inactive); }' +
          '.line .inner { color: var(--lyrics-color-active); }' +
          '.line.seek:hover { color: var(--lyrics-color-active); }' +
          '.line.active { color: var(--lyrics-color-active); }',
      ),
    ]
    expect(findActiveLineSelector(sheets)).toBe('.line.active')
    expect(findActiveLineSelector([sheet('.a.b { color: red; }')])).toBeNull()
  })

  it('anchors the swell to the lyrics alignment', () => {
    expect(lyricsCss('.l.a', 'left')).toContain('transform-origin: 0% 50%')
    expect(lyricsCss('.l.a', 'center')).toContain('transform-origin: 50% 50%')
  })

  it('grows and brightens with the voice; reduced motion only brightens', () => {
    expect(lyricPosition(0, 100)).toBe(0)
    expect(lyricPosition(0.5, 100)).toBe(0.5)
    expect(lyricPosition(1, 0)).toBe(0)
    expect(lyricKeyframes(false)[1]).toEqual({ scale: '1.07', filter: 'brightness(1.45)' })
    expect(lyricKeyframes(true).every(k => !('scale' in k))).toBe(true)
  })
})
