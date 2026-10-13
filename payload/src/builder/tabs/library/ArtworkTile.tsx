// A library item's tile exactly as it will look in the library: a picture, or an icon on a background, or (with
// nothing set) Spotify's own look for that kind of item: a plain folder, the Liked Songs gradient and heart, or Your
// Episodes' green and bookmark.
import { Bookmark, Folder, Heart } from 'lucide-static'
import type { ArtworkStyle, LibraryItemInfo } from '../../../types'
import { ARTWORK_ICONS } from '../../../library'
import { useApp } from '../../context'
import { css, useStyles } from '../../styles/sheet'
import { Icon } from '../../ui/Icon'

const styles = css`
  .b-atile {
    display: grid;
    place-items: center;
    flex: none;
    width: var(--s);
    height: var(--s);
    border-radius: calc(var(--s) * 0.12);
    background: var(--bg);
    background-size: cover;
    background-position: center;
    color: var(--fg);
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.06);
    overflow: hidden;
  }
  .b-atile[data-default-glyph='true'] svg {
    fill: currentColor;
  }
`

/** Spotify's own artwork for its collections: Liked Songs (violet-to-mint gradient, white heart), Your Episodes (green, bookmark). */
const SPOTIFY_LOOK: Partial<Record<LibraryItemInfo['kind'], { background: string; glyph: string }>> = {
  liked: { background: 'linear-gradient(135deg, #450af5, #8e8ee5 60%, #c4efd9)', glyph: Heart },
  episodes: { background: '#056952', glyph: Bookmark },
}

interface ArtworkTileProps {
  kind: LibraryItemInfo['kind']
  style: ArtworkStyle
  size?: number
}

export function ArtworkTile({ kind, style, size = 40 }: ArtworkTileProps) {
  useStyles(styles)
  const palette = useApp(s => s.active.palette)
  const icon = style.icon ? ARTWORK_ICONS.find(i => i.id === style.icon) : undefined
  const spotify = SPOTIFY_LOOK[kind]
  const defaultLook = !style.image && !icon && !style.background && !style.color

  const background = style.image ? `url("${style.image}")` : (style.background ?? spotify?.background ?? palette.elevated)
  const color = style.color ?? (spotify ? '#ffffff' : icon ? palette.text : palette.textSubdued)
  const glyph = icon?.svg ?? spotify?.glyph ?? Folder

  return (
    <span class="b-atile" aria-hidden="true" data-default-glyph={spotify !== undefined && !icon} style={{ '--s': `${size}px`, '--bg': background, '--fg': color }}>
      {!style.image && <Icon svg={glyph} size={Math.round(size * (spotify && defaultLook ? 0.42 : 0.48))} />}
    </span>
  )
}
