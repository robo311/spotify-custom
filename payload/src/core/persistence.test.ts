import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BridgeOp, BridgeOps } from '../types'
import type { Bridge } from './bridge'
import { createPersistence } from './persistence'
import { defaultSettings } from '../theme/model'
import { PRESETS } from '../theme/presets'

/** A bridge whose writes stay in flight until the test resolves or rejects them. */
function controllableBridge(connected = true) {
  const calls: { op: BridgeOp; resolve(): void; reject(e: Error): void }[] = []
  const bridge: Bridge = {
    connected,
    call: <K extends BridgeOp>(op: K) =>
      new Promise<BridgeOps[K]['result']>((resolve, reject) => {
        calls.push({ op, resolve: () => resolve(null), reject })
      }),
    reply: () => undefined,
  }
  return { bridge, calls }
}

const theme = { ...PRESETS[0], id: 'mine' }
const settings = defaultSettings('mine')

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('save status', () => {
  it('is pending from the moment a change is queued until its write resolves, then saved', async () => {
    const { bridge, calls } = controllableBridge()
    const p = createPersistence(bridge)
    expect(p.status()).toBe('saved')
    p.saveThemeSoon(theme)
    expect(p.status()).toBe('pending')
    await vi.advanceTimersByTimeAsync(1000)
    expect(calls.map(c => c.op)).toEqual(['saveTheme'])
    expect(p.status()).toBe('pending') // written but not confirmed
    calls[0]?.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(p.status()).toBe('saved')
  })

  it('stays pending until every queued and in-flight write is done', async () => {
    const { bridge, calls } = controllableBridge()
    const p = createPersistence(bridge)
    p.saveThemeSoon(theme)
    p.saveSettingsSoon(settings)
    p.flush()
    calls[0]?.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(p.status()).toBe('pending')
    calls[1]?.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(p.status()).toBe('saved')
  })

  it('reports an error after a failed write, and a later successful write clears it', async () => {
    const { bridge, calls } = controllableBridge()
    const p = createPersistence(bridge)
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    p.saveSettingsSoon(settings)
    p.flush()
    calls[0]?.reject(new Error('disk full'))
    await vi.advanceTimersByTimeAsync(0)
    expect(p.status()).toBe('error')
    p.saveSettingsSoon(settings) // the next change retries
    expect(p.status()).toBe('pending')
    p.flush()
    calls[1]?.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(p.status()).toBe('saved')
    errorLog.mockRestore()
  })

  it('is local once writes settle when the helper is not connected', async () => {
    const { bridge, calls } = controllableBridge(false)
    const p = createPersistence(bridge)
    expect(p.status()).toBe('local')
    p.saveThemeNow(theme)
    expect(p.status()).toBe('pending')
    calls[0]?.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(p.status()).toBe('local')
  })

  it('notifies only on actual status changes', async () => {
    const { bridge, calls } = controllableBridge()
    const p = createPersistence(bridge)
    const fn = vi.fn()
    p.onStatusChange(fn)
    p.saveThemeSoon(theme)
    p.saveThemeSoon(theme)
    p.saveSettingsSoon(settings)
    expect(fn).toHaveBeenCalledTimes(1) // saved → pending
    p.flush()
    for (const c of calls) c.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(fn).toHaveBeenCalledTimes(2) // pending → saved
  })

  it('retry() re-attempts failed writes immediately and drives the status pending → saved', async () => {
    const { bridge, calls } = controllableBridge()
    const p = createPersistence(bridge)
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    p.saveThemeNow(theme)
    p.saveSettingsSoon(settings)
    p.flush()
    for (const c of calls) c.reject(new Error('helper gone'))
    await vi.advanceTimersByTimeAsync(0)
    expect(p.status()).toBe('error')

    p.retry()
    expect(p.status()).toBe('pending')
    expect(calls.slice(2).map(c => c.op).sort()).toEqual(['saveSettings', 'saveTheme'])
    calls[2]?.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(p.status()).toBe('pending')
    calls[3]?.reject(new Error('still gone'))
    await vi.advanceTimersByTimeAsync(0)
    expect(p.status()).toBe('error') // one target still failing
    p.retry()
    calls[4]?.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(p.status()).toBe('saved')
    errorLog.mockRestore()
  })

  it('replays an earlier failure on the next change to something else', async () => {
    const { bridge, calls } = controllableBridge()
    const p = createPersistence(bridge)
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    p.saveThemeNow(theme)
    calls[0]?.reject(new Error('x'))
    await vi.advanceTimersByTimeAsync(0)
    p.saveSettingsSoon(settings)
    p.flush()
    expect(calls.slice(1).map(c => c.op).sort()).toEqual(['saveSettings', 'saveTheme'])
    for (const c of calls.slice(1)) c.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(p.status()).toBe('saved')
    errorLog.mockRestore()
  })

  it('never replays a failed save of a theme that was deleted since', async () => {
    const { bridge, calls } = controllableBridge()
    const p = createPersistence(bridge)
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    p.saveThemeNow(theme)
    calls[0]?.reject(new Error('x'))
    await vi.advanceTimersByTimeAsync(0)
    p.deleteTheme(theme.id)
    calls[1]?.resolve()
    await vi.advanceTimersByTimeAsync(0)
    p.retry()
    expect(calls.map(c => c.op)).toEqual(['saveTheme', 'deleteTheme'])
    expect(p.status()).toBe('saved')
    errorLog.mockRestore()
  })

  it('ignores the outcome of an older write that finishes after a newer one', async () => {
    const { bridge, calls } = controllableBridge()
    const p = createPersistence(bridge)
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    p.saveThemeNow(theme)
    p.saveThemeNow({ ...theme, radius: 2 })
    calls[1]?.resolve()
    calls[0]?.reject(new Error('stale'))
    await vi.advanceTimersByTimeAsync(0)
    expect(p.status()).toBe('saved')
    errorLog.mockRestore()
  })
})
