// A map of the Spotify window. Click an area to hide or show it; the map mirrors library side and hidden areas.
import { EyeOff } from 'lucide-static'
import { PARTS } from '../../../parts'
import { useApp, useEnv } from '../../context'
import { css, useStyles } from '../../styles/sheet'
import { setHidden } from '../../lib/theme-edits'
import { Icon } from '../../ui/Icon'

const styles = css`
  .b-map {
    display: grid;
    grid-template-columns: 28% 1fr 24%;
    grid-template-rows: 14% 1fr 16%;
    grid-template-areas:
      'top top top'
      'side main right'
      'player player player';
    gap: 4px;
    aspect-ratio: 16 / 10;
    padding: 4px;
    border-radius: var(--b-r-md);
    background: color-mix(in oklch, var(--b-bg) 70%, black);
    box-shadow: inset 0 0 0 1px var(--b-line);
  }
  .b-map[data-library='right'] {
    grid-template-areas:
      'top top top'
      'right main side'
      'player player player';
  }
  .b-map__area {
    position: relative;
    display: grid;
    place-items: center;
    border-radius: 6px;
    background: var(--b-elevated);
    color: var(--b-sub);
    font-size: 11px;
    font-weight: 500;
    transition:
      background var(--b-fast) var(--b-ease),
      opacity var(--b-med) var(--b-ease),
      box-shadow var(--b-fast) var(--b-ease);
  }
  button.b-map__area:hover {
    box-shadow: inset 0 0 0 2px var(--b-accent);
    color: var(--b-text);
  }
  .b-map__area[aria-pressed='true'] {
    background: repeating-linear-gradient(135deg, var(--b-hover) 0 5px, transparent 5px 10px);
    box-shadow: inset 0 0 0 1px var(--b-line);
    opacity: 0.75;
  }
  .b-map__area--main {
    background: var(--b-bg);
    box-shadow: inset 0 0 0 1px var(--b-line);
    cursor: default;
  }
  .b-map__area:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  .b-map__off {
    position: absolute;
    top: 4px;
    right: 4px;
  }
`

interface Area {
  partId: string
  gridArea: string
  label: string
}

const AREAS: readonly Area[] = [
  { partId: 'topBar', gridArea: 'top', label: 'Top bar' },
  { partId: 'sidebar', gridArea: 'side', label: 'Library' },
  { partId: 'rightPanel', gridArea: 'right', label: 'Side panel' },
  { partId: 'playerBar', gridArea: 'player', label: 'Player' },
]

export function MiniMap() {
  useStyles(styles)
  const { store } = useEnv()
  const hidden = useApp(s => s.active.layout.hidden)
  const librarySide = useApp(s => s.active.layout.librarySide)

  return (
    <div class="b-map" data-library={librarySide} role="group" aria-label="Window areas">
      {AREAS.map(area => {
        const part = PARTS.find(p => p.id === area.partId)
        const isHidden = hidden.includes(area.partId)
        const canHide = part?.hideable ?? false
        return (
          <button
            key={area.partId}
            type="button"
            class="b-map__area"
            style={{ gridArea: area.gridArea }}
            aria-pressed={isHidden}
            disabled={!canHide}
            title={canHide ? (isHidden ? `Show ${area.label.toLowerCase()}` : `Hide ${area.label.toLowerCase()}`) : `${area.label} can’t be hidden`}
            onClick={() => store.edit(setHidden(area.partId, !isHidden))}
          >
            {area.label}
            {isHidden && (
              <span class="b-map__off">
                <Icon svg={EyeOff} size={12} />
              </span>
            )}
          </button>
        )
      })}
      <div class="b-map__area b-map__area--main" style={{ gridArea: 'main' }}>
        Page
      </div>
    </div>
  )
}
