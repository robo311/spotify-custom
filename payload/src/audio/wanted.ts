// When the helper should be listening, and telling it so. Capture runs only while it can matter: switched on, an
// effect picked, music playing and the window visible. Anything else closes the tap (not just ignores it).
import type { AudioStatus, ReactiveLook } from '../types'

export interface WantInputs {
  enabled: boolean // Settings.reactive.enabled
  anyEffectOn: boolean
  playing: boolean
  visible: boolean
  helperConnected: boolean
}

export function captureWanted(i: WantInputs): boolean {
  return i.enabled && i.anyEffectOn && i.playing && i.visible && i.helperConnected
}

export function anyEffectOn(look: ReactiveLook): boolean {
  return look.spectrum.on || look.pulse.on || look.background.on || look.lyrics.on
}

/** Pausing between songs or a quick window switch shouldn't close and reopen the tap. */
export const OFF_DELAY_MS = 2000

export interface WantSender {
  set(on: boolean): void
  dispose(): void
}

/**
 * Sends the wish to the helper: on immediately, off after OFF_DELAY_MS unless on comes back first. The first wish is
 * sent at once either way, so a reloaded page stops a capture its previous instance left running. Statuses from
 * superseded calls are dropped.
 */
export function createWantSender(
  send: (on: boolean) => Promise<AudioStatus>,
  onStatus: (s: AudioStatus) => void,
  offDelayMs = OFF_DELAY_MS,
): WantSender {
  let sent: boolean | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let seq = 0
  let disposed = false

  const cancelTimer = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }
  const transmit = (on: boolean) => {
    sent = on
    const id = ++seq
    send(on).then(
      status => {
        if (id === seq && !disposed) onStatus(status)
      },
      (e: unknown) => {
        if (id === seq && !disposed) onStatus({ state: 'error', latencyMs: 0, message: e instanceof Error ? e.message : String(e) })
      },
    )
  }

  return {
    set(on) {
      if (disposed) return
      if (on) {
        cancelTimer()
        if (sent !== true) transmit(true)
        return
      }
      if (sent === null) transmit(false)
      else if (sent && timer === null) {
        timer = setTimeout(() => {
          timer = null
          transmit(false)
        }, offDelayMs)
      }
    },
    dispose() {
      cancelTimer()
      if (sent) transmit(false)
      disposed = true
    },
  }
}
