// Stats shelf styles. Lives in the shelf's shadow root, so it only sees inherited theme vars (--sc-*), which is also
// why every var has a Spotify-default fallback (the shelf must look right even before the theme engine runs).
// --sc-stats-* are set by the "Your listening" part (parts/registry.ts) when the user styles the shelf.

export const STATS_CSS = /* css */ `
.sc-stats {
  --bg: var(--sc-background, #121212);
  --elevated: var(--sc-stats-surface, var(--sc-elevated, #1f1f1f));
  --text: var(--sc-stats-text, var(--sc-text, #ffffff));
  --subdued: var(--sc-stats-subdued, var(--sc-text-subdued, #b3b3b3));
  --accent: var(--sc-stats-accent, var(--sc-accent, #1ed760));
  --border: var(--sc-border, #2a2a2a);
  --radius: var(--sc-stats-radius, var(--sc-radius, 8px));
  --mono: var(--sc-font-mono, ui-monospace, monospace);
  --ease: cubic-bezier(.2, .8, .2, 1);
  --hero-h: 288px;
  container-type: inline-size;
  color: var(--text);
  font-family: var(--sc-font-ui, inherit);
  padding: 4px 0 28px;
}

/* ---------- header ---------- */
.sc-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px 24px; margin-bottom: 16px; }
.sc-title { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.2; }
.sc-eyebrow { display: block; margin-bottom: 4px; color: var(--subdued); font-size: 10.5px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.sc-controls { display: flex; flex-wrap: wrap; gap: 8px; }

/* ---------- segmented control: the selected option paints its own pill (text-on-background pair) ---------- */
.sc-seg { display: inline-flex; gap: 2px; padding: 3px; border-radius: 999px; background: color-mix(in oklab, var(--elevated) 85%, transparent); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--border) 60%, transparent); }
.sc-seg button { height: 28px; padding: 0 14px; border: 0; border-radius: 999px; background: transparent; color: var(--subdued); font: 600 12px/1 var(--sc-font-ui, inherit); cursor: pointer; transition: background-color 200ms var(--ease), color 200ms var(--ease); }
.sc-seg button:hover { color: var(--text); }
.sc-seg button[aria-checked="true"] { background: var(--text); color: var(--bg); }
.sc-seg button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* ---------- layout: hero | chart list ---------- */
.sc-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 16px; }
@container (max-width: 760px) { .sc-grid { grid-template-columns: minmax(0, 1fr); } }

.sc-name { overflow: hidden; font-size: 15px; font-weight: 600; line-height: 1.3; white-space: nowrap; text-overflow: ellipsis; }
.sc-sub { overflow: hidden; margin-top: 2px; color: var(--subdued); font-size: 13px; line-height: 1.35; white-space: nowrap; text-overflow: ellipsis; }

/* ---------- #1 hero: image side melts into its own colour; outlined numeral behind the text side ---------- */
.sc-hero {
  --glow: var(--accent);
  position: relative; display: grid; grid-template-columns: var(--hero-h) minmax(0, 1fr); min-height: var(--hero-h); padding: 0; overflow: hidden;
  border: 0; border-radius: calc(var(--radius) * 1.5); color: inherit; font: inherit; text-align: left; cursor: pointer; isolation: isolate;
  background:
    radial-gradient(75% 130% at 38% 55%, color-mix(in oklab, var(--glow) 55%, transparent), transparent 75%),
    color-mix(in oklab, var(--elevated) 70%, var(--bg));
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--border) 45%, transparent), inset 0 1px 0 rgb(255 255 255 / .06);
  animation: sc-rise 460ms var(--ease) both;
  transition: transform 180ms var(--ease);
}
.sc-hero:active { transform: scale(.992); }
.sc-hero:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.sc-hero-media { position: relative; height: 100%; overflow: hidden; }
.sc-hero-media img, .sc-hero-media .sc-ph { display: block; width: 100%; height: 100%; object-fit: cover; -webkit-mask-image: linear-gradient(90deg, #000 58%, transparent); mask-image: linear-gradient(90deg, #000 58%, transparent); transition: transform 600ms var(--ease); }
.sc-hero:hover .sc-hero-media img { transform: scale(1.04); }
.sc-hero-text { position: relative; display: flex; flex-direction: column; justify-content: flex-end; min-width: 0; padding: 24px 24px 24px 4px; }
.sc-hero-rank { position: absolute; z-index: -1; top: -30px; right: 10px; color: transparent; -webkit-text-stroke: 1.5px color-mix(in oklab, var(--text) 22%, transparent); font: 800 188px/1 var(--mono); letter-spacing: -0.07em; pointer-events: none; user-select: none; }
.sc-hero .sc-eyebrow { margin-bottom: 8px; color: color-mix(in oklab, var(--text) 72%, transparent); }
.sc-hero-name { font-size: clamp(26px, 4.4cqi, 44px); font-weight: 800; letter-spacing: -0.025em; line-height: 1.02; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.sc-hero-sub { margin-top: 8px; overflow: hidden; color: var(--subdued); font-size: 14px; font-weight: 500; white-space: nowrap; text-overflow: ellipsis; }
@container (max-width: 460px) {
  .sc-hero { --hero-h: 200px; grid-template-columns: 42% minmax(0, 1fr); }
  .sc-hero-rank { font-size: 120px; top: -18px; }
}

/* ---------- ranks 02–05: chart rows, numeral in its own column ---------- */
.sc-list { display: grid; grid-template-rows: repeat(var(--rows, 4), minmax(0, 1fr)); gap: 4px; min-height: 0; margin: 0; padding: 0; list-style: none; }
.sc-list > li { display: flex; min-height: 0; }
.sc-row { display: grid; flex: 1; grid-template-columns: 3ch 56px minmax(0, 1fr); align-items: center; column-gap: 16px; min-width: 0; padding: 6px 12px 6px 8px; border: 0; border-radius: var(--radius); background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; transition: background-color 180ms var(--ease); animation: sc-rise 460ms var(--ease) both; animation-delay: calc(var(--i, 0) * 40ms); }
.sc-row:hover { background: color-mix(in oklab, var(--elevated) 90%, transparent); }
.sc-row:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.sc-row-rank { color: color-mix(in oklab, var(--accent) 72%, var(--text)); font: 700 28px/1 var(--mono); letter-spacing: -0.05em; text-align: right; }
.sc-thumb { display: block; width: 56px; height: 56px; border-radius: calc(var(--radius) * .6); object-fit: cover; background: var(--elevated); box-shadow: 0 6px 16px -8px rgb(0 0 0 / .7); }
.sc-round .sc-thumb { border-radius: 50%; }
.sc-row-text { display: flex; flex-direction: column; min-width: 0; }

/* ---------- look switches (theme.homeStyle) ---------- */
.sc-stats[data-sc-glow="false"] .sc-hero { background: color-mix(in oklab, var(--elevated) 70%, var(--bg)); }
.sc-stats[data-sc-ranks="false"] :is(.sc-hero-rank, .sc-row-rank, .sc-card-rank) { display: none; }
.sc-stats[data-sc-ranks="false"] .sc-row { grid-template-columns: 56px minmax(0, 1fr); }
/* Ten items: slimmer chart rows so #1 doesn't grow too tall next to them. */
.sc-stats[data-sc-count="10"] .sc-row { padding-block: 3px; column-gap: 14px; grid-template-columns: 3ch 44px minmax(0, 1fr); }
.sc-stats[data-sc-count="10"][data-sc-ranks="false"] .sc-row { grid-template-columns: 44px minmax(0, 1fr); }
.sc-stats[data-sc-count="10"] .sc-thumb { width: 44px; height: 44px; }
.sc-stats[data-sc-count="10"] .sc-row-rank { font-size: 22px; }

/* ---------- compact list: every item as a chart row, in columns ---------- */
.sc-list-all { grid-template-rows: none; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); column-gap: 16px; }

/* ---------- cards ---------- */
.sc-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin: 0; padding: 0; list-style: none; }
.sc-stats[data-sc-count="5"] .sc-cards { grid-template-columns: repeat(5, minmax(0, 1fr)); }
@container (max-width: 640px) { .sc-stats[data-sc-count="5"] .sc-cards { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); } }
.sc-cards > li { display: flex; min-width: 0; }
.sc-card { position: relative; display: flex; flex: 1; flex-direction: column; gap: 10px; min-width: 0; padding: 12px; border: 0; border-radius: var(--radius); background: color-mix(in oklab, var(--elevated) 55%, transparent); color: inherit; font: inherit; text-align: left; cursor: pointer; transition: background-color 180ms var(--ease); animation: sc-rise 460ms var(--ease) both; animation-delay: calc(var(--i, 0) * 40ms); }
.sc-card:hover { background: var(--elevated); }
.sc-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.sc-card-media { display: block; aspect-ratio: 1; overflow: hidden; border-radius: calc(var(--radius) * .75); background: var(--elevated); box-shadow: 0 10px 24px -12px rgb(0 0 0 / .7); }
.sc-card-media img, .sc-card-media .sc-ph { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform 500ms var(--ease); }
.sc-card:hover .sc-card-media img { transform: scale(1.04); }
.sc-round .sc-card-media { border-radius: 50%; }
.sc-card-rank { position: absolute; top: 4px; left: 8px; color: var(--text); font: 800 34px/1 var(--mono); letter-spacing: -0.06em; text-shadow: 0 2px 14px rgb(0 0 0 / .65); pointer-events: none; }
.sc-card .sc-row-text { gap: 0; }

/* ---------- loading / messages ---------- */
.sc-ph { background: linear-gradient(100deg, var(--elevated) 30%, color-mix(in oklab, var(--elevated), var(--text) 7%) 50%, var(--elevated) 70%) 0 0 / 300% 100%; animation: sc-shimmer 1.4s linear infinite; }
.sc-hero-ph { height: var(--hero-h); border-radius: calc(var(--radius) * 1.5); }
.sc-row-ph { cursor: default; animation: none; }
.sc-line { display: block; width: 70%; height: 12px; border-radius: 6px; }
.sc-line.short { width: 40%; height: 10px; margin-top: 8px; }
.sc-row-ph > .sc-line.short { width: 100%; height: 20px; margin: 0; }
.sc-message { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px; padding: 22px 20px; border-radius: calc(var(--radius) * 1.5); background: color-mix(in oklab, var(--elevated) 60%, transparent); color: var(--subdued); font-size: 14px; }
.sc-message strong { color: var(--text); font-weight: 600; }
.sc-ghost { height: 32px; padding: 0 16px; border: 1px solid color-mix(in oklab, var(--text) 30%, transparent); border-radius: 999px; background: none; color: var(--text); font: 600 13px/1 var(--sc-font-ui, inherit); cursor: pointer; transition: border-color 180ms var(--ease), transform 180ms var(--ease); }
.sc-ghost:hover { border-color: var(--text); transform: scale(1.03); }
.sc-ghost:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

@keyframes sc-rise { from { opacity: 0; transform: translateY(10px); } }
@keyframes sc-shimmer { to { background-position: -150% 0; } }

@media (prefers-reduced-motion: reduce) {
  .sc-hero, .sc-row, .sc-card, .sc-ph { animation: none; }
  .sc-seg button, .sc-row, .sc-card, .sc-hero, .sc-hero-media img, .sc-card-media img { transition: none; }
  .sc-hero:hover .sc-hero-media img, .sc-card:hover .sc-card-media img { transform: none; }
}
`
