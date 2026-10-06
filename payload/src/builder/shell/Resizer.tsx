// Resize handles: the left edge (width; arrow keys resize by 16px) and, when floating, the bottom-right corner.
import { DRAWER_MAX, DRAWER_MIN } from '../lib/prefs'
import { css, useStyles } from '../styles/sheet'

const styles = css`
  .b-resizer {
    position: absolute;
    z-index: 1;
    touch-action: none;
  }
  .b-resizer--left {
    top: 16px;
    bottom: 16px;
    left: -5px;
    width: 10px;
    cursor: ew-resize;
  }
  .b-resizer--left::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 3px;
    width: 4px;
    height: 40px;
    margin-top: -20px;
    border-radius: 999px;
    background: var(--b-text);
    opacity: 0;
    transition: opacity var(--b-fast) var(--b-ease);
  }
  .b-resizer--left:hover::after,
  .b-resizer--left:focus-visible::after {
    opacity: 0.35;
  }
  .b-resizer--corner {
    right: 2px;
    bottom: 2px;
    width: 16px;
    height: 16px;
    cursor: nwse-resize;
    background:
      linear-gradient(135deg, transparent 55%, var(--b-sub) 55% 62%, transparent 62% 72%, var(--b-sub) 72% 79%, transparent 79%);
    opacity: 0.5;
    border-bottom-right-radius: var(--b-r-lg);
  }
  .b-resizer--corner:hover {
    opacity: 0.9;
  }
  .b-resizer:focus-visible {
    outline: none;
  }
`

interface ResizerProps {
  edge: 'left' | 'corner'
  width: number
  onStart: (e: PointerEvent) => void
  onKeyResize?: (delta: number) => void
}

export function Resizer({ edge, width, onStart, onKeyResize }: ResizerProps) {
  useStyles(styles)
  if (edge === 'corner') return <div class="b-resizer b-resizer--corner" aria-hidden="true" onPointerDown={onStart} />
  return (
    <div
      class="b-resizer b-resizer--left"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize theme studio"
      aria-valuemin={DRAWER_MIN}
      aria-valuemax={DRAWER_MAX}
      aria-valuenow={width}
      tabIndex={0}
      onPointerDown={onStart}
      onKeyDown={e => {
        const delta = e.key === 'ArrowLeft' ? 16 : e.key === 'ArrowRight' ? -16 : 0
        if (!delta) return
        e.preventDefault()
        onKeyResize?.(delta)
      }}
    />
  )
}
