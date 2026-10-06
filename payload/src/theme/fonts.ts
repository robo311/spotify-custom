// Font registry: bundled fonts ("SC Inter", "SC Mono", …), the font choices a theme or the lyrics can make, and how
// a theme's choice maps onto Spotify's font variables.
// Fonts are inlined as data URLs: the payload must be self-contained, and friends won't have them installed.
import interLatin from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?inline'
import interLatinExt from '@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2?inline'
import monoLatin from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?inline'
import monoLatinExt from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-ext-wght-normal.woff2?inline'
import frauncesLatin from '@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2?inline'
import frauncesLatinExt from '@fontsource-variable/fraunces/files/fraunces-latin-ext-wght-normal.woff2?inline'
import groteskLatin from '@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2?inline'
import groteskLatinExt from '@fontsource-variable/space-grotesk/files/space-grotesk-latin-ext-wght-normal.woff2?inline'
import nunitoLatin from '@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2?inline'
import nunitoLatinExt from '@fontsource-variable/nunito/files/nunito-latin-ext-wght-normal.woff2?inline'
import outfitLatin from '@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2?inline'
import outfitLatinExt from '@fontsource-variable/outfit/files/outfit-latin-ext-wght-normal.woff2?inline'
import type { FontId } from '../types'

export const UI_FONT = '"SC Inter"'
export const MONO_FONT = '"SC Mono"'

// Ranges from @fontsource-variable (latin covers English, latin-ext covers e.g. Slovak/Czech/Polish).
const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
const LATIN_EXT =
  'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'

interface BundledFont {
  family: string
  latin: string
  latinExt: string
}

const BUNDLED: BundledFont[] = [
  { family: UI_FONT, latin: interLatin, latinExt: interLatinExt },
  { family: MONO_FONT, latin: monoLatin, latinExt: monoLatinExt },
  { family: '"SC Fraunces"', latin: frauncesLatin, latinExt: frauncesLatinExt },
  { family: '"SC Space Grotesk"', latin: groteskLatin, latinExt: groteskLatinExt },
  { family: '"SC Nunito"', latin: nunitoLatin, latinExt: nunitoLatinExt },
  { family: '"SC Outfit"', latin: outfitLatin, latinExt: outfitLatinExt },
]

function face(family: string, url: string, range: string): string {
  return `@font-face { font-family: ${family}; font-style: normal; font-display: swap; font-weight: 100 900; src: url(${url}) format('woff2-variations'); unicode-range: ${range}; }`
}

/** Always emitted: our own UI uses these fonts regardless of the theme's choice. Browsers only download a face once text uses it. */
export function fontFaces(): string {
  return BUNDLED.flatMap(f => [face(f.family, f.latin, LATIN), face(f.family, f.latinExt, LATIN_EXT)]).join('\n')
}

const fallback = (generic: string) => `var(--fallback-fonts, ${generic})`

/** CSS font-family per font choice. Ids are stored in themes and share codes, so never rename one. */
const STACKS: Record<FontId, string> = {
  inter: `${UI_FONT}, ${fallback('sans-serif')}`,
  outfit: `"SC Outfit", ${fallback('sans-serif')}`,
  'space-grotesk': `"SC Space Grotesk", ${fallback('sans-serif')}`,
  nunito: `"SC Nunito", ${fallback('sans-serif')}`,
  fraunces: `"SC Fraunces", ${fallback('serif')}`,
  'jetbrains-mono': `${MONO_FONT}, ${fallback('monospace')}`,
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  spotify: `SpotifyMixUITitle, SpotifyMixUI, ${fallback('sans-serif')}`,
}

export interface FontChoice {
  id: FontId
  label: string
  stack: string
}

const LABELS: [FontId, string][] = [
  ['inter', 'Inter'],
  ['outfit', 'Outfit'],
  ['space-grotesk', 'Grotesk'],
  ['nunito', 'Nunito'],
  ['fraunces', 'Fraunces'],
  ['jetbrains-mono', 'Mono'],
  ['system', 'System'],
  ['spotify', 'Spotify'],
]

/** Font choices in picker order. */
export const FONT_CHOICES: readonly FontChoice[] = LABELS.map(([id, label]) => ({ id, label, stack: STACKS[id] }))

export const FONT_IDS: readonly FontId[] = LABELS.map(([id]) => id)

/** The CSS font-family for a font choice. */
export function fontStack(font: FontId): string {
  return STACKS[font]
}

/** Spotify font variables (probed on 1.3.3, declared on :root). null = leave Spotify's font alone. */
export function spotifyFontVars(font: FontId): Record<string, string> | null {
  if (font === 'spotify') return null
  const stack = fontStack(font)
  return {
    '--encore-body-font-stack': stack,
    '--encore-title-font-stack': stack,
    '--encore-variable-font-stack': stack,
  }
}
