import { describe, expect, it, vi } from 'vitest'
import { compileTheme, isNativePalette } from './compile'
import { PRESETS, SPOTIFY_ORIGINAL_ID } from './presets'

// Parts/icons belong to other modules; here we only check that compile composes them in order.
vi.mock('../parts', () => ({
  compileParts: () => '/* parts-marker */',
  compileLayout: () => '/* layout-marker */',
}))
vi.mock('../icons', () => ({
  compileIcons: (pack: string) => `/* icons-marker ${pack} */`,
  BUILTIN_ICON_PACKS: [],
}))

const ctx = { iconPacks: [] }

describe('compileTheme', () => {
  it.each(PRESETS.map(p => [p.id, p] as const))('compiles %s deterministically', (_id, preset) => {
    const css = compileTheme(preset, ctx)
    expect(css).toBe(compileTheme(structuredClone(preset), ctx))
    expect(css).toMatchSnapshot()
  })

  it('leaves Spotify Original native: no Encore overrides, no font or radius changes', () => {
    const original = PRESETS.find(p => p.id === SPOTIFY_ORIGINAL_ID)
    if (!original) throw new Error('missing preset')
    const css = compileTheme(original, ctx)
    expect(isNativePalette(original.palette)).toBe(true)
    expect(css).not.toContain('encore-dark-theme')
    expect(css).not.toContain('--encore-body-font-stack')
    expect(css).not.toContain('--section-border-radius')
  })

  it('orders sections so user CSS wins: variables, encore, parts, layout, icons, css, file css', () => {
    const css = compileTheme({ ...PRESETS[0], css: '/* user-css */' }, { ...ctx, fileCss: '/* file-css */' })
    const order = ['--sc-background', 'encore-dark-theme', 'parts-marker', 'layout-marker', 'icons-marker line', 'user-css', 'file-css'].map(m => css.indexOf(m))
    expect(order.every(i => i >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })
})
