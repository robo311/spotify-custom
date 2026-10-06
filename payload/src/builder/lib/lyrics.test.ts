import type { LyricsBackground, Palette } from '../../types'
import { contrastRatio } from '../../theme/palette'
import { defaultLyrics } from '../../theme/model'
import { autoLyricLines, resolveLyricLines } from './lyrics'

const palette: Palette = {
  background: '#1e1f22',
  surface: '#2b2d30',
  elevated: '#393b40',
  text: '#dfe1e5',
  textSubdued: '#a8adb5',
  accent: '#548af7',
  onAccent: '#0b1220',
  border: '#43454a',
}
const backgroundColour: Record<Exclude<LyricsBackground, 'spotify' | 'cover-blur'>, string> = {
  theme: palette.background,
  accent: palette.accent,
}

describe('autoLyricLines', () => {
  it.each(Object.entries(backgroundColour))('keeps the sung line readable on the %s background', (bg, colour) => {
    const lines = autoLyricLines(bg as LyricsBackground, palette)
    expect(contrastRatio(lines.activeLine, colour)).toBeGreaterThanOrEqual(4.5)
  })

  it('makes the sung line stand out most, then past lines, then upcoming ones', () => {
    for (const [bg, colour] of Object.entries(backgroundColour)) {
      const l = autoLyricLines(bg as LyricsBackground, palette)
      expect(contrastRatio(l.activeLine, colour)).toBeGreaterThan(contrastRatio(l.pastLine, colour))
    }
  })
})

describe('resolveLyricLines', () => {
  it('uses chosen colours and fills the rest automatically', () => {
    const lyrics = { ...defaultLyrics(), background: 'theme' as const, activeLine: '#ff0000' }
    expect(resolveLyricLines(lyrics, palette)).toEqual({ activeLine: '#ff0000', inactiveLine: palette.textSubdued, pastLine: autoLyricLines('theme', palette).pastLine })
  })
})
