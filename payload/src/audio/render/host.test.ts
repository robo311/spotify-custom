import { afterEach, describe, expect, it, vi } from 'vitest'
import { AUDIO_BANDS, encodeFrame } from '../frame'
import { startSceneHost, type HostMessage } from './host'
import type { FromScene } from './protocol'

/** A worker stand-in: records what it was sent, and lets the test answer as the worker would. */
class FakeWorker extends EventTarget {
  sent: { msg: unknown; transfer?: unknown[] }[] = []
  terminated = false
  postMessage(msg: unknown, transfer?: unknown[]) {
    this.sent.push({ msg, transfer })
  }
  terminate() {
    this.terminated = true
  }
  reply(data: FromScene) {
    this.dispatchEvent(new MessageEvent('message', { data }))
  }
  fail(message: string) {
    this.dispatchEvent(Object.assign(new Event('error'), { message }))
  }
}

const loud = encodeFrame({ level: 1, beat: 0, bands: new Array<number>(AUDIO_BANDS).fill(1) })

function canvasStub() {
  const canvas = document.createElement('canvas')
  const offscreen = { offscreen: true }
  const transfer = vi.fn(() => offscreen)
  Object.defineProperty(canvas, 'transferControlToOffscreen', { value: transfer })
  return { canvas, offscreen, transfer }
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('scene host', () => {
  it('runs the scene on the page when no worker is available', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const got: FromScene[] = []
    const host = startSceneHost(msg => got.push(msg), () => null)
    host.post({ type: 'levels', on: true })
    for (let i = 0; i < 4; i++) host.post({ type: 'frame', data: loud })
    await vi.waitFor(() => expect(got.some(m => m.type === 'levels' && m.level > 0.3)).toBe(true))
    expect(console.warn).not.toHaveBeenCalled() // no worker support isn't a failure
    host.dispose()
  })

  it('holds messages until the worker is ready, then hands canvases over by transfer', () => {
    const worker = new FakeWorker()
    const host = startSceneHost(() => undefined, () => worker as unknown as Worker)
    const { canvas, offscreen } = canvasStub()
    host.post({ type: 'attach', id: 'spectrum', canvas })
    host.post({ type: 'played', share: 0.4 })
    expect(worker.sent).toHaveLength(0)
    worker.reply({ type: 'ready' })
    expect(worker.sent).toEqual([
      { msg: { type: 'attach', id: 'spectrum', canvas: offscreen }, transfer: [offscreen] },
      { msg: { type: 'played', share: 0.4 }, transfer: undefined },
    ])
    host.post({ type: 'clear' })
    expect(worker.sent.at(-1)?.msg).toEqual({ type: 'clear' })
    host.dispose()
    expect(worker.terminated).toBe(true)
  })

  it('passes levels from the worker to the page', () => {
    const worker = new FakeWorker()
    const got: FromScene[] = []
    startSceneHost(msg => got.push(msg), () => worker as unknown as Worker)
    worker.reply({ type: 'ready' })
    const levels: FromScene = { type: 'levels', level: 0.5, bass: 0.4, beat: 0, bands: new Float32Array(AUDIO_BANDS) }
    worker.reply(levels)
    expect(got).toEqual([levels])
  })

  it("falls back to the page, with every queued message and canvas, when the worker fails to start", () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const worker = new FakeWorker()
    const host = startSceneHost(() => undefined, () => worker as unknown as Worker)
    const { canvas, transfer } = canvasStub()
    const attach: HostMessage = { type: 'attach', id: 'spectrum', canvas }
    host.post(attach)
    worker.fail('blocked by policy')
    expect(worker.terminated).toBe(true)
    expect(transfer).not.toHaveBeenCalled() // still ours to paint on the page
    expect(console.warn).toHaveBeenCalledOnce()
    host.post({ type: 'clear' })
    expect(worker.sent).toHaveLength(0)
    host.dispose()
  })

  it("falls back when the worker never says it's ready, and when creating it throws", () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const silent = new FakeWorker()
    startSceneHost(() => undefined, () => silent as unknown as Worker)
    vi.advanceTimersByTime(2500)
    expect(silent.terminated).toBe(true)
    startSceneHost(
      () => undefined,
      () => {
        throw new Error('no workers here')
      },
    )
    expect(console.warn).toHaveBeenCalledTimes(2)
  })
})
