// Liked Songs artwork: Spotify draws its cover as an <img> everywhere, so the rules restyle that image itself.
// `content` swaps what an <img> renders (Chromium), so no wrapper structure is assumed and every place the cover
// shows (sidebar row/card, Home shortcut and cards, page header) is covered by one selector.
import type { ArtworkStyle } from '../types'
import { cssString, isDataImage, safeColor, safePaint, svgUrl, type ArtworkCss } from './css-values'
import { LIKED_COVER } from './selectors'

/** Background-only styles keep a heart, so Liked Songs never turns into a blank tile. */
const DEFAULT_ICON = 'heart'
const DEFAULT_COLOR = '#ffffff'
const DEFAULT_BACKGROUND = 'var(--sc-elevated, #282828)'
/** A transparent image: hides Spotify's cover so the element's own background shows through. */
const TRANSPARENT = 'linear-gradient(transparent, transparent)'

/** The icon is drawn as a background image, which can't inherit colour, so the colour is baked into the SVG. */
export function colouredSvg(svg: string, color: string): string {
  return svg.replaceAll('currentColor', color)
}

/** varPrefix is position-based (e.g. --sc-art-3): never derived from user data. */
export function likedCss(varPrefix: string, style: ArtworkStyle, iconSvg: (id: string) => string | undefined): ArtworkCss | null {
  if (isDataImage(style.image)) {
    const imageVar = `${varPrefix}-image`
    return {
      vars: [`${imageVar}: url(${cssString(style.image)});`],
      rules: [`${LIKED_COVER} { content: var(${imageVar}) !important; object-fit: cover !important; }`],
    }
  }

  const background = safePaint(style.background)
  const svg = iconSvg(style.icon ?? '') ?? (background ? iconSvg(DEFAULT_ICON) : undefined)
  if (!svg) return null

  const iconVar = `${varPrefix}-icon`
  const color = safeColor(style.color) ?? DEFAULT_COLOR
  return {
    vars: [`${iconVar}: ${svgUrl(colouredSvg(svg, color))};`],
    rules: [
      `${LIKED_COVER} { content: ${TRANSPARENT} !important; ` +
        `background: center / 50% no-repeat var(${iconVar}), ${background ?? DEFAULT_BACKGROUND} !important; }`,
    ],
  }
}
