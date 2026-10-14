// What's new in Spotify Custom: a sparkle beside the studio's door, drawn like Spotify's own top-bar icons. While the
// latest release's showcase is unseen it is lit: the theme's accent, its small sparkles twinkling in turn, and a dot
// underneath like Spotify's active markers. No glow, no bounce. Seen, it is as quiet as its neighbours and replays
// the showcase.
import { useEnv, useUi } from '../context'
import { css, useStyles } from '../styles/sheet'
import { startWhatsNew } from '../tour/tour'
import { WHATS_NEW } from '../tour/whats-new'

const styles = css`
  .b-new {
    position: relative;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    color: var(--sc-text-subdued, #b3b3b3);
    transition: color 120ms ease;
  }
  .b-new:hover {
    color: var(--sc-text, #fff);
  }
  .b-new svg {
    width: 16px;
    height: 16px;
    overflow: visible;
  }
  .b-new.is-lit {
    color: var(--sc-accent, #1ed760);
  }
  .b-new__twinkle {
    transform-box: fill-box;
    transform-origin: center;
  }
  .b-new.is-lit .b-new__twinkle {
    animation: b-twinkle 2.4s ease-in-out infinite;
    animation-delay: var(--d);
  }
  @keyframes b-twinkle {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.25;
      transform: scale(0.5);
    }
  }
  .b-new__dot {
    position: absolute;
    bottom: 1px;
    left: 50%;
    width: 4px;
    height: 4px;
    margin-left: -2px;
    border-radius: 50%;
    background: var(--sc-accent, #1ed760);
  }

  @media (prefers-reduced-motion: reduce) {
    .b-new,
    .b-new.is-lit .b-new__twinkle {
      transition: none;
      animation: none;
    }
  }
`

// Lucide "sparkles" geometry (ISC) on its 24-unit grid; stroke 2.2 renders at ~1.5px when drawn at 16px.
const STAR =
  'M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z'

export function WhatsNewButton() {
  useStyles(styles)
  const { ui } = useEnv()
  const lit = useUi(s => s.whatsNewSeen !== WHATS_NEW.id)
  const label = lit ? `New in Spotify Custom: ${WHATS_NEW.label}` : 'New in Spotify Custom (show again)'

  return (
    <button type="button" class={lit ? 'b-new is-lit' : 'b-new'} aria-label={label} title={label} onClick={() => startWhatsNew(ui)}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d={STAR} />
        <g class="b-new__twinkle" style={{ '--d': '0ms' }}>
          <path d="M20 2v4" />
          <path d="M22 4h-4" />
        </g>
        <circle class="b-new__twinkle" cx="4" cy="20" r="2" style={{ '--d': '1200ms' }} />
      </svg>
      {lit && <span class="b-new__dot" aria-hidden="true" />}
    </button>
  )
}
