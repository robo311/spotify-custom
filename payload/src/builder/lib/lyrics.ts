// Lyrics line colours as concrete hex values for the builder's previews and "Auto" swatches.
// The rules live in parts/lyric-colors.ts (the theme CSS uses them with live CSS color-mix); here they are bound to
// mixHex so the preview shows exactly what Spotify will.
import type { LyricsBackground, LyricsStyle, Palette } from '../../types'
import { autoLyricLines as autoRule, resolveLyricLines as resolveRule, type LyricLineColors } from '../../parts'
import { mixHex } from './color-math'

export type { LyricLineColors }

export function autoLyricLines(background: LyricsBackground, p: Palette): LyricLineColors {
  return autoRule(background, p, mixHex)
}

/** The colours lyrics will actually use: chosen ones, else the automatic ones. */
export function resolveLyricLines(lyrics: LyricsStyle, p: Palette): LyricLineColors {
  return resolveRule(lyrics, p, mixHex)
}
