import { describe, expect, it } from 'vitest'
import { FONT_CHOICES, fontFaces, spotifyFontVars } from './fonts'
import { validateTheme } from './model'
import { compileLyrics } from '../parts/lyrics'
import { PRESETS } from './presets'

describe('font registry', () => {
  it('bundles every font a choice names with an "SC " family', () => {
    const faces = fontFaces()
    const bundled = FONT_CHOICES.flatMap(f => [...f.stack.matchAll(/"(SC [^"]+)"/g)].map(m => m[1]))
    expect(bundled).toEqual(['SC Inter', 'SC Outfit', 'SC Space Grotesk', 'SC Nunito', 'SC Fraunces', 'SC Mono'])
    for (const family of bundled) {
      // One face for latin, one for latin-ext.
      expect(faces.split(`font-family: "${family}";`)).toHaveLength(3)
    }
  })

  it('points Spotify at the chosen font, and leaves it alone for "spotify"', () => {
    expect(spotifyFontVars('fraunces')?.['--encore-body-font-stack']).toBe('"SC Fraunces", var(--fallback-fonts, serif)')
    expect(spotifyFontVars('spotify')).toBeNull()
  })

  it('keeps the new fonts through validation, for the theme and the lyrics', () => {
    const base = PRESETS[0]
    const t = validateTheme({ ...base, font: 'nunito', lyrics: { ...base.lyrics, font: 'space-grotesk' } })
    expect([t.font, t.lyrics.font]).toEqual(['nunito', 'space-grotesk'])
    expect(compileLyrics(t.lyrics)).toContain('font-family: "SC Space Grotesk", var(--fallback-fonts, sans-serif) !important;')
  })
})
