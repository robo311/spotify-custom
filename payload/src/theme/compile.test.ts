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

  // Spotify's `.spotify-mix-non-latin` (on <html>) sets the font stacks !important inside @layer fonts,
  // which nothing unlayered on :root can beat; declaring them on body sidesteps it via inheritance.
  it('declares the theme font on body, not :root', () => {
    const css = compileTheme({ ...PRESETS[0], font: 'fraunces' }, ctx)
    expect(css).toMatch(/body \{[^}]*--encore-body-font-stack: "SC Fraunces"/)
    expect(css).not.toMatch(/:root \{[^}]*--encore-body-font-stack/)
  })

  // Our own surfaces (Your listening shelf, now playing) read --sc-font-ui, so it must follow the theme font.
  it('points --sc-font-ui at the theme font', () => {
    const css = compileTheme({ ...PRESETS[0], font: 'fraunces' }, ctx)
    expect(css).toContain('--sc-font-ui: "SC Fraunces", var(--fallback-fonts, serif);')
  })

  it('orders sections so user CSS wins: variables, encore, parts, layout, icons, css, file css', () => {
    const css = compileTheme({ ...PRESETS[0], css: '/* user-css */' }, { ...ctx, fileCss: '/* file-css */' })
    const order = ['--sc-background', 'encore-dark-theme', 'parts-marker', 'layout-marker', 'icons-marker line', 'user-css', 'file-css'].map(m => css.indexOf(m))
    expect(order.every(i => i >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })
})
