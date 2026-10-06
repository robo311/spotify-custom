import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBridge } from './bridge'
import { createMockHelper } from './mock-helper'
import { PRESETS } from '../theme/presets'

const theme = PRESETS[0]

afterEach(() => {
  delete window.__scHelper
  localStorage.clear()
  vi.useRealTimers()
})

describe('bridge', () => {
  it('uses the localStorage mock when the helper binding is absent', async () => {
    const bridge = createBridge()
    expect(bridge.connected).toBe(false)
    await bridge.call('saveTheme', { ...theme, id: 'mine' })
    const state = await bridge.call('getState', null)
    expect(state.platform).toBe('mock')
    expect(state.userThemes.map(t => t.id)).toEqual(['mine'])
    await bridge.call('deleteTheme', { id: 'mine' })
    expect((await bridge.call('getState', null)).userThemes).toEqual([])
  })

  it('sends calls through the binding and resolves on reply', async () => {
    const sent: { id: number; op: string; args: unknown }[] = []
    window.__scHelper = msg => sent.push(JSON.parse(msg) as { id: number; op: string; args: unknown })
    const bridge = createBridge()
    expect(bridge.connected).toBe(true)
    const result = bridge.call('openFolder', { sub: 'themes' })
    expect(sent[0]).toMatchObject({ op: 'openFolder', args: { sub: 'themes' } })
    bridge.reply(sent[0].id, true, null)
    await expect(result).resolves.toBeNull()
  })

  it('rejects with the helper error message', async () => {
    let id = 0
    window.__scHelper = msg => {
      id = (JSON.parse(msg) as { id: number }).id
    }
    const bridge = createBridge()
    const result = bridge.call('deleteTheme', { id: 'x' })
    bridge.reply(id, false, 'disk full')
    await expect(result).rejects.toThrow('disk full')
  })

  it('falls back to the mock when the helper does not answer getState', async () => {
    vi.useFakeTimers()
    window.__scHelper = () => undefined
    const bridge = createBridge({ timeoutMs: 50, mock: createMockHelper(localStorage) })
    const state = bridge.call('getState', null)
    await vi.advanceTimersByTimeAsync(60)
    await expect(state).resolves.toMatchObject({ platform: 'mock' })
    expect(bridge.connected).toBe(false)
  })

  it('ignores replies it did not ask for (e.g. meant for a previous instance)', () => {
    window.__scHelper = () => undefined
    expect(() => createBridge().reply(123, true, null)).not.toThrow()
  })
})
