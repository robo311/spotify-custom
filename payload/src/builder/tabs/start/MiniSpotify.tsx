// A miniature Spotify window drawn in CSS with a theme's palette: sidebar, a grid of cards, and the player bar.
// Not a screenshot, so it is always exactly the theme (and costs no images).
import type { Theme } from '../../../types'
import { css, useStyles } from '../../styles/sheet'

const styles = css`
  .b-mini {
    --r: calc(var(--rad) * 0.35px);
    display: grid;
    grid-template-columns: 26% 1fr;
    grid-template-rows: minmax(0, 1fr) 18%;
    gap: 3px;
    aspect-ratio: 16 / 10;
    padding: 3px;
    border-radius: 9px;
    background: color-mix(in oklch, var(--m-bg) 65%, black);
    overflow: hidden;
    font-size: 0;
  }
  .b-mini__side,
  .b-mini__main,
  .b-mini__player {
    border-radius: max(2px, var(--r));
  }
  .b-mini__side {
    display: grid;
    align-content: start;
    gap: 5px;
    padding: 7px 6px;
    background: var(--m-surface);
  }
  .b-mini__row {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .b-mini__thumb {
    flex: none;
    width: 9px;
    height: 9px;
    border-radius: max(1px, calc(var(--r) * 0.5));
    background: var(--m-elevated);
  }
  .b-mini__line {
    height: 3px;
    border-radius: 2px;
    background: var(--m-sub);
    opacity: 0.8;
  }
  .b-mini__line--text {
    background: var(--m-text);
    opacity: 1;
  }
  .b-mini__main {
    display: grid;
    grid-template-rows: auto 1fr;
    gap: 6px;
    min-height: 0;
    overflow: hidden;
    padding: 7px 8px;
    background: linear-gradient(to bottom, color-mix(in oklch, var(--m-accent) 26%, var(--m-bg)) 0%, var(--m-bg) 45%);
  }
  .b-mini__title {
    width: 46%;
    height: 5px;
    border-radius: 3px;
    background: var(--m-text);
  }
  .b-mini__grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
  }
  .b-mini__card {
    display: grid;
    gap: 3px;
    padding: 3px;
    border-radius: max(2px, calc(var(--r) * 0.7));
    background: var(--m-elevated);
  }
  .b-mini__art {
    height: 11px;
    border-radius: max(1px, calc(var(--r) * 0.5));
    background: color-mix(in oklch, var(--m-text) 12%, var(--m-elevated));
  }
  .b-mini__card:nth-child(2) .b-mini__art {
    background: color-mix(in oklch, var(--m-accent) 55%, var(--m-elevated));
  }
  .b-mini__card:nth-child(4) .b-mini__art {
    background: color-mix(in oklch, var(--m-accent) 30%, var(--m-elevated));
  }
  .b-mini__player {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: 1fr 1.4fr 1fr;
    align-items: center;
    gap: 6px;
    padding: 0 6px;
    background: var(--m-surface);
  }
  .b-mini__now {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .b-mini__controls {
    display: grid;
    justify-items: center;
    gap: 2px;
    width: 60%;
  }
  .b-mini__play {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--m-accent);
    box-shadow: 0 0 6px color-mix(in oklch, var(--m-accent) 60%, transparent);
  }
  .b-mini__progress {
    width: 100%;
    height: 2px;
    border-radius: 2px;
    background: linear-gradient(to right, var(--m-accent) 38%, var(--m-border) 38%);
  }
`

export function MiniSpotify({ theme }: { theme: Theme }) {
  useStyles(styles)
  const p = theme.palette
  const vars = {
    '--m-bg': p.background,
    '--m-surface': p.surface,
    '--m-elevated': p.elevated,
    '--m-text': p.text,
    '--m-sub': p.textSubdued,
    '--m-accent': p.accent,
    '--m-border': p.border,
    '--rad': theme.radius,
  }

  return (
    <div class="b-mini" style={vars} aria-hidden="true">
      <div class="b-mini__side">
        {[60, 44, 70, 52].map((w, i) => (
          <div key={w} class="b-mini__row">
            <span class="b-mini__thumb" />
            <span class={`b-mini__line${i === 0 ? ' b-mini__line--text' : ''}`} style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
      <div class="b-mini__main">
        <span class="b-mini__title" />
        <div class="b-mini__grid">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} class="b-mini__card">
              <span class="b-mini__art" />
              <span class="b-mini__line b-mini__line--text" style={{ width: '70%' }} />
            </div>
          ))}
        </div>
      </div>
      <div class="b-mini__player">
        <div class="b-mini__now">
          <span class="b-mini__thumb" />
          <span class="b-mini__line b-mini__line--text" style={{ width: '40%' }} />
        </div>
        <div class="b-mini__controls">
          <span class="b-mini__play" />
          <span class="b-mini__progress" />
        </div>
        <span />
      </div>
    </div>
  )
}
