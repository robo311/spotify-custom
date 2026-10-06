// Music-reactive runtime: receives the helper's frames and statuses (window.__sc.audio), tells the helper when to
// listen, and turns the frames into smooth levels once per display frame for the effects and the studio's meter.
// The animation loop only runs while frames arrive or levels are still decaying.
import type { AudioStatus, ScGlobal, Store } from '../types'
import { createDelayBuffer, emptyFrame } from './delay'
import { createEnvelope, type AudioLevels } from './envelope'
import { decodeFrame } from './frame'
import { anyEffectOn, captureWanted, createWantSender } from './wanted'

/** After the newest frame is this old (plus the sync delay) the stream counts as stopped. */
const STREAM_GAP_MS = 400
const MAX_STEP_MS = 100

export interface AudioEngineDeps {
  store: Store
  helperConnected: boolean
  send: (on: boolean) => Promise<AudioStatus>
  onPlaying: (fn: (playing: boolean) => void) => () => void
}

export interface AudioEngine {
  readonly channel: ScGlobal['audio']
  status(): AudioStatus
  onStatus(fn: (s: AudioStatus) => void): () => void
  /** Called once per display frame while sound is moving, and once more when it has settled to silence. */
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
  const buffer = createDelayBuffer()
  const envelope = createEnvelope()
  const scratch = emptyFrame()
  const statusFns = new Set<(s: AudioStatus) => void>()
  const levelFns = new Set<(l: AudioLevels) => void>()
  let status: AudioStatus = { state: 'off', latencyMs: 0 }
  let frame = 0
  let lastTick = 0
  let lastSampleAt = -Infinity
  let playing = false
  let disposed = false

  const setStatus = (next: AudioStatus) => {
    status = next
    if (next.state !== 'listening') buffer.clear()
    for (const fn of statusFns) fn(next)
  }
  const sender = createWantSender(deps.send, setStatus)

  const delayMs = () => Math.max(0, status.latencyMs + store.get().settings.reactive.syncMs)

  // Frames are stamped with performance.now(), so the loop uses the same clock (not rAF's frame-start time).
  const tick = () => {
    const now = performance.now()
    frame = 0
    const dt = Math.min(MAX_STEP_MS, now - lastTick)
    lastTick = now
    const t = now - delayMs()
    const has = buffer.sample(t, scratch)
    const beat = buffer.beatBetween(lastSampleAt, t)
    lastSampleAt = t
    const levels = envelope.step(has ? scratch : null, beat, dt, store.get().active.effects.reactive.sensitivity)
    for (const fn of levelFns) fn(levels)
    const streaming = now - buffer.newest() < STREAM_GAP_MS + delayMs()
    if (streaming || !envelope.settled()) frame = requestAnimationFrame(tick)
  }
  const wake = () => {
    if (frame !== 0 || disposed) return
    lastTick = performance.now()
    frame = requestAnimationFrame(tick)
  }

  const refreshWanted = () => {
    const s = store.get()
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
        if (disposed) return
        const decoded = decodeFrame(base64)
        if (!decoded) return
        buffer.push(decoded, performance.now())
        wake()
      },
      status(s) {
        const next = toStatus(s)
        if (next && !disposed) setStatus(next)
      },
    },
    status: () => status,
    onStatus(fn) {
      statusFns.add(fn)
      return () => statusFns.delete(fn)
    },
    onLevels(fn) {
      levelFns.add(fn)
      return () => levelFns.delete(fn)
    },
    dispose() {
      disposed = true
      unsubscribeStore()
      stopPlaying()
      document.removeEventListener('visibilitychange', refreshWanted)
      sender.dispose()
      if (frame !== 0) cancelAnimationFrame(frame)
      statusFns.clear()
      levelFns.clear()
    },
  }
}
