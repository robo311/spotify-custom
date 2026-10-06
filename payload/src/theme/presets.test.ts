import { describe, expect, it } from 'vitest'
import { CONTRAST_PAIRS, MIN_ACCENT_CONTRAST, MIN_TEXT_CONTRAST, contrastRatio } from './palette'
import { lightness } from './color'
import { PRESETS, DEFAULT_PRESET_ID } from './presets'
import { validateTheme } from './model'

describe('presets', () => {
  it('ships the 10 agreed presets with unique ids, default first', () => {
    expect(PRESETS.map(p => p.id)).toEqual([
      'darcula',
      'spotify-original',
      'catppuccin-mocha',
      'tokyo-night',
      'gruvbox-dark',
      'nord',
      'midnight-blue',
      'sunset',
      'forest',
      'mono',
    ])
    expect(PRESETS[0]?.id).toBe(DEFAULT_PRESET_ID)
  })

  describe.each(PRESETS.map(p => [p.name, p] as const))('%s', (_name, preset) => {
    it('is a valid theme that survives validation unchanged', () => {
      expect(validateTheme(preset)).toEqual(preset)
    })

    it.each(CONTRAST_PAIRS)('%s on %s is readable', (fg, bg) => {
      expect(contrastRatio(preset.palette[fg], preset.palette[bg])).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
    })

    it('has an accent that stands out from surfaces', () => {
      for (const bg of ['background', 'surface', 'elevated'] as const) {
        expect(contrastRatio(preset.palette.accent, preset.palette[bg])).toBeGreaterThanOrEqual(MIN_ACCENT_CONTRAST)
      }
    })

    it('keeps elevated distinguishable from surface and background', () => {
      const { elevated, surface, background } = preset.palette
      expect(Math.abs(lightness(elevated) - lightness(surface))).toBeGreaterThanOrEqual(0.03)
      expect(Math.abs(lightness(elevated) - lightness(background))).toBeGreaterThanOrEqual(0.03)
    })
  })

  it('gives Spotify Original native lyrics and every other preset themed lyrics', () => {
    for (const p of PRESETS) {
      if (p.id === 'spotify-original') expect(p.lyrics.background).toBe('spotify')
      else expect(p.lyrics.background).not.toBe('spotify')
    }
  })

  it.each(PRESETS.flatMap(p => (p.lyrics.activeLine ? [[p.name, p] as const] : [])))('%s keeps the sung lyric line readable', (_n, p) => {
    expect(contrastRatio(p.lyrics.activeLine ?? '', p.palette.background)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
  })

  it('picks a progress bar per mood: native for Spotify Original, animated styles elsewhere', () => {
    const style = Object.fromEntries(PRESETS.map(p => [p.id, p.effects.progressBar]))
    expect(style).toEqual({
      darcula: 'glow',
      'spotify-original': 'spotify',
      'catppuccin-mocha': 'glow',
      'tokyo-night': 'glow',
      'gruvbox-dark': 'glow',
      nord: 'glow',
      'midnight-blue': 'flow',
      sunset: 'flow',
      forest: 'wave',
      mono: 'glow',
    })
  })

  it('shows our Now playing column on the lyrics page exactly for the cover-blur moods', () => {
    for (const p of PRESETS) expect(p.layout.lyricsNowPlaying).toBe(p.lyrics.background === 'cover-blur')
  })
})
