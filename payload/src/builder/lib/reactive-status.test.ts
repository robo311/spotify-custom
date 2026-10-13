import { describe, expect, it } from 'vitest'
import type { AudioStatus } from '../../types'
import { reactiveStatusLine } from './reactive-status'

const on = { enabled: true, anyEffectOn: true, platform: 'darwin' as const, remote: false }
const status = (state: AudioStatus['state'], message?: string): AudioStatus => ({ state, latencyMs: 0, ...(message ? { message } : {}) })

describe('reactiveStatusLine', () => {
  it('says off while the master switch is off, whatever the helper reports', () => {
    expect(reactiveStatusLine(status('listening'), { ...on, enabled: false }).title).toBe('Off')
  })

  it('distinguishes waiting for music from having nothing to drive', () => {
    expect(reactiveStatusLine(status('off'), on).title).toBe('Waiting for music')
    expect(reactiveStatusLine(status('off'), { ...on, anyEffectOn: false }).title).toBe('Pick an effect below')
  })

  // Windows has no audio permission to point to.
  it('gives Windows its own advice when no sound arrives', () => {
    const line = reactiveStatusLine(status('no-signal'), { ...on, platform: 'windows' })
    expect(line.tone).toBe('warn')
    expect(line.detail).toContain('volume')
    expect(line.detail).not.toContain('System Settings')
  })

  // With Spotify Connect the sound plays on the other device; this computer's Spotify stays silent.
  it('says when Spotify is playing on another device, on either system', () => {
    for (const platform of ['darwin', 'windows'] as const) {
      const line = reactiveStatusLine(status('no-signal'), { ...on, platform, remote: true })
      expect(line.title).toBe('Playing on another device')
      expect(line.detail).not.toContain('System Settings')
    }
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
    expect(reactiveStatusLine(status('unsupported'), on).detail).toContain('Windows 10 version 2004')
    expect(reactiveStatusLine(status('listening'), on).tone).toBe('live')
  })
})
