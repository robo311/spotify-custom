// Floating panel at a viewport position. Closes on Esc or a press outside (separately reported, so editors can
// treat Esc as cancel); returns focus where it came from. It re-places itself whenever its size changes (a colour
// picker opening inside it, say), so it always stays inside the window.
import type { ComponentChildren } from 'preact'
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import { css, useStyles } from '../styles/sheet'
import { placePopover, type Box } from '../lib/pick'

const styles = css`
  .b-pop {
    position: fixed;
    z-index: 2;
    width: 336px;
    max-height: min(600px, calc(100vh - 24px));
    overflow: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: var(--b-press) transparent;
    border-radius: var(--b-r-xl);
    /* No backdrop blur: the panel is near-opaque, and a blur under it would be recomputed on every frame
       Spotify (or pick mode's spotlight) repaints beneath it. */
    background: var(--b-panel);
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 0.07),
      inset 0 0 0 1px var(--b-line),
      0 0 0 1px rgb(0 0 0 / 0.25),
      0 22px 60px rgb(0 0 0 / 0.5);
    pointer-events: auto;
    animation: b-pop-in var(--b-med) var(--b-ease);
    transform-origin: var(--ox) var(--oy);
    transition:
      top var(--b-med) var(--b-ease),
      left var(--b-med) var(--b-ease);
  }
  .b-pop:focus {
    outline: none;
  }
  @keyframes b-pop-in {
    from {
      opacity: 0;
      transform: scale(0.97) translateY(4px);
    }
  }
`

interface PopoverProps {
  anchor: Box
  label: string
  /** Pressing outside the popover. */
  onClose: () => void
  /** Esc; defaults to onClose. */
  onEscape?: () => void
  /** Space between the anchor and the popover (px). */
  gap?: number
  /** Where it ended up (after every re-placement), e.g. to draw a leader line to the anchor. */
  onPlaced?: (rect: Box) => void
  children: ComponentChildren
}

export function Popover({ anchor, label, onClose, onEscape = onClose, gap = 12, onPlaced, children }: PopoverProps) {
  useStyles(styles)
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: anchor.x, y: anchor.y + anchor.height + 12 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const place = () => {
      const size = { width: el.offsetWidth, height: el.offsetHeight }
      const next = placePopover(anchor, size, { width: innerWidth, height: innerHeight }, gap)
      setPos(next)
      onPlaced?.({ ...next, ...size })
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(el)
    return () => observer.disconnect()
  }, [anchor, gap, onPlaced])

  useEffect(() => {
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    // Focus the dialog itself, not its first control: a focus ring on the first option reads as a second selection.
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onEscape()
    }
    const onPress = (e: PointerEvent) => {
      if (ref.current && !e.composedPath().includes(ref.current)) onClose()
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('pointerdown', onPress, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('pointerdown', onPress, true)
      returnFocus?.focus()
    }
  }, [onClose, onEscape])

  return (
    <div ref={ref} class="b-pop" role="dialog" aria-label={label} tabIndex={-1} style={{ left: `${pos.x}px`, top: `${pos.y}px`, '--ox': `${anchor.x - pos.x + anchor.width / 2}px`, '--oy': `${anchor.y - pos.y}px` }}>
      {children}
    </div>
  )
}
