// Pick mode: Spotify dims, the part under the pointer stays lit with an accent outline, a label chip follows
// the cursor, and clicking opens that part's editor right next to it.
import { useCallback, useEffect, useState } from 'preact/hooks'
import { useApp, useEnv } from '../context'
import { css, useStyles } from '../styles/sheet'
import { leaderLine, type Box, type PickTarget } from '../lib/pick'
import { suspendWindowDrag } from '../lib/window-drag'
import type { PartDef } from '../../types'
import { PartPopover } from './PartPopover'
import { usePickTarget, type PickHover } from './use-pick-target'

const styles = css`
  .b-pick__dim {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 0.35);
    animation: b-fade-in 200ms var(--b-ease);
    pointer-events: none;
  }
  /* Moved with transform and promoted to its own layer, so gliding between parts doesn't repaint the window under it. */
  .b-pick__spot {
    position: fixed;
    top: 0;
    left: 0;
    border-radius: 8px;
    box-shadow:
      0 0 0 100vmax rgb(0 0 0 / 0.5),
      0 0 0 2px var(--b-accent),
      0 0 28px 4px color-mix(in oklch, var(--b-accent) 55%, transparent);
    transition:
      transform 120ms var(--b-ease),
      width 120ms var(--b-ease),
      height 120ms var(--b-ease);
    will-change: transform, width, height;
    pointer-events: none;
    animation: b-fade-in 200ms var(--b-ease);
  }
  .b-pick__chip {
    position: fixed;
    top: 0;
    left: 0;
    will-change: transform;
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 999px;
    background: var(--b-text);
    color: var(--b-bg);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    box-shadow: 0 6px 20px rgb(0 0 0 / 0.35);
    pointer-events: none;
  }
  .b-pick__chip .b-mono {
    font-size: 11px;
    font-weight: 400;
    opacity: 0.6;
  }
  .b-pick__banner {
    position: fixed;
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    padding: 8px 14px;
    border-radius: 999px;
    background: var(--b-panel);
    box-shadow:
      inset 0 0 0 1px var(--b-line),
      0 10px 30px rgb(0 0 0 / 0.35);
    font-weight: 500;
    pointer-events: none;
    animation: b-drop-in 260ms var(--b-ease);
  }
  .b-pick__banner kbd {
    font-family: var(--b-mono);
    font-size: 11px;
    padding: 1px 5px;
    margin: 0 2px;
    border-radius: 4px;
    box-shadow: inset 0 0 0 1px var(--b-line);
  }
  .b-pick__leader {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    overflow: visible;
    pointer-events: none;
    color: var(--b-accent);
  }
  .b-pick__leader line {
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-dasharray: var(--len);
    stroke-dashoffset: var(--len);
    animation: b-leader-draw 380ms 120ms var(--b-ease) forwards;
  }
  .b-pick__leader .b-pick__pin {
    fill: currentColor;
    animation: b-fade-in 200ms var(--b-ease);
  }
  .b-pick__leader .b-pick__ring {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
    opacity: 0;
    transform-box: fill-box;
    transform-origin: center;
    animation: b-pin-ring 900ms 80ms var(--b-ease);
  }
  @keyframes b-leader-draw {
    to {
      stroke-dashoffset: 0;
    }
  }
  @keyframes b-pin-ring {
    from {
      opacity: 0.8;
      transform: scale(0.4);
    }
    to {
      opacity: 0;
      transform: scale(2.2);
    }
  }
  @keyframes b-fade-in {
    from {
      opacity: 0;
    }
  }
  @keyframes b-drop-in {
    from {
      opacity: 0;
      transform: translate(-50%, -8px);
    }
  }
`

interface Editing {
  part: PartDef
  box: Box
}

export function PickLayer() {
  useStyles(styles)
  const { ui } = useEnv()
  const libraryItems = useApp(s => s.libraryItems)
  const [editing, setEditing] = useState<Editing | null>(null)
  const onPick = useCallback(
    ({ target, box }: PickHover) => {
      // Library items have a full editor of their own: picking one jumps straight to it in the Library tab.
      if (target.kind === 'library-item') ui.set(s => ({ ...s, open: true, picking: false, tab: 'library', editingArtwork: target.uri }))
      else setEditing({ part: target.part, box })
    },
    [ui],
  )
  const [placed, setPlaced] = useState<Box | null>(null)
  const close = useCallback(() => {
    setEditing(null)
    setPlaced(null)
  }, [])

  useEffect(suspendWindowDrag, [])

  // Pick mode owns its exit: Esc leaves it wherever focus is, even with the drawer closed. While an editor popover
  // is open, Esc belongs to the popover (Cancel), so this listener is off.
  useEffect(() => {
    if (editing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      ui.set(s => ({ ...s, picking: false }))
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [editing, ui])
  const chipLabel = (target: PickTarget) =>
    target.kind === 'part' ? target.part.label : (libraryItems.find(i => i.uri === target.uri)?.name ?? 'Library item')
  const { hover, pointer } = usePickTarget(editing !== null, onPick)
  const spot = editing?.box ?? hover?.box

  return (
    <>
      {spot ? (
        <div class="b-pick__spot" style={{ transform: `translate3d(${spot.x}px, ${spot.y}px, 0)`, width: `${spot.width}px`, height: `${spot.height}px` }} />
      ) : (
        <div class="b-pick__dim" />
      )}
      {!editing && (
        <div class="b-pick__banner" role="status">
          Click a highlighted area to style it · <kbd>Esc</kbd> to finish
        </div>
      )}
      {!editing && hover && (
        <div class="b-pick__chip" style={{ transform: `translate3d(${pointer.x + 14}px, ${pointer.y + 16}px, 0)` }}>
          {chipLabel(hover.target)}
          <span class="b-mono">click to edit</span>
        </div>
      )}
      {editing && placed && <Leader part={editing.box} pop={placed} />}
      {editing && <PartPopover key={editing.part.id} part={editing.part} anchor={editing.box} onDone={close} onPlaced={setPlaced} />}
    </>
  )
}

/** A line from the picked part to its editor, with a pin on the part: which element you're styling, at a glance. */
function Leader({ part, pop }: { part: Box; pop: Box }) {
  const line = leaderLine(part, pop)
  if (!line) return null
  const len = Math.abs(line.y2 - line.y1)
  return (
    <svg class="b-pick__leader" aria-hidden="true">
      <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} style={{ '--len': len }} />
      <circle class="b-pick__ring" cx={line.x1} cy={line.y1} r={6} />
      <circle class="b-pick__pin" cx={line.x1} cy={line.y1} r={3.5} />
    </svg>
  )
}
