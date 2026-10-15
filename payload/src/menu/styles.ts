// Menu panel styles, shared by the live menu, the playlist picker and the studio preview (each renders inside its own
// shadow root). Only the theme's --sc-* palette: an opaque elevated plate, a hairline border, the active row as a
// raised key; no glows, no scaling, a short plain ease-out on open.

export const PANEL_CSS = /* css */ `
:host { all: initial; }
.layer { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; }
.panel {
  --radius: var(--sc-radius, 8px);
  --row-radius: max(calc(var(--radius) - 4px), 3px);
  --hover: color-mix(in oklab, var(--sc-text, #fff) 9%, transparent);
  --ease: cubic-bezier(.2, .8, .2, 1);
  position: fixed; top: 0; left: 0;
  box-sizing: border-box; display: flex; flex-direction: column;
  min-width: 260px; max-width: 380px; max-height: calc(100vh - 16px);
  padding: 4px;
  border: 1px solid var(--sc-border, rgb(255 255 255 / .1));
  border-radius: var(--radius);
  background: var(--sc-elevated, #282828);
  color: var(--sc-text, #fff);
  box-shadow: inset 0 1px 0 color-mix(in oklab, var(--sc-text, #fff) 7%, transparent), 0 10px 28px rgb(0 0 0 / .32);
  font: 400 13px/1.3 var(--sc-font-ui, "SC Inter", system-ui, sans-serif);
  -webkit-font-smoothing: antialiased;
  pointer-events: auto; user-select: none;
  animation: sc-menu-in 120ms var(--ease) both;
}
.panel[data-up] { animation-name: sc-menu-in-up; }
.panel[data-sub] { animation-name: sc-menu-in-side; }
.panel.static { position: relative; animation: none; max-height: none; }
.panel *, .panel *::before, .panel *::after { box-sizing: border-box; }
@keyframes sc-menu-in { from { opacity: 0; transform: translateY(-4px); } }
@keyframes sc-menu-in-up { from { opacity: 0; transform: translateY(4px); } }
@keyframes sc-menu-in-side { from { opacity: 0; transform: translateX(-4px); } }
@media (prefers-reduced-motion: reduce) { .panel { animation: none; } }

.rows { min-height: 0; margin: 0; padding: 0; list-style: none; overflow: hidden auto; overscroll-behavior: contain; scrollbar-width: thin; }
.row {
  display: flex; align-items: center; gap: 10px; width: 100%; min-height: 32px; padding: 0 10px;
  border: 0; border-radius: var(--row-radius); background: none; color: inherit; font: inherit; text-align: left;
  cursor: default;
}
.row[data-active], .row[data-open] { background: var(--hover); box-shadow: inset 0 1px 0 color-mix(in oklab, var(--sc-text, #fff) 6%, transparent); }
.panel[data-kbd] .row[data-active] { box-shadow: inset 0 0 0 2px var(--sc-accent, #1ed760); }
.row[aria-disabled="true"] { opacity: .45; }
.label { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.icon { display: grid; place-items: center; flex: none; width: 16px; height: 16px; color: var(--sc-text-subdued, #b3b3b3); }
.row[data-active] .icon, .row[data-open] .icon { color: var(--sc-text, #fff); }
.icon svg { display: block; width: 16px; height: 16px; fill: currentColor; }
.line { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
.cover { flex: none; width: 24px; height: 24px; margin: 0 -2px 0 -4px; border-radius: 3px; object-fit: cover; background: var(--hover); }
.cover.empty { display: grid; place-items: center; color: var(--sc-text-subdued, #b3b3b3); }
.cover.empty svg { width: 14px; height: 14px; }
.end { flex: none; display: grid; place-items: center; width: 16px; height: 16px; margin-right: -4px; color: var(--sc-text-subdued, #b3b3b3); }
.end svg { width: 14px; height: 14px; }
.check { color: var(--sc-accent, #1ed760); }

.sep { height: 1px; margin: 4px 8px; background: var(--sc-border, rgb(255 255 255 / .1)); }
.group { padding: 10px 10px 4px; color: var(--sc-text-subdued, #b3b3b3); font-size: 12px; font-weight: 600; }
.rows > li:first-child > .group { padding-top: 6px; }
.status { padding: 8px 10px; color: var(--sc-text-subdued, #b3b3b3); }

.search { position: relative; flex: none; margin: 2px 2px 6px; }
.search svg { position: absolute; left: 9px; top: 50%; width: 14px; height: 14px; margin-top: -7px; color: var(--sc-text-subdued, #b3b3b3); pointer-events: none; }
.search input {
  width: 100%; height: 30px; padding: 0 10px 0 30px;
  border: 1px solid var(--sc-border, rgb(255 255 255 / .1)); border-radius: var(--row-radius);
  background: var(--sc-background, #121212); color: var(--sc-text, #fff); font: inherit; outline: none;
}
.search input::placeholder { color: var(--sc-text-subdued, #b3b3b3); }
.search input:focus-visible { box-shadow: 0 0 0 2px var(--sc-accent, #1ed760); border-color: transparent; }
`

export const TOAST_CSS = /* css */ `
:host { all: initial; }
.toast {
  position: fixed; left: 50%; bottom: 104px; z-index: 2147483000;
  display: flex; align-items: center; gap: 8px; max-width: min(420px, calc(100vw - 32px)); padding: 9px 14px 9px 10px;
  border: 1px solid var(--sc-border, rgb(255 255 255 / .1)); border-radius: var(--sc-radius, 8px);
  background: var(--sc-elevated, #282828); color: var(--sc-text, #fff);
  box-shadow: inset 0 1px 0 color-mix(in oklab, var(--sc-text, #fff) 7%, transparent), 0 8px 24px rgb(0 0 0 / .3);
  font: 500 13px/1.3 var(--sc-font-ui, "SC Inter", system-ui, sans-serif); -webkit-font-smoothing: antialiased;
  transform: translateX(-50%); animation: sc-toast-in 160ms cubic-bezier(.2, .8, .2, 1) both;
  transition: opacity 160ms ease-out;
}
.toast[data-leaving] { opacity: 0; }
.toast svg { flex: none; width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.toast .ok { color: var(--sc-accent, #1ed760); }
.toast .bad { color: var(--sc-text-subdued, #b3b3b3); }
.toast span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
@keyframes sc-toast-in { from { opacity: 0; transform: translate(-50%, 6px); } }
@media (prefers-reduced-motion: reduce) { .toast { animation: none; transition: none; } }
`
