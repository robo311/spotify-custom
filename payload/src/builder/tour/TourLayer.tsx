// A guide on screen (the guided tour, or a release's What's new showcase): a spotlight on the real control a step is about and a card beside it (Back / Next /
// Skip). It never blocks anything: every control stays clickable, so each step can be tried on the spot. Esc or
// closing the studio ends it; while pick mode is on (step "Point and style") pick mode owns the dimming and Esc.
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import { useEnv, useUi } from '../context'
import { css, useStyles } from '../styles/sheet'
import { listenEscape } from '../lib/escape-key'
import type { Box } from '../lib/pick'
import { placeTourCard } from '../lib/tour-placement'
import { Button } from '../ui/Button'
import { endTour, goToStep, stepsOf } from './tour'

const PAD = 4 // the spotlight's breathing room around its target
const CARD_W = 300

const styles = css`
  .b-tour__spot {
    position: fixed;
    top: 0;
    left: 0;
    border-radius: var(--b-r-md);
    box-shadow:
      0 0 0 100vmax rgb(0 0 0 / 0.45),
      0 0 0 2px var(--b-accent);
    transition:
      transform 220ms var(--b-ease),
      width 220ms var(--b-ease),
      height 220ms var(--b-ease);
    pointer-events: none;
    animation: b-tour-fade 200ms var(--b-ease);
  }
  .b-tour__card {
    position: fixed;
    top: 0;
    left: 0;
    display: grid;
    gap: 8px;
    width: ${CARD_W}px;
    padding: 16px 16px 14px;
    border-radius: var(--b-r-lg);
    background: var(--b-panel);
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 0.07),
      inset 0 0 0 1px var(--b-line),
      0 18px 48px rgb(0 0 0 / 0.5);
    pointer-events: auto;
    animation: b-tour-in 220ms var(--b-ease);
  }
  .b-tour__count {
    font-family: var(--b-mono);
    font-size: 11px;
    color: var(--b-sub);
  }
  .b-tour__title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .b-tour__body {
    margin: 0;
    color: var(--b-sub);
    line-height: 1.45;
  }
  .b-tour__actions {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
  }
  .b-tour__skip {
    margin-right: auto;
    padding: 4px 2px;
    color: var(--b-sub);
    font-size: 12px;
  }
  .b-tour__skip:hover {
    color: var(--b-text);
  }
  @keyframes b-tour-fade {
    from {
      opacity: 0;
    }
  }
  @keyframes b-tour-in {
    from {
      opacity: 0;
      translate: 0 6px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .b-tour__spot,
    .b-tour__card {
      transition: none;
      animation: none;
    }
  }
`

export function TourLayer() {
  useStyles(styles)
  const { ui, root } = useEnv()
  const index = useUi(s => s.tour)
  const guide = useUi(s => s.guide)
  const open = useUi(s => s.open)
  const running = index !== undefined

  useEffect(() => {
    if (running && !open) endTour(ui)
  }, [running, open, ui])

  useEffect(() => {
    if (!running) return
    return listenEscape(root, e => {
      if (ui.get().picking) return // pick mode's own Esc (registered after ours) leaves pick mode first
      e.preventDefault()
      endTour(ui)
    })
  }, [running, root, ui])

  if (!running || !open) return null
  return <TourStep key={`${guide ?? 'tour'}-${index}`} index={index} />
}

interface Layout {
  spot: Box | null
  card: { x: number; y: number }
}

const sameLayout = (a: Layout, b: Layout) => JSON.stringify(a) === JSON.stringify(b)

function TourStep({ index }: { index: number }) {
  const { ui, root } = useEnv()
  const picking = useUi(s => s.picking)
  const guide = useUi(s => s.guide)
  const steps = stepsOf(guide)
  const step = steps[index] ?? steps[0]
  const last = index >= steps.length - 1
  const cardRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<Layout | null>(null)

  // Follows the target every frame while the step is up: the tab renders, the drawer animates, scrolls and can be
  // dragged, and none of that tells us. One rect read per frame, and a re-render only when something moved.
  useLayoutEffect(() => {
    let frame = 0
    let scrolled = false
    const measure = () => {
      const target = root.querySelector(step.target)
      if (target && !scrolled) {
        target.scrollIntoView({ block: 'nearest' })
        scrolled = true
      }
      const r = target?.getBoundingClientRect()
      const spot = r ? { x: r.x - PAD, y: r.y - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 } : null
      const card = cardRef.current
      const size = { width: CARD_W, height: card?.offsetHeight ?? 0 }
      const next = { spot, card: placeTourCard(spot, size, { width: window.innerWidth, height: window.innerHeight }) }
      setLayout(prev => (prev && sameLayout(prev, next) ? prev : next))
      frame = requestAnimationFrame(measure)
    }
    measure()
    return () => cancelAnimationFrame(frame)
  }, [root, step.target])

  useEffect(() => {
    // Keyboard users land on Next, so Enter walks the tour.
    cardRef.current?.querySelector<HTMLButtonElement>('.b-btn--primary')?.focus({ preventScroll: true })
  }, [])

  const titleId = `b-tour-title-${index}`
  return (
    <>
      {layout?.spot && !picking && (
        <div
          class="b-tour__spot"
          style={{ transform: `translate3d(${layout.spot.x}px, ${layout.spot.y}px, 0)`, width: `${layout.spot.width}px`, height: `${layout.spot.height}px` }}
        />
      )}
      <div
        ref={cardRef}
        class="b-tour__card"
        role="dialog"
        aria-labelledby={titleId}
        style={{ transform: layout ? `translate3d(${layout.card.x}px, ${layout.card.y}px, 0)` : undefined, visibility: layout ? undefined : 'hidden' }}
      >
        <span class="b-tour__count">
          {index + 1} / {steps.length}
        </span>
        <h2 class="b-tour__title" id={titleId}>
          {step.title}
        </h2>
        <p class="b-tour__body">{step.body}</p>
        <div class="b-tour__actions">
          <button type="button" class="b-tour__skip" onClick={() => endTour(ui)}>
            {guide === 'whatsNew' ? 'Skip' : 'Skip tour'}
          </button>
          <Button disabled={index === 0} onClick={() => goToStep(ui, index - 1)}>
            Back
          </Button>
          <Button variant="primary" onClick={() => (last ? endTour(ui) : goToStep(ui, index + 1))}>
            {last ? 'Done' : 'Next'}
          </Button>
        </div>
      </div>
    </>
  )
}
