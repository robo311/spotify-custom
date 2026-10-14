// Arrange mode's floating bar beside the bar being arranged: pick a layer, how-to, Cancel and Done.
import type { BarLayer } from '../../types'
import { Button } from '../ui/Button'

interface ArrangeToolbarProps {
  layers: readonly BarLayer[] // bottom first
  selected: string | null
  style: Record<string, string>
  onSelect: (id: string) => void
  onCancel: () => void
  onDone: () => void
}

export function ArrangeToolbar({ layers, selected, style, onSelect, onCancel, onDone }: ArrangeToolbarProps) {
  return (
    <div class="b-arr__bar" style={style} data-sc-builder-ui role="toolbar" aria-label="Arrange pictures">
      <div class="b-arr__chips">
        {[...layers].reverse().map(layer => (
          <button
            key={layer.id}
            type="button"
            class="b-arr__chip"
            aria-pressed={layer.id === selected}
            onClick={() => onSelect(layer.id)}
          >
            {layer.name}
          </button>
        ))}
      </div>
      <span class="b-arr__hint">Drag to move · corner or scroll to resize · arrows to nudge</span>
      <Button onClick={onCancel}>Cancel</Button>
      <Button variant="primary" onClick={onDone}>
        Done
      </Button>
    </div>
  )
}
