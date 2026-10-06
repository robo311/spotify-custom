// The one rule for automatic lyric line colours on each lyrics background. Pure: the theme CSS renders it with
// palette variables and CSS color-mix (so colours follow live palette changes such as Album Mode); the builder
// renders it with concrete palette colours and its own mixer for previews and "Auto" swatches.
import type { LyricsBackground, LyricsStyle, Palette } from '../types'

export interface LyricLineColors {
  activeLine: string
  inactiveLine: string
  pastLine: string
}

/** Mixes a towards b; t = share of b (0 = a, 1 = b). */
export type ColorMixer = (a: string, b: string, t: number) => string

/** CSS rendering of a mix: sRGB interpolation, the same as a linear RGB lerp. */
export const cssMix: ColorMixer = (a, b, t) => `color-mix(in srgb, ${a} ${Math.round((1 - t) * 1000) / 10}%, ${b})`

export function autoLyricLines(background: LyricsBackground, p: Palette, mix: ColorMixer = cssMix): LyricLineColors {
  switch (background) {
    case 'spotify': // Spotify's own: white sung line, dark upcoming lines on a per-song colour
      return { activeLine: '#ffffff', inactiveLine: '#1f1f1f', pastLine: '#e8e8e8' }
    case 'theme':
      return { activeLine: p.text, inactiveLine: p.textSubdued, pastLine: mix(p.text, p.background, 0.35) }
    case 'accent':
      return { activeLine: p.onAccent, inactiveLine: mix(p.onAccent, p.accent, 0.55), pastLine: mix(p.onAccent, p.accent, 0.25) }
    case 'cover-blur': // dimmed blurred artwork: light lines read on any cover
      return { activeLine: '#ffffff', inactiveLine: '#8c8c8c', pastLine: '#cfcfcf' }
  }
}

/** The colours lyrics actually use: the chosen ones, else the automatic ones. */
export function resolveLyricLines(lyrics: LyricsStyle, p: Palette, mix: ColorMixer = cssMix): LyricLineColors {
  const auto = autoLyricLines(lyrics.background, p, mix)
  return {
    activeLine: lyrics.activeLine ?? auto.activeLine,
    inactiveLine: lyrics.inactiveLine ?? auto.inactiveLine,
    pastLine: lyrics.pastLine ?? auto.pastLine,
  }
}
