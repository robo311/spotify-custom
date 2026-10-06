// Folder artwork: paints the folder tile (picture or background) and masks the chosen icon onto the stock glyph.
// Only paint properties are set (background, mask, opacity): tiles are laid out differently per view (static in the
// list, absolutely positioned in the grid), so touching layout properties would break one of them.
import type { ArtworkStyle } from '../types'
import { cssString, isDataImage, safePaint, svgUrl, type ArtworkCss } from './css-values'
import { FOLDER_VIEWS, SIDEBAR } from './selectors'

/** Grid cards don't clip their image area, so a painted tile gets Spotify's card corner itself. */
const CARD_TILE_RADIUS = 'var(--sc-radius, 6px)'

/** Entry selector matching exactly this folder id (not ids that merely start with it). */
function entryFor(entry: string, folderId: string): string {
  const suffix = `:folder:${folderId}`
  return `${entry}:is([aria-labelledby$=${cssString(suffix)}], [aria-labelledby*=${cssString(`${suffix} `)}])`
}

/** varPrefix is position-based (e.g. --sc-art-3): ids are user data and must never reach a property name. */
export function folderCss(
  varPrefix: string,
  folderId: string,
  style: ArtworkStyle,
  iconSvg: (id: string) => string | undefined,
): ArtworkCss | null {
  const image = isDataImage(style.image) ? style.image : null
  const svg = !image && style.icon ? iconSvg(style.icon) : undefined
  const background = safePaint(style.background)
  if (!image && !svg && !background) return null

  const imageVar = `${varPrefix}-image`
  const maskVar = `${varPrefix}-mask`
  const vars: string[] = []
  if (image) vars.push(`${imageVar}: url(${cssString(image)});`)
  if (svg) vars.push(`${maskVar}: ${svgUrl(svg)};`)

  const color = safePaint(style.color) ?? 'var(--sc-text, #fff)'
  const rules: string[] = []
  for (const view of FOLDER_VIEWS) {
    const entry = `${SIDEBAR} ${entryFor(view.entry, folderId)}`
    const tile = `${entry} :has(> ${view.glyph})`
    const glyph = `${entry} ${view.glyph}`
    const radius = view.clipsItself ? '' : ` border-radius: ${CARD_TILE_RADIUS};`

    if (image) {
      rules.push(`${tile} { background: center / cover no-repeat var(${imageVar}) !important;${radius} }`)
      rules.push(`${glyph} { opacity: 0 !important; }`)
      continue
    }
    if (background) rules.push(`${tile} { background: ${background} !important;${radius} }`)
    if (svg) {
      // The icon replaces the stock glyph in its own box, so it has the native size in every view.
      rules.push(
        `${glyph} { background-color: ${color} !important; ` +
          `-webkit-mask: var(${maskVar}) center / contain no-repeat; mask: var(${maskVar}) center / contain no-repeat; }`,
        `${glyph} > * { visibility: hidden !important; }`,
      )
    }
  }
  return { vars, rules }
}
