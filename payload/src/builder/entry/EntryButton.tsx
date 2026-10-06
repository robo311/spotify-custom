// The studio's door: an outline artist's palette drawn like Spotify's own top-bar icons (16px, ~1.5px stroke).
// At rest it is as quiet as its neighbours; colour appears only with intent: on hover and while the studio is open the
// palette tilts and its paint dots pop in the theme's colours, and a theme change makes them flash once. A breathing
// ring shows Album Mode is steering the colours. The active dot also stays lit while a Spotify Custom update is waiting.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { contrastRatio } from '../../theme/palette'
import { useApp, useEnv, useUi } from '../context'
import { css, useStyles } from '../styles/sheet'
import { entryDotColors } from '../lib/entry-colors'

const PING_MS = 900

const styles = css`
  .b-entry {
    position: relative;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    color: var(--sc-text-subdued, #b3b3b3);
    transition:
      color 120ms ease,
      transform 160ms var(--b-spring);
  }
  .b-entry:hover,
  .b-entry[aria-expanded='true'] {
    color: var(--sc-text, #fff);
  }
  .b-entry:hover {
    transform: scale(1.04);
  }
  .b-entry:active {
    transform: scale(0.9);
    transition-duration: 60ms;
  }
  .b-entry svg {
    width: 16px;
    height: 16px;
    overflow: visible;
  }

  /* Body tilts like a palette picked up in the hand. */
  .b-entry__body {
    transform-box: view-box;
    transform-origin: 50% 60%;
    transition: transform 420ms var(--b-spring);
  }
  .b-entry:hover .b-entry__body,
  .b-entry[aria-expanded='true'] .b-entry__body {
    transform: rotate(-12deg);
  }

  /* Dots: small and monochrome at rest; enlarged and in theme colours on hover, while open, or during a ping. */
  .b-entry__dot {
    transform-box: fill-box;
    transform-origin: center;
    transform: scale(0.56);
    fill: currentColor;
    transition:
      transform 360ms var(--b-spring),
      fill 220ms ease;
    transition-delay: var(--d);
  }
  .b-entry:hover .b-entry__dot,
  .b-entry[aria-expanded='true'] .b-entry__dot,
  .b-entry.is-ping .b-entry__dot {
    transform: scale(1);
    fill: var(--c);
  }

  /* Spotify marks active toggles with a small dot underneath. */
  .b-entry__active {
    position: absolute;
    bottom: 1px;
    left: 50%;
    width: 4px;
    height: 4px;
    margin-left: -2px;
    border-radius: 50%;
    background: var(--sc-accent, #1ed760);
    transform: scale(0);
    transition: transform 240ms var(--b-spring);
  }
  .b-entry[aria-expanded='true'] .b-entry__active,
  .b-entry[data-update='true'] .b-entry__active {
    transform: scale(1);
  }

  .b-entry__ring {
    position: absolute;
    inset: 1px;
    border-radius: 50%;
    box-shadow: 0 0 0 1px var(--sc-album-color, var(--sc-accent, #1ed760));
    animation: b-breathe 3.6s ease-in-out infinite;
    pointer-events: none;
  }
  @keyframes b-breathe {
    0%,
    100% {
      opacity: 0.15;
      transform: scale(0.94);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.02);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .b-entry,
    .b-entry__body,
    .b-entry__dot,
    .b-entry__active {
      transition: none;
    }
    .b-entry:hover .b-entry__body,
    .b-entry[aria-expanded='true'] .b-entry__body {
      transform: none;
    }
    .b-entry__ring {
      animation: none;
      opacity: 0.5;
    }
  }
`

// Lucide "palette" geometry (ISC) on its 24-unit grid; stroke 2.2 renders at ~1.5px when drawn at 16px.
const BODY = 'M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z'
/** Accent first: it takes the most prominent spot at the top of the palette. */
const DOTS = [
  { cx: 13.5, cy: 6.5 },
  { cx: 17.5, cy: 10.5 },
  { cx: 8.5, cy: 7.5 },
  { cx: 6.5, cy: 12.5 },
] as const

/** True for PING_MS after the palette changes (not on first render), so a theme switch is acknowledged at a glance. */
function usePing(key: string): boolean {
  const [ping, setPing] = useState(false)
  const prevKeyRef = useRef(key)
  useEffect(() => {
    if (prevKeyRef.current === key) return
    prevKeyRef.current = key
    setPing(true)
    const timer = setTimeout(() => setPing(false), PING_MS)
    return () => clearTimeout(timer)
  }, [key])
  return ping
}

export function EntryButton() {
  useStyles(styles)
  const { ui } = useEnv()
  const open = useUi(s => s.open)
  const palette = useApp(s => s.active.palette)
  const albumMode = useApp(s => s.active.effects.albumMode)
  const updateAvailable = useApp(s => s.update.state === 'available')
  const label = updateAvailable ? 'Theme studio · Spotify Custom update available' : 'Theme studio'
  const dots = useMemo(() => entryDotColors(palette, contrastRatio), [palette])
  const ping = usePing(dots.join())

  return (
    <button
      type="button"
      class={ping ? 'b-entry is-ping' : 'b-entry'}
      aria-label={label}
      title={label}
      aria-expanded={open}
      data-update={updateAvailable}
      onClick={() => ui.set(s => ({ ...s, open: !s.open, picking: s.open ? false : s.picking }))}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <g class="b-entry__body">
          <path d={BODY} stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
          {DOTS.map((p, i) => (
            <circle key={i} class="b-entry__dot" cx={p.cx} cy={p.cy} r={1.9} style={{ '--c': dots[i], '--d': `${i * 45}ms` }} />
          ))}
        </g>
      </svg>
      <span class="b-entry__active" aria-hidden="true" />
      {albumMode && <span class="b-entry__ring" aria-hidden="true" />}
    </button>
  )
}
