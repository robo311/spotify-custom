// One library item in the list: its tile as it looks now, its name, and the editor when expanded.
import { ChevronDown } from 'lucide-static'
import type { LibraryItemInfo } from '../../../types'
import { useApp } from '../../context'
import { css, useStyles } from '../../styles/sheet'
import { artworkStyle, isArtworkCustomised } from '../../lib/artwork-edits'
import { Icon } from '../../ui/Icon'
import { ArtworkEditor } from './ArtworkEditor'
import { ArtworkTile } from './ArtworkTile'

const styles = css`
  .b-arow {
    border-radius: var(--b-r-md);
    scroll-margin: 12px;
  }
  .b-arow[data-open='true'] {
    background: var(--b-hover);
    box-shadow: inset 0 0 0 1px var(--b-line);
  }
  .b-arow__head {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 8px;
    border-radius: var(--b-r-md);
    text-align: left;
  }
  .b-arow__head:hover {
    background: var(--b-hover);
  }
  .b-arow__name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
  }
  .b-arow__dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--b-accent);
  }
  .b-arow__chev {
    color: var(--b-sub);
    transition: transform var(--b-med) var(--b-ease);
  }
  .b-arow[data-open='true'] .b-arow__chev {
    transform: rotate(180deg);
  }
  .b-arow__body {
    padding: 6px 12px 14px;
  }
`

interface ArtworkRowProps {
  item: LibraryItemInfo
  open: boolean
  onToggle: () => void
}

export function ArtworkRow({ item, open, onToggle }: ArtworkRowProps) {
  useStyles(styles)
  const style = useApp(s => artworkStyle(s.settings, item.uri))
  const customised = useApp(s => isArtworkCustomised(s.settings, item.uri))

  return (
    <div class="b-arow" data-open={open} data-uri={item.uri}>
      <button type="button" class="b-arow__head" aria-expanded={open} onClick={onToggle}>
        <ArtworkTile kind={item.kind} style={style} />
        <span class="b-arow__name">{item.name}</span>
        {customised && <span class="b-arow__dot" title="Customised" />}
        <span class="b-arow__chev">
          <Icon svg={ChevronDown} size={14} />
        </span>
      </button>
      {open && (
        <div class="b-arow__body">
          <ArtworkEditor item={item} />
        </div>
      )}
    </div>
  )
}
