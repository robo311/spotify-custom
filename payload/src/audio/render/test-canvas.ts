// Test helper: a canvas whose 2D context records what was drawn (happy-dom has no canvas drawing).
import type { PaintTarget } from './protocol'

export interface FakeCanvas extends PaintTarget {
  /** Method calls in order, e.g. ['clearRect', 'fillRect', …]. */
  calls: string[]
  /** globalAlpha at each fillRect. */
  alphas: number[]
}

export function fakeCanvas(): FakeCanvas {
  const calls: string[] = []
  const alphas: number[] = []
  const state: Record<string, unknown> = { globalAlpha: 1 }
  const g = new Proxy(state, {
    get(target, key: string) {
      if (key in target) return target[key]
      return () => {
        calls.push(key)
        if (key === 'fillRect') alphas.push(target.globalAlpha as number)
        if (key === 'createRadialGradient') return { addColorStop: () => undefined }
        return undefined
      }
    },
    set(target, key: string, value: unknown) {
      target[key] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D
  return { width: 300, height: 150, calls, alphas, getContext: () => g }
}
