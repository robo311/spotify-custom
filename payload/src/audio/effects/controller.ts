// Starts and stops each music-reactive effect from the settings (master switch + its own toggle) and keeps the scene
// told about the colours they follow. Effects the scene paints never see the levels here; the page listens for levels
// only while an effect on Spotify's own elements (pulse, lyrics) runs.
import type { ReactiveLook, Store } from '../../types'
import { coverColors } from '../../theme/cover-colors'
import type { AudioEngine } from '../engine'
import { LYRICS_VIEW_STATE_ATTRS, NOW_PLAYING_COVER_IMAGE } from '../selectors'
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
  let sent: EffectContext | null = null
  const sendContext = () => {
    if (sent?.look === ctx.look && sent.accent === ctx.accent && sent.cover === ctx.cover && sent.reducedMotion === ctx.reducedMotion) return
    sent = { ...ctx }
    engine.paint.context(sent)
  }
  const onMotion = () => {
    ctx.reducedMotion = motion.matches
    sendContext()
  }
  motion.addEventListener('change', onMotion)

  const running = new Map<EffectKey, ReactiveEffect>()
  const start: Record<EffectKey, () => ReactiveEffect> = {
    spectrum: () => startSpectrum(engine.paint),
    pulse: startPulse,
    background: () => startBackdrop(engine.paint),
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
    sendContext()
    const src = document.querySelector(NOW_PLAYING_COVER_IMAGE)?.getAttribute('src') ?? null
    if (src === coverSrc) return
    coverSrc = src
    const setCover = (cover: string | null) => {
      if (src !== coverSrc) return
      ctx.cover = cover
      sendContext()
    }
    if (!src) {
      setCover(null)
      return
    }
    coverColors(src).then(
      colors => setCover(colors.vivid),
      () => setCover(null),
    )
  }

  let stopLevels: (() => void) | null = null
  const listenForLevels = () => {
    const needed = [...running.values()].some(effect => effect.update !== undefined && (effect.wantsLevels?.() ?? true))
    if (needed && !stopLevels) {
      stopLevels = engine.onLevels(levels => {
        for (const effect of running.values()) effect.update?.(levels, ctx)
      })
    } else if (!needed && stopLevels) {
      stopLevels()
      stopLevels = null
    }
  }

  let timer: ReturnType<typeof setInterval> | null = null
  const sync = () => {
    const s = store.get()
    ctx.look = s.active.effects.reactive
    sendContext()
    const wanted = new Set(wantedEffects(s.settings.reactive.enabled, ctx.look))
    for (const [key, effect] of running) {
      if (wanted.has(key)) continue
      effect.dispose()
      running.delete(key)
    }
    for (const key of wanted) if (!running.has(key)) running.set(key, start[key]())
    listenForLevels()
    if (running.size > 0 && timer === null) {
      followColours()
      timer = setInterval(() => {
        followColours()
        for (const effect of running.values()) effect.heal()
        listenForLevels()
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
  // The lyrics view opening or closing: lyrics react may start or stop wanting levels now, not at the next heal.
  const lyricsView = new MutationObserver(listenForLevels)
  lyricsView.observe(document.documentElement, { attributes: true, attributeFilter: LYRICS_VIEW_STATE_ATTRS })
  sync()

  return () => {
    unsubscribe()
    lyricsView.disconnect()
    stopLevels?.()
    motion.removeEventListener('change', onMotion)
    if (timer !== null) clearInterval(timer)
    for (const effect of running.values()) effect.dispose()
    running.clear()
    style.remove()
  }
}
