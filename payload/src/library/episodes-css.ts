// Your Episodes artwork: Spotify draws its cover as a coloured box (EPISODES_COVER) holding a bookmark glyph, wherever
// it shows (sidebar row/card, its page header), so the rules restyle that box. A colour or background alone keeps
// Spotify's bookmark (recoloured); a chosen icon or picture replaces it.
import type { ArtworkStyle } from '../types'
import { cssString, isDataImage, safeColor, safePaint, svgUrl, type ArtworkCss } from './css-values'
import { colouredSvg } from './liked-css'
import { EPISODES_COVER } from './selectors'

const DEFAULT_COLOR = '#ffffff'
const HIDE_GLYPH = `${EPISODES_COVER} > * { visibility: hidden !important; }`

/** varPrefix is position-based (e.g. --sc-art-3): never derived from user data. */
export function episodesCss(varPrefix: string, style: ArtworkStyle, iconSvg: (id: string) => string | undefined): ArtworkCss | null {
  if (isDataImage(style.image)) {
    const imageVar = `${varPrefix}-image`
    return {
      vars: [`${imageVar}: url(${cssString(style.image)});`],
      rules: [`${EPISODES_COVER} { background: center / cover no-repeat var(${imageVar}) !important; }`, HIDE_GLYPH],
    }
  }

  const background = safePaint(style.background)
  const color = safeColor(style.color)
  const svg = iconSvg(style.icon ?? '')
  if (svg) {
    const iconVar = `${varPrefix}-icon`
    const layers = [`center / 50% no-repeat var(${iconVar})`, ...(background ? [background] : [])].join(', ')
    return {
      vars: [`${iconVar}: ${svgUrl(colouredSvg(svg, color ?? DEFAULT_COLOR))};`],
      rules: [`${EPISODES_COVER} { background: ${layers} !important; }`, HIDE_GLYPH],
    }
  }

  const rules = [
    ...(background ? [`${EPISODES_COVER} { background: ${background} !important; }`] : []),
    ...(color ? [`${EPISODES_COVER} svg { fill: ${color} !important; color: ${color} !important; }`] : []),
  ]
  return rules.length > 0 ? { vars: [], rules } : null
}
