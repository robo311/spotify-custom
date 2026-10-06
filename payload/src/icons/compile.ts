// Icon pack → CSS. Each replaced <svg> keeps its size and colour: its own shapes are hidden and the element is
// painted with currentColor through a mask of our icon. Icons a pack doesn't provide keep Spotify's glyph.
import type { IconChoice, IconPack } from '../types'
import { galleryIcon } from './gallery'
import { ICON_NAMES } from './names'
import { ICON_TARGETS, targetSvgSelector } from './selectors'
import { SPOTIFY_PACK_ID } from './packs'

export function svgDataUrl(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

function iconRules(svgSelector: string, svg: string): string {
  const mask = `${svgDataUrl(svg)} center / contain no-repeat`
  return [
    `${svgSelector} > * { visibility: hidden !important; }`,
    `${svgSelector} { background-color: currentColor !important; -webkit-mask: ${mask} !important; mask: ${mask} !important; }`,
  ].join('\n')
}

/** The markup for a per-button choice ('' when its gallery id is unknown, e.g. from a newer version). */
export function choiceSvg(choice: IconChoice): string {
  return 'svg' in choice ? choice.svg : (galleryIcon(choice.gallery) ?? '')
}

/** Icon CSS: the pack's icons, with per-button choices (theme.iconOverrides) taking precedence over the pack. */
export function compileIcons(packId: string, packs: IconPack[], overrides: Record<string, IconChoice> = {}): string {
  const pack = packId === SPOTIFY_PACK_ID ? undefined : packs.find(p => p.id === packId)

  const css: string[] = []
  for (const name of ICON_NAMES) {
    const choice = Object.hasOwn(overrides, name) ? overrides[name] : undefined
    // User packs are partial: a missing (or empty) icon keeps Spotify's own.
    const svg = choice ? choiceSvg(choice) : pack && Object.hasOwn(pack.icons, name) ? pack.icons[name] : ''
    if (svg === '') continue
    for (const target of ICON_TARGETS[name]) {
      css.push(iconRules(targetSvgSelector(target), svg))
    }
  }
  return css.join('\n')
}
