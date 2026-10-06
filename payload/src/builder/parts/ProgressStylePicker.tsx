// Song progress bar look, each option previewed by a tiny animated bar in the theme's colours.
// Previews loop slowly as if a song is playing; reduced motion freezes them (see tokens).
import type { ProgressStyle } from '../../types'
import { useApp, useEnv } from '../context'
import { css, useStyles } from '../styles/sheet'
import { OptionTiles, type TileOption } from '../ui/OptionTiles'

const styles = css`
  .b-pbar {
    display: grid;
    align-items: center;
    height: 40px;
    padding: 0 12px;
    background: var(--pb-bg);
  }
  .b-pbar__track {
    position: relative;
    height: 4px;
    border-radius: 999px;
    background: color-mix(in oklch, var(--pb-text) 22%, transparent);
  }
  .b-pbar__fill {
    position: absolute;
    inset: 0 auto 0 0;
    width: 55%;
    border-radius: inherit;
    background: var(--pb-text);
    animation: b-pbar-play 7s linear infinite alternate;
  }
  @keyframes b-pbar-play {
    from {
      width: 30%;
    }
    to {
      width: 75%;
    }
  }

  /* glow: accent fill with a soft glow and a springy playhead */
  .b-pbar--glow .b-pbar__fill {
    background: var(--pb-accent);
    box-shadow: 0 0 8px 1px color-mix(in oklch, var(--pb-accent) 70%, transparent);
  }
  .b-pbar--glow .b-pbar__fill::after {
    content: '';
    position: absolute;
    top: 50%;
    right: -5px;
    width: 10px;
    height: 10px;
    margin-top: -5px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 10px 2px color-mix(in oklch, var(--pb-accent) 80%, transparent);
    animation: b-pbar-pulse 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
  }
  @keyframes b-pbar-pulse {
    0%,
    100% {
      transform: scale(0.85);
    }
    50% {
      transform: scale(1.15);
    }
  }

  /* flow: gradient fill with a sheen sweeping along it */
  .b-pbar--flow .b-pbar__fill {
    overflow: hidden;
    background: linear-gradient(90deg, color-mix(in oklch, var(--pb-accent) 55%, var(--pb-bg)), var(--pb-accent));
  }
  .b-pbar--flow .b-pbar__fill::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.65), transparent);
    transform: translateX(-100%);
    animation: b-pbar-sheen 1.8s ease-in-out infinite;
  }
  @keyframes b-pbar-sheen {
    to {
      transform: translateX(100%);
    }
  }

  /* wave: the played part is a moving wave */
  .b-pbar--wave .b-pbar__track {
    overflow: visible;
  }
  .b-pbar--wave .b-pbar__fill {
    top: -6px;
    bottom: -6px;
    overflow: hidden;
    background: none;
    border-radius: 0;
  }
  .b-pbar__wave {
    position: absolute;
    top: 0;
    left: 0;
    width: 400%;
    height: 100%;
    color: var(--pb-accent);
    animation: b-pbar-wave 0.7s linear infinite;
  }
  @keyframes b-pbar-wave {
    to {
      transform: translateX(-10%);
    }
  }

  /* segments: a level meter of separate blocks, the one at the playhead blinking */
  .b-pbar--segments .b-pbar__track {
    border-radius: 0;
    mask-image: repeating-linear-gradient(90deg, #000 0 4px, transparent 4px 6px);
  }
  .b-pbar--segments .b-pbar__fill {
    background: var(--pb-accent);
  }
  .b-pbar--segments .b-pbar__fill::after {
    content: '';
    position: absolute;
    inset: 0 0 0 auto;
    width: 6px;
    background: oklch(from var(--pb-accent) min(calc(l + 0.25), 0.97) c h);
    animation: b-pbar-blink 1.2s steps(1) infinite;
  }
  @keyframes b-pbar-blink {
    50% {
      opacity: 0;
    }
  }

  /* stripes: darker diagonal stripes sliding along the fill */
  .b-pbar--stripes .b-pbar__fill {
    overflow: hidden;
    background: var(--pb-accent);
  }
  .b-pbar--stripes .b-pbar__fill::after {
    content: '';
    position: absolute;
    inset: 0 0 0 -8px;
    background-image: linear-gradient(
      135deg,
      oklch(from var(--pb-accent) calc(l * 0.72) c h) 25%,
      transparent 25% 50%,
      oklch(from var(--pb-accent) calc(l * 0.72) c h) 50% 75%,
      transparent 75%
    );
    background-size: 8px 8px;
    animation: b-pbar-stripes 1s linear infinite;
  }
  @keyframes b-pbar-stripes {
    to {
      transform: translateX(8px);
    }
  }
`

// A 200-unit strip with one wave period every 20 units. The animation shifts it by exactly one period (10% of the
// strip), so the loop is seamless.
const PERIOD = 20
const WAVE = Array.from({ length: 201 }, (_, x) => `${x === 0 ? 'M' : 'L'}${x} ${(8 + 4 * Math.sin((2 * Math.PI * x) / PERIOD)).toFixed(2)}`).join(' ')

function Preview({ style }: { style: ProgressStyle }) {
  useStyles(styles)
  const palette = useApp(s => s.active.palette)
  return (
    <span class={`b-pbar b-pbar--${style}`} style={{ '--pb-bg': palette.surface, '--pb-text': palette.text, '--pb-accent': palette.accent }}>
      <span class="b-pbar__track">
        <span class="b-pbar__fill">
          {style === 'wave' && (
            <svg class="b-pbar__wave" viewBox="0 0 200 16" preserveAspectRatio="none" aria-hidden="true">
              <path d={WAVE} fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" vector-effect="non-scaling-stroke" />
            </svg>
          )}
        </span>
      </span>
    </span>
  )
}

const OPTIONS: readonly TileOption<ProgressStyle>[] = [
  { value: 'spotify', label: 'Spotify', title: 'Spotify’s own bar', preview: <Preview style="spotify" /> },
  { value: 'glow', label: 'Glow', title: 'Glowing accent with a lively playhead', preview: <Preview style="glow" /> },
  { value: 'flow', label: 'Flow', title: 'Gradient with a light sweeping through it', preview: <Preview style="flow" /> },
  { value: 'wave', label: 'Wave', title: 'A wave that rides along while music plays', preview: <Preview style="wave" /> },
  { value: 'segments', label: 'Segments', title: 'A level meter of blocks, the current one blinking', preview: <Preview style="segments" /> },
  { value: 'stripes', label: 'Stripes', title: 'Diagonal stripes that slide while music plays', preview: <Preview style="stripes" /> },
]

export function ProgressStylePicker() {
  const { store } = useEnv()
  const value = useApp(s => s.active.effects.progressBar)
  return (
    <OptionTiles
      label="Progress bar style"
      value={value}
      options={OPTIONS}
      onChange={v =>
        store.edit(t => {
          t.effects.progressBar = v
        })
      }
    />
  )
}
