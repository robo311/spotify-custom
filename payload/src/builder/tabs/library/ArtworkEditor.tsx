// Everything about one library item's look (a folder, or Liked Songs): picture, or icon + icon colour + tile
// background; a before/after comparison once changed; and Reset.
import { useState } from 'preact/hooks'
import { ArrowRight } from 'lucide-static'
import type { ArtworkStyle, LibraryItemInfo } from '../../../types'
import { useApp, useEnv } from '../../context'
import { css, useStyles } from '../../styles/sheet'
import { artworkStyle, isArtworkCustomised, patchArtworkStyle, resetArtworkStyle } from '../../lib/artwork-edits'
import { PaintField } from '../../parts/PaintField'
import { ResetButton } from '../../ui/ResetButton'
import { ColorField } from '../../ui/ColorField'
import { Icon } from '../../ui/Icon'
import { ArtworkTile } from './ArtworkTile'
import { IconGallery } from './IconGallery'
import { PictureField } from './PictureField'

const styles = css`
  .b-fedit {
    display: grid;
    gap: 16px;
  }
  .b-fedit__group {
    display: grid;
    gap: 8px;
  }
  .b-fedit__group[data-disabled='true'] {
    opacity: 0.45;
    pointer-events: none;
  }
  .b-fedit__compare {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--b-sub);
  }
  .b-fedit__compare figure {
    display: grid;
    justify-items: center;
    gap: 4px;
    margin: 0;
  }
  .b-fedit__foot {
    display: flex;
    justify-content: flex-end;
  }
`

/** Auto colours match what Spotify shows when nothing is set for this kind of item. */
const LIKED_AUTO = { color: '#ffffff', background: '#450af5' }

export function ArtworkEditor({ item }: { item: LibraryItemInfo }) {
  useStyles(styles)
  const { uri, kind } = item
  const { store } = useEnv()
  const style = useApp(s => artworkStyle(s.settings, uri))
  const customised = useApp(s => isArtworkCustomised(s.settings, uri))
  const palette = useApp(s => s.active.palette)
  const [colorOpen, setColorOpen] = useState(false)
  const patch = (p: Partial<Record<keyof ArtworkStyle, string | undefined>>) => store.editSettings(patchArtworkStyle(uri, p))
  const hasImage = style.image !== undefined
  const auto = kind === 'liked' ? LIKED_AUTO : { color: palette.text, background: palette.elevated }

  return (
    <div class="b-fedit">
      {customised && (
        <div class="b-fedit__compare" aria-label="Before and after">
          <figure>
            <ArtworkTile kind={kind} style={{}} size={48} />
            <figcaption class="b-hint">Spotify</figcaption>
          </figure>
          <Icon svg={ArrowRight} size={14} />
          <figure>
            <ArtworkTile kind={kind} style={style} size={48} />
            <figcaption class="b-hint">Yours</figcaption>
          </figure>
        </div>
      )}
      <div class="b-fedit__group">
        <span class="b-label">Picture</span>
        <PictureField kind={kind} style={style} onApply={image => patch({ image })} />
      </div>

      <div class="b-fedit__group" data-disabled={hasImage} title={hasImage ? 'Remove the picture to use an icon' : undefined}>
        <span class="b-label">Icon</span>
        <IconGallery value={style.icon} onChange={icon => patch({ icon })} />
        <div style={{ margin: '0 -8px' }}>
          <ColorField
            label="Icon colour"
            value={style.color}
            autoValue={auto.color}
            open={colorOpen}
            onToggle={() => setColorOpen(!colorOpen)}
            onChange={color => patch({ color })}
          />
        </div>
      </div>

      <div class="b-fedit__group" data-disabled={hasImage}>
        <span class="b-label">Tile background</span>
        <PaintField value={style.background} autoColor={auto.background} onChange={background => patch({ background })} />
      </div>

      <div class="b-fedit__foot">
        <ResetButton label="Back to Spotify’s look" disabled={!customised} onClick={() => store.editSettings(resetArtworkStyle(uri))} />
      </div>
    </div>
  )
}
