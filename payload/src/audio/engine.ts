// Music-reactive runtime: receives the helper's frames and statuses (window.__sc.audio), tells the helper when to
// listen, and hands the frames to the scene (render/), which smooths them and paints our canvases, in a worker when it
// can. Levels come back to the page only while something here listens (effects on Spotify's elements, the studio's
// meter).
import type { AudioStatus, ScGlobal, Store } from '../types'
import type { PaintPort } from './effects/effect'
import type { AudioLevels } from './envelope'
import { AUDIO_BANDS } from './frame'
import { startSceneHost, startWorker } from './render/host'
import type { FromScene, PaintContext } from './render/protocol'
import { anyEffectOn, captureWanted, createWantSender } from './wanted'

export interface AudioEngineDeps {
  store: Store
  helperConnected: boolean
  send: (on: boolean) => Promise<AudioStatus>
  onPlaying: (fn: (playing: boolean) => void) => () => void
  /** Where the scene may run; tests pass () => null to keep it on the page. */
  worker?: () => Worker | null
}

export interface AudioEngine {
  readonly channel: ScGlobal['audio']
  /** For effects that paint a canvas of ours: the scene does the painting. */
  readonly paint: PaintPort & { context(ctx: PaintContext): void }
  status(): AudioStatus
  onStatus(fn: (s: AudioStatus) => void): () => void
  /** Called every painted frame (up to 30/s) while sound is moving, and once more when it has settled to silence. */
  onLevels(fn: (levels: AudioLevels) => void): () => void
  dispose(): void
}

const STATES: readonly AudioStatus['state'][] = ['off', 'starting', 'listening', 'no-signal', 'needs-permission', 'unsupported', 'error']

/** The helper is ours, but a malformed status must not break the studio. */
function toStatus(value: unknown): AudioStatus | null {
  if (typeof value !== 'object' || value === null) return null
  const v = value as Record<string, unknown>
  if (!STATES.includes(v.state as AudioStatus['state'])) return null
  const latency = typeof v.latencyMs === 'number' && Number.isFinite(v.latencyMs) ? Math.max(0, Math.min(1000, v.latencyMs)) : 0
  return {
    state: v.state as AudioStatus['state'],
    latencyMs: latency,
    ...(typeof v.message === 'string' && v.message ? { message: v.message } : {}),
  }
}

export function startAudioEngine(deps: AudioEngineDeps): AudioEngine {
  const { store } = deps
  const statusFns = new Set<(s: AudioStatus) => void>()
  const levelFns = new Set<(l: AudioLevels) => void>()
  const levels: AudioLevels = { level: 0, bass: 0, beat: 0, bands: new Float32Array(AUDIO_BANDS) }
  let status: AudioStatus = { state: 'off', latencyMs: 0 }
  let playing = false
  let disposed = false

  const host = startSceneHost((msg: FromScene) => {
    if (msg.type !== 'levels' || disposed) return
    levels.level = msg.level
    levels.bass = msg.bass
    levels.beat = msg.beat
    levels.bands.set(msg.bands)
    for (const fn of levelFns) fn(levels)
  }, deps.worker ?? startWorker)

  let timing = { delayMs: -1, sensitivity: -1 }
  const sendTiming = () => {
    const s = store.get()
    const next = { delayMs: Math.max(0, status.latencyMs + s.settings.reactive.syncMs), sensitivity: s.active.effects.reactive.sensitivity }
    if (next.delayMs === timing.delayMs && next.sensitivity === timing.sensitivity) return
    timing = next
    host.post({ type: 'timing', ...next })
  }

  const setStatus = (next: AudioStatus) => {
    status = next
    if (next.state !== 'listening') host.post({ type: 'clear' })
    sendTiming()
    for (const fn of statusFns) fn(next)
  }
  const sender = createWantSender(deps.send, setStatus)

  const refreshWanted = () => {
    const s = store.get()
    sendTiming()
    sender.set(
      captureWanted({
        enabled: s.settings.reactive.enabled,
        anyEffectOn: anyEffectOn(s.active.effects.reactive),
        playing,
        visible: document.visibilityState === 'visible',
        helperConnected: deps.helperConnected,
      }),
    )
  }

  const unsubscribeStore = store.subscribe(refreshWanted)
  const stopPlaying = deps.onPlaying(p => {
    playing = p
    refreshWanted()
  })
  document.addEventListener('visibilitychange', refreshWanted)
  refreshWanted()

  return {
    channel: {
      frame(base64) {
        if (!disposed) host.post({ type: 'frame', data: base64 })
      },
      status(s) {
        const next = toStatus(s)
        if (next && !disposed) setStatus(next)
      },
    },
    paint: {
      attach: (id, canvas) => host.post({ type: 'attach', id, canvas }),
      size: (id, width, height, dpr) => host.post({ type: 'size', id, width, height, dpr }),
      played: share => host.post({ type: 'played', share }),
      detach: id => host.post({ type: 'detach', id }),
      context: context => host.post({ type: 'context', context }),
    },
    status: () => status,
    onStatus(fn) {
      statusFns.add(fn)
      return () => statusFns.delete(fn)
    },
    onLevels(fn) {
      levelFns.add(fn)
      if (levelFns.size === 1) host.post({ type: 'levels', on: true })
      return () => {
        if (levelFns.delete(fn) && levelFns.size === 0 && !disposed) host.post({ type: 'levels', on: false })
      }
    },
    dispose() {
      disposed = true
      unsubscribeStore()
      stopPlaying()
      document.removeEventListener('visibilitychange', refreshWanted)
      sender.dispose()
      host.dispose()
      statusFns.clear()
      levelFns.clear()
    },
  }
}
