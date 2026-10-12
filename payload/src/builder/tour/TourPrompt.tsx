// First run: a small card hanging from the studio button in Spotify's top bar offers the guided tour. Asked once:
// Show me, Not now, or opening the studio some other way all count as the answer (the tour stays one click away in
// the studio's header). It waits for the studio button, so it always points at something real.
import { useEffect, useState } from 'preact/hooks'
import { useEnv, useUi } from '../context'
import { css, useStyles } from '../styles/sheet'
import { loadPrefs, savePrefs } from '../lib/prefs'
import { OWN_ID_PREFIX } from '../lib/shadow-host'
import { Button } from '../ui/Button'
import { startTour } from './tour'

const ENTRY_ID = `${OWN_ID_PREFIX}entry` // the entry button's host (entry/mount-entry.tsx)
const RECHECK_MS = 1000 // the top bar can appear late and the window can be resized
const WIDTH = 288
const EDGE = 12

const styles = css`
  .b-tourprompt {
    position: fixed;
    top: 0;
    left: 0;
    display: grid;
    gap: 6px;
    width: ${WIDTH}px;
    padding: 14px 16px;
    border-radius: var(--b-r-lg);
    background: var(--b-panel);
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 0.07),
      inset 0 0 0 1px var(--b-line),
      0 18px 48px rgb(0 0 0 / 0.5);
    pointer-events: auto;
    animation: b-tourprompt-in 260ms var(--b-ease);
  }
  /* The notch pointing up at the studio button. */
  .b-tourprompt::before {
    content: '';
    position: absolute;
    top: -6px;
    left: var(--notch);
    width: 10px;
    height: 10px;
    background: var(--b-panel);
    box-shadow:
      inset 1px 1px 0 var(--b-line);
    transform: rotate(45deg);
  }
  .b-tourprompt__title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .b-tourprompt__body {
    margin: 0;
    color: var(--b-sub);
    line-height: 1.45;
  }
  .b-tourprompt__actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 6px;
  }
  @keyframes b-tourprompt-in {
    from {
      opacity: 0;
      translate: 0 -6px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .b-tourprompt {
      animation: none;
    }
  }
`

interface Anchor {
  centerX: number
  bottom: number
}

function measureEntry(): Anchor | null {
  const el = document.getElementById(ENTRY_ID)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { centerX: Math.round(r.x + r.width / 2), bottom: Math.round(r.bottom) }
}

export function TourPrompt() {
  useStyles(styles)
  const { ui } = useEnv()
  const open = useUi(s => s.open)
  const [pending, setPending] = useState(() => !loadPrefs().tourSeen)
  const [anchor, setAnchor] = useState<Anchor | null>(null)

  const answer = () => {
    savePrefs({ tourSeen: true })
    setPending(false)
  }

  useEffect(() => {
    if (!pending || !open) return
    savePrefs({ tourSeen: true })
    setPending(false)
  }, [pending, open])

  useEffect(() => {
    if (!pending) return
    const measure = () => {
      const next = measureEntry()
      setAnchor(prev => (prev?.centerX === next?.centerX && prev?.bottom === next?.bottom ? prev : next))
    }
    measure()
    const timer = setInterval(measure, RECHECK_MS)
    window.addEventListener('resize', measure)
    return () => {
      clearInterval(timer)
      window.removeEventListener('resize', measure)
    }
  }, [pending])

  if (!pending || open || !anchor) return null
  // Right-aligned under the button (it sits near the window's right edge), kept on screen.
  const x = Math.max(EDGE, Math.min(anchor.centerX - WIDTH + 30, window.innerWidth - WIDTH - EDGE))
  return (
    <div
      class="b-tourprompt"
      role="dialog"
      aria-labelledby="b-tourprompt-title"
      style={{ transform: `translate3d(${x}px, ${anchor.bottom + 10}px, 0)`, '--notch': `${anchor.centerX - x - 5}px` }}
      onKeyDown={e => {
        if (e.key === 'Escape') answer()
      }}
    >
      <h2 class="b-tourprompt__title" id="b-tourprompt-title">
        Your theme studio is ready
      </h2>
      <p class="b-tourprompt__body">Want a short tour of what you can change? You can always take it later.</p>
      <div class="b-tourprompt__actions">
        <Button onClick={answer}>Not now</Button>
        <Button
          variant="primary"
          onClick={() => {
            answer()
            startTour(ui)
          }}
        >
          Show me
        </Button>
      </div>
    </div>
  )
}
