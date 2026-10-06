// Starts and stops each music-reactive effect from the settings (master switch + its own toggle) and feeds the
// running ones the engine's levels every display frame, with the colours they follow.
import type { ReactiveLook, Store } from '../../types'
import { coverColors } from '../../theme/cover-colors'
import type { AudioEngine } from '../engine'
import { NOW_PLAYING_COVER_IMAGE } from '../selectors'
import { backdropCss, startBackdrop } from './backdrop'
import type { EffectContext, ReactiveEffect } from './effect'
import { startLyrics } from './lyrics'
import { startPulse } from './pulse'
import { spectrumCss, startSpectrum } from './spectrum'

const STYLE_ID = 'sc-reactive'
const HEAL_MS = 1000

type EffectKey = 'spectrum' | 'pulse' | 'background' | 'lyrics'
const KEYS: readonly EffectKey[] = ['spectrum', 'pulse', 'background', 'lyrics']

/** Pure: which effects should exist right now. */
export function wantedEffects(enabled: boolean, look: ReactiveLook): EffectKey[] {
  return enabled ? KEYS.filter(k => look[k].on) : []
}

export function startReactiveEffects(engine: AudioEngine, store: Store): () => void {
  const style = document.createElement('style')
  style.id = STYLE_ID
  document.head.append(style)
  let lyricsCss = ''
  const writeCss = () => {
    style.textContent = [spectrumCss, backdropCss, lyricsCss].join('\n')
  }
  writeCss()

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const ctx: EffectContext = { look: store.get().active.effects.reactive, reducedMotion: motion.matches, accent: '', cover: null }
  const onMotion = () => {
    ctx.reducedMotion = motion.matches
  }
  motion.addEventListener('change', onMotion)

  const running = new Map<EffectKey, ReactiveEffect>()
  const start: Record<EffectKey, () => ReactiveEffect> = {
    spectrum: startSpectrum,
    pulse: startPulse,
    background: startBackdrop,
    lyrics: () =>
      startLyrics(
        css => {
          lyricsCss = css
          writeCss()
        },
        () => store.get().active.lyrics.align,
      ),
  }

  let coverSrc: string | null = null
  const followColours = () => {
    ctx.accent = getComputedStyle(document.documentElement).getPropertyValue('--sc-accent').trim() || '#1ed760'
    const src = document.querySelector(NOW_PLAYING_COVER_IMAGE)?.getAttribute('src') ?? null
    if (src === coverSrc) return
    coverSrc = src
    if (!src) {
      ctx.cover = null
      return
    }
    coverColors(src).then(
      colors => {
        if (src === coverSrc) ctx.cover = colors.vivid
      },
      () => {
        if (src === coverSrc) ctx.cover = null
      },
    )
  }

  let timer: ReturnType<typeof setInterval> | null = null
  const sync = () => {
    const s = store.get()
    ctx.look = s.active.effects.reactive
    const wanted = new Set(wantedEffects(s.settings.reactive.enabled, ctx.look))
    for (const [key, effect] of running) {
      if (wanted.has(key)) continue
      effect.dispose()
      running.delete(key)
    }
    for (const key of wanted) if (!running.has(key)) running.set(key, start[key]())
    if (running.size > 0 && timer === null) {
      followColours()
      timer = setInterval(() => {
        followColours()
        for (const effect of running.values()) effect.heal()
      }, HEAL_MS)
    } else if (running.size === 0 && timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  let lastLook = store.get().active.effects.reactive
  let lastSettings = store.get().settings.reactive
  const unsubscribe = store.subscribe(s => {
    if (s.active.effects.reactive === lastLook && s.settings.reactive === lastSettings) return
    lastLook = s.active.effects.reactive
    lastSettings = s.settings.reactive
    sync()
  })
  const stopLevels = engine.onLevels(levels => {
    for (const effect of running.values()) effect.update(levels, ctx)
  })
  sync()

  return () => {
    unsubscribe()
    stopLevels()
    motion.removeEventListener('change', onMotion)
    if (timer !== null) clearInterval(timer)
    for (const effect of running.values()) effect.dispose()
    running.clear()
    style.remove()
  }
}
