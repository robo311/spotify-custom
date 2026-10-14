// One picture layer in a bar's list: thumbnail and name (click to select), show/hide, move up/down, delete.
import { ChevronDown, ChevronUp, Eye, EyeOff, Trash2 } from 'lucide-static'
import type { BarLayer } from '../../types'
import { layerUrl } from '../../bar-layers'
import { css, useStyles } from '../styles/sheet'
import { IconButton } from '../ui/Button'

const styles = css`
  .b-layer {
    display: flex;
    align-items: center;
    gap: 2px;
    border-radius: var(--b-r-sm);
  }
  .b-layer[data-selected] {
    background: var(--b-hover);
    box-shadow: inset 0 0 0 1px var(--b-line);
  }
  .b-layer__pick {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 6px;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .b-layer__thumb {
    flex: none;
    width: 52px;
    height: 20px;
    border-radius: 3px;
    object-fit: cover;
    background: var(--b-well);
    box-shadow: inset 0 0 0 1px var(--b-line);
  }
  .b-layer[data-hidden] .b-layer__thumb,
  .b-layer[data-hidden] .b-layer__name {
    opacity: 0.45;
  }
  .b-layer__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
  }
`

interface LayerRowProps {
  layer: BarLayer
  selected: boolean
  first: boolean // bottom of the stack
  last: boolean // top of the stack
  onSelect: () => void
  onToggleHidden: () => void
  onMove: (step: 1 | -1) => void
  onDelete: () => void
}

export function LayerRow({ layer, selected, first, last, onSelect, onToggleHidden, onMove, onDelete }: LayerRowProps) {
  useStyles(styles)
  const url = layerUrl(layer)
  return (
    <div class="b-layer" data-selected={selected || undefined} data-hidden={layer.hidden || undefined}>
      <button type="button" class="b-layer__pick" aria-pressed={selected} onClick={onSelect}>
        {url ? <img class="b-layer__thumb" src={url} alt="" /> : <span class="b-layer__thumb" />}
        <span class="b-layer__name">{layer.name}</span>
      </button>
      <IconButton icon={layer.hidden ? EyeOff : Eye} size={14} label={`${layer.hidden ? 'Show' : 'Hide'} ${layer.name}`} onClick={onToggleHidden} />
      <IconButton icon={ChevronUp} size={14} label={`Move ${layer.name} up`} disabled={last} onClick={() => onMove(1)} />
      <IconButton icon={ChevronDown} size={14} label={`Move ${layer.name} down`} disabled={first} onClick={() => onMove(-1)} />
      <IconButton icon={Trash2} size={14} label={`Delete ${layer.name}`} onClick={onDelete} />
    </div>
  )
}
