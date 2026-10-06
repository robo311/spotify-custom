import { describe, expect, it, vi } from 'vitest'
import { PRESETS } from './presets'

const compileTheme = vi.fn((t: { id: string }) => `css:${t.id}`)
vi.mock('./compile', () => ({ compileTheme: (t: { id: string }) => compileTheme(t) }))

const { createCompileCache, hashString } = await import('./compile-cache')

describe('compile cache', () => {
  const ctx = { iconPacks: [] }

  it('compiles each distinct theme once', () => {
    compileTheme.mockClear()
    const cache = createCompileCache()
    for (let i = 0; i < 3; i++) for (const p of PRESETS) cache.compile(p, ctx)
    expect(compileTheme).toHaveBeenCalledTimes(PRESETS.length)
    expect(cache.compile(structuredClone(PRESETS[0]), ctx)).toBe('css:darcula')
    expect(compileTheme).toHaveBeenCalledTimes(PRESETS.length)
  })

  it('recompiles when content or context changes, and after clear()', () => {
    compileTheme.mockClear()
    const cache = createCompileCache()
    cache.compile(PRESETS[0], ctx)
    cache.compile({ ...PRESETS[0], radius: 3 }, ctx)
    cache.compile(PRESETS[0], { ...ctx, fileCss: 'a {}' })
    cache.clear()
    cache.compile(PRESETS[0], ctx)
    expect(compileTheme).toHaveBeenCalledTimes(4)
  })

  it('hashes deterministically and distinguishes small changes', () => {
    expect(hashString('abc')).toBe(hashString('abc'))
    expect(hashString('abc')).not.toBe(hashString('abd'))
  })
})
