// Page → helper RPC over the CDP binding `window.__scHelper` (protocol in types.ts).
// Falls back to a localStorage mock when the helper is absent or silent, so the payload always works.
import type { BridgeOp, BridgeOps } from '../types'
import { createMockHelper, type BridgeHandlers } from './mock-helper'

export interface Bridge {
  readonly connected: boolean // true when talking to the Go helper, false when using the mock
  call<K extends BridgeOp>(op: K, args: BridgeOps[K]['args']): Promise<BridgeOps[K]['result']>
  reply(id: number, ok: boolean, result: unknown): void
}

export interface BridgeOptions {
  timeoutMs?: number
  mock?: BridgeHandlers
}

interface Pending {
  resolve(value: unknown): void
  reject(error: Error): void
  timer: ReturnType<typeof setTimeout>
}

/** Uses window.__scHelper when present; otherwise a localStorage-backed mock (dev injection without helper, tests). */
export function createBridge(opts: BridgeOptions = {}): Bridge {
  const timeoutMs = opts.timeoutMs ?? 4000
  const mock = opts.mock ?? createMockHelper()
  const pending = new Map<number, Pending>()
  // Random start so replies meant for a previous (hot-reloaded) instance can't match ours.
  let nextId = Math.floor(Math.random() * 1e9)
  let useMock = typeof window.__scHelper !== 'function'

  const callMock = <K extends BridgeOp>(op: K, args: BridgeOps[K]['args']): BridgeOps[K]['result'] =>
    (mock[op] as (a: BridgeOps[K]['args']) => BridgeOps[K]['result'])(args)

  const callHelper = (op: BridgeOp, args: unknown): Promise<unknown> =>
    new Promise((resolve, reject) => {
      const send = window.__scHelper
      if (!send) {
        reject(new Error('Helper binding disappeared'))
        return
      }
      const id = nextId++
      const timer = setTimeout(() => {
        pending.delete(id)
        reject(new Error(`The helper did not answer "${op}" in time`))
      }, timeoutMs)
      pending.set(id, { resolve, reject, timer })
      send(JSON.stringify({ id, op, args }))
    })

  return {
    get connected() {
      return !useMock
    },

    async call(op, args) {
      if (useMock) return callMock(op, args)
      try {
        // The helper speaks the contract in types.ts; this is the trust boundary.
        return (await callHelper(op, args)) as BridgeOps[typeof op]['result']
      } catch (e) {
        if (op !== 'getState') throw e
        console.warn('[spotify-custom] helper not responding, using browser storage instead', e)
        useMock = true
        return callMock(op, args)
      }
    },

    reply(id, ok, result) {
      const p = pending.get(id)
      if (!p) return
      pending.delete(id)
      clearTimeout(p.timer)
      if (ok) p.resolve(result)
      else p.reject(new Error(typeof result === 'string' ? result : 'Helper error'))
    },
  }
}
