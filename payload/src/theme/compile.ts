// Theme → one CSS string. Pure: the same theme always compiles to the same CSS (snapshot-tested).
// Fonts are static and live in apply.ts's base slot. Cascade order: palette variables → Encore mapping → parts → layout → icons → theme CSS → file CSS.
import type { IconPack, Palette, Theme } from '../types'
import { compileIcons } from '../icons'
import { compileLayout, compileParts } from '../parts'
import { compileEncoreVars } from './encore-map'
import { MONO_FONT, UI_FONT, spotifyFontVars } from './fonts'
import { SPOTIFY_PALETTE } from './presets'
import { PALETTE_VAR } from './vars'

export interface CompileContext {
  iconPacks: IconPack[]
  /** Hand-written themes/<id>/theme.css, applied last. */
  fileCss?: string
}

/** Spotify's own section corner radius; themes using it don't need an override. */
const SPOTIFY_RADIUS = 8

/** True when the palette is Spotify's own, so Spotify can render natively with no colour overrides. */
export function isNativePalette(p: Palette): boolean {
  return (Object.keys(SPOTIFY_PALETTE) as (keyof Palette)[]).every(k => p[k].toLowerCase() === SPOTIFY_PALETTE[k])
}

function declarations(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n')
}

function rootVars(theme: Theme): Record<string, string> {
  const palette = Object.fromEntries(
    (Object.keys(PALETTE_VAR) as (keyof Palette)[]).map(k => [PALETTE_VAR[k], theme.palette[k]]),
  )
  return {
    ...palette,
    '--sc-radius': `${theme.radius}px`,
    '--sc-font-ui': UI_FONT,
    '--sc-font-mono': MONO_FONT,
    ...(theme.radius !== SPOTIFY_RADIUS ? { '--section-border-radius': `${theme.radius}px` } : {}),
    ...spotifyFontVars(theme.font),
  }
}

export function compileTheme(theme: Theme, ctx: CompileContext): string {
  const sections: [string, string][] = [
    ['variables', `:root {\n${declarations(rootVars(theme))}\n}`],
    ['encore', isNativePalette(theme.palette) ? '' : compileEncoreVars()],
    ['parts', compileParts(theme)],
    ['layout', compileLayout(theme.layout)],
    ['icons', compileIcons(theme.icons, ctx.iconPacks, theme.iconOverrides)],
    ['theme css', theme.css],
    ['theme.css file', ctx.fileCss ?? ''],
  ]
  return sections
    .filter(([, css]) => css.trim())
    .map(([label, css]) => `/* ${label} */\n${css}`)
    .join('\n\n')
}
