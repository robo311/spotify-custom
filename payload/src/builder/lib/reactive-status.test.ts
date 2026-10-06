import { describe, expect, it } from 'vitest'
import type { AudioStatus } from '../../types'
import { reactiveStatusLine } from './reactive-status'

const on = { enabled: true, anyEffectOn: true }
const status = (state: AudioStatus['state'], message?: string): AudioStatus => ({ state, latencyMs: 0, ...(message ? { message } : {}) })

describe('reactiveStatusLine', () => {
  it('says off while the master switch is off, whatever the helper reports', () => {
    expect(reactiveStatusLine(status('listening'), { enabled: false, anyEffectOn: true }).title).toBe('Off')
  })

  it('distinguishes waiting for music from having nothing to drive', () => {
    expect(reactiveStatusLine(status('off'), on).title).toBe('Waiting for music')
    expect(reactiveStatusLine(status('off'), { enabled: true, anyEffectOn: false }).title).toBe('Pick an effect below')
  })

  it('points to the macOS setting when permission is missing or no sound arrives', () => {
    for (const state of ['needs-permission', 'no-signal'] as const) {
      const line = reactiveStatusLine(status(state), on)
      expect(line.tone).toBe('warn')
      expect(line.detail).toContain('Screen & System Audio Recording')
    }
  })

  it("shows the helper's own message when it has one", () => {
    expect(reactiveStatusLine(status('unsupported', "The helper isn't connected"), on).detail).toBe("The helper isn't connected")
    expect(reactiveStatusLine(status('unsupported'), on).detail).toContain('Windows 11')
    expect(reactiveStatusLine(status('listening'), on).tone).toBe('live')
  })
})
