// Public API of the parts module: curated customisable parts of Spotify's UI and layout tweaks.
import type { Theme } from '../types'
import { compileLyrics, compileLyricsIdle, compileLyricsMotion } from './lyrics'
export { LYRICS_COLUMN_SLOT } from './lyrics'
import { compileHomeLook } from './home-look'
import { compilePageLook } from './page-look'
import { compileProgress } from './progress'
import { PARTS } from './registry'

export { PARTS } from './registry'
export { LAYOUT_OPTIONS, compileLayout } from './layout'
export { watchPartStatus, findPartAt, partElements } from './status'
export { watchPanelSections } from './panel'
export { startPartsRuntime } from './runtime'
export { startPlayingRow } from './playing-row'
export { startLyricsLibrary } from './lyrics-library'
export { autoLyricLines, resolveLyricLines, cssMix, type ColorMixer, type LyricLineColors } from './lyric-colors'
export { compileKeyedSectionsCss, keySelector } from './sections'

/** CSS for theme.parts overrides (unknown part ids are ignored), theme.lyrics, the progress bar style and Home's shortcut grid. */
export function compileParts(theme: Theme): string {
  return [
    ...PARTS.filter(part => Object.hasOwn(theme.parts, part.id)).map(part => part.compile(theme.parts[part.id], theme)),
    compileLyrics(theme.lyrics),
    compileLyricsIdle(theme),
    compileLyricsMotion(theme),
    compileProgress(theme.effects.progressBar),
    compileHomeLook(theme.homeStyle),
    compilePageLook(theme.pageStyle),
  ]
    .filter(Boolean)
    .join('\n')
}
