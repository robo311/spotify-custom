// Music-reactive: the page side. The helper hears Spotify's own output and sends small analysis frames; this module
// smooths them, decides when the helper should listen at all, and drives the effects. Public surface only.
import type { AudioStatus, ScGlobal, Store } from '../types'
import type { Bridge } from '../core/bridge'
import { spotify } from '../spotify'
import { startAudioEngine, type AudioEngine } from './engine'
import { startReactiveEffects } from './effects/controller'
import type { AudioLevels } from './envelope'

export type { AudioLevels } from './envelope'
export { encodeFrame, AUDIO_BANDS } from './frame'

/** A channel that drops everything: in place until the engine starts, so early helper pushes are harmless. */
export const idleAudioChannel: ScGlobal['audio'] = { frame: () => undefined, status: () => undefined }

let current: AudioEngine | null = null

/** Starts the engine and the effects; returns the helper → page channel and a disposer. */
export function startReactive(store: Store, bridge: Bridge): { channel: ScGlobal['audio']; dispose(): void } {
  const engine = startAudioEngine({
    store,
    helperConnected: bridge.connected,
    send: on => bridge.call('audio', { on }),
    onPlaying: spotify.onPlaying,
  })
  const stopEffects = startReactiveEffects(engine, store)
  current = engine
  return {
    channel: engine.channel,
    dispose() {
      stopEffects()
      engine.dispose()
      if (current === engine) current = null
    },
  }
}

const OFF: AudioStatus = { state: 'off', latencyMs: 0 }

/** Read side for the studio: the helper's status and the live levels (for the meter). */
export const reactiveMonitor = {
  status: (): AudioStatus => current?.status() ?? OFF,
  onStatus: (fn: (s: AudioStatus) => void): (() => void) => current?.onStatus(fn) ?? (() => undefined),
  onLevels: (fn: (l: AudioLevels) => void): (() => void) => current?.onLevels(fn) ?? (() => undefined),
}
