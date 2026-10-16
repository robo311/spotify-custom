// A picture of one song where the shortcut buttons go (a song row, a queue row, the player bar, a search suggestion), so it's clear what
// the buttons are and where they land beside Spotify's own.
import { CirclePlus, Ellipsis } from 'lucide-static'
import type { ShortcutAction, ShortcutSurface } from '../../../types'
import { css, useStyles } from '../../styles/sheet'
import { Icon } from '../../ui/Icon'

const styles = css`
  .b-scut-preview {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 52px;
    padding: 8px 10px;
    border-radius: var(--b-r-md);
    background: var(--b-slot);
    box-shadow: var(--b-well-edge);
    color: var(--b-sub);
  }
  .b-scut-preview__cover {
    flex: none;
    width: 34px;
    height: 34px;
    border-radius: 4px;
    background: var(--b-elevated);
  }
  .b-scut-preview__text {
    display: grid;
    min-width: 0;
    font-size: 12px;
  }
  .b-scut-preview[data-place='rows'] .b-scut-preview__text,
  .b-scut-preview[data-place='queue'] .b-scut-preview__text,
  .b-scut-preview[data-place='search'] .b-scut-preview__text {
    flex: 1;
  }
  .b-scut-preview__title {
    color: var(--b-text);
    font-weight: 500;
  }
  .b-scut-preview__yours {
    display: flex;
    gap: 2px;
    padding: 2px;
    border-radius: var(--b-r-sm);
    box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--b-accent) 60%, transparent);
    color: var(--b-text);
  }
  .b-scut-preview__btn {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
  }
  .b-scut-preview__time {
    font-family: var(--b-mono);
    font-size: 12px;
  }
`

export function ShortcutPreview({ place, actions, icons, spotifyAdd }: {
  place: ShortcutSurface
  actions: readonly ShortcutAction[]
  icons: Record<ShortcutAction, string>
  /** Spotify's own add button is shown here. */
  spotifyAdd: boolean
}) {
  useStyles(styles)
  const add = (
    <span class="b-scut-preview__btn" data-button="spotify-add">
      <Icon svg={CirclePlus} size={16} />
    </span>
  )
  return (
    <div class="b-scut-preview" data-place={place} aria-hidden="true">
      <span class="b-scut-preview__cover" />
      <span class="b-scut-preview__text">
        <span class="b-scut-preview__title">Song name</span>
        <span>Artist</span>
      </span>
      {actions.length > 0 && (
        <span class="b-scut-preview__yours">
          {actions.map(a => (
            <span key={a} class="b-scut-preview__btn" data-button={a}>
              <Icon svg={icons[a]} size={16} />
            </span>
          ))}
        </span>
      )}
      {spotifyAdd && place !== 'search' && add}
      {place === 'rows' && <span class="b-scut-preview__time">3:19</span>}
      {place !== 'playerBar' && (
        <span class="b-scut-preview__btn" data-button="more">
          <Icon svg={Ellipsis} size={16} />
        </span>
      )}
      {/* Search suggestions put Spotify's ✓ after the ⋯. */}
      {spotifyAdd && place === 'search' && add}
    </div>
  )
}
