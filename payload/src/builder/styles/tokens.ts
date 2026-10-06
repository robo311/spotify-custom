// Design tokens for every builder surface. Derived from the active theme's --sc-* vars so the builder wears the theme;
// fallbacks (Darcula) only matter before the theme engine has applied anything.
import { css } from './sheet'

export const tokens = css`
  :host {
    all: initial;
    --b-bg: var(--sc-background, #1e1f22);
    --b-surface: var(--sc-surface, #2b2d30);
    --b-elevated: var(--sc-elevated, #393b40);
    --b-text: var(--sc-text, #dfe1e5);
    --b-sub: var(--sc-text-subdued, #9da0a8);
    --b-accent: var(--sc-accent, #3574f0);
    --b-on-accent: var(--sc-on-accent, #ffffff);
    --b-border: var(--sc-border, #43454a);

    --b-ui: 'SC Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
    --b-mono: 'SC Mono', ui-monospace, 'SF Mono', Menlo, monospace;

    --b-glass: color-mix(in oklch, var(--b-surface) 72%, transparent);
    /* Console: an opaque faceplate in the theme's frame colour (with no blur behind it, any translucency let
       Spotify's text ghost through), recessed wells for modules and the tab rail, and raised keys for whatever is
       selected. */
    --b-panel: var(--b-surface);
    --b-well: color-mix(in oklch, var(--b-bg) 86%, #000);
    --b-well-edge:
      inset 0 1px 2px rgb(0 0 0 / 0.28),
      inset 0 0 0 1px color-mix(in oklch, var(--b-border) 45%, transparent);
    /* A slot cut into a module (switch track, empty fader track): darker than whatever it sits on. */
    --b-slot: rgb(0 0 0 / 0.38);
    --b-key: color-mix(in oklch, var(--b-elevated) 90%, var(--b-text));
    --b-key-edge:
      inset 0 1px 0 rgb(255 255 255 / 0.08),
      0 1px 2px rgb(0 0 0 / 0.35),
      0 4px 12px -4px rgb(0 0 0 / 0.4);
    --b-line: color-mix(in oklch, var(--b-border) 60%, transparent);
    --b-hover: color-mix(in oklch, var(--b-text) 7%, transparent);
    --b-press: color-mix(in oklch, var(--b-text) 12%, transparent);
    --b-accent-soft: color-mix(in oklch, var(--b-accent) 18%, transparent);
    --b-warn: #f2b84b;

    --b-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
    --b-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
    --b-fast: 160ms;
    --b-med: 220ms;
    --b-r-sm: 6px;
    --b-r-md: 8px;
    --b-r-lg: 12px;
    --b-r-xl: 14px;

    font: 400 13px/1.45 var(--b-ui);
    color: var(--b-text);
    -webkit-font-smoothing: antialiased;
    letter-spacing: -0.003em;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  button,
  input,
  textarea,
  select {
    font: inherit;
    color: inherit;
    letter-spacing: inherit;
  }

  button {
    cursor: pointer;
    background: none;
    border: 0;
    padding: 0;
  }

  :focus-visible {
    outline: 2px solid var(--b-accent);
    outline-offset: 2px;
  }

  .b-mono {
    font-family: var(--b-mono);
    font-size: 12px;
    letter-spacing: 0;
    font-variant-numeric: tabular-nums;
  }

  .b-label {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0;
    color: var(--b-sub);
  }

  .b-hint {
    font-size: 12px;
    color: var(--b-sub);
  }

  .b-visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 1ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 1ms !important;
    }
  }
`
