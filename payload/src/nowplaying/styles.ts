// Column styles. Lives in the column's shadow root and only sees inherited custom properties: the palette (--sc-*)
// and Spotify's --background-base, which the cover-blur lyrics background turns translucent on the host (parts/lyrics.ts),
// so the column matches the library next to it.

export const COLUMN_CSS = /* css */ `
:host { display: flex; min-width: 0; min-height: 0; }
.npv {
  --bg: var(--background-base, var(--sc-background, #121212));
  --text: var(--sc-text, #fff);
  --sub: var(--sc-text-subdued, #b3b3b3);
  --accent: var(--sc-accent, #1ed760);
  --hover: color-mix(in oklab, var(--text) 8%, transparent);
  --ease: cubic-bezier(.2, .8, .2, 1);
  box-sizing: border-box;
  display: flex; flex-direction: column;
  flex: 1; min-width: 0; min-height: 0; overflow: hidden auto; overscroll-behavior: contain; scrollbar-width: none;
  border-radius: var(--sc-lyrics-npv-radius, 8px);
  background: var(--bg);
  color: var(--text);
  font: 400 14px/1.4 var(--sc-font-ui, "SC Inter", system-ui, sans-serif);
  -webkit-font-smoothing: antialiased;
}
.npv *, .npv *::before, .npv *::after { box-sizing: border-box; }
.eyebrow { margin: 0; color: var(--sub); font-size: 10.5px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.link { display: inline; padding: 0; border: 0; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.link:hover { text-decoration: underline; text-underline-offset: 3px; }
.link:focus-visible, .ghost:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }

/* ---------- hero: full-bleed cover under a dark scrim (album on top, title at the bottom, both in white like
   Spotify's song detail). The scrim is darkest behind the title; below it, scrim and image fade out together so the
   cover melts into the panel, whatever its colour. */
.hero { position: relative; flex: none; aspect-ratio: 5 / 6; max-height: 72%; overflow: hidden; isolation: isolate; }
.hero-img { -webkit-mask-image: linear-gradient(to bottom, #000 86%, transparent); mask-image: linear-gradient(to bottom, #000 86%, transparent); }
.hero-img { position: absolute; inset: 0; z-index: -2; display: block; width: 100%; height: 100%; object-fit: cover; animation: npv-cover 700ms var(--ease) both; }
.hero-img.empty { display: grid; place-items: center; color: var(--sub); background: color-mix(in oklab, var(--text) 6%, var(--bg)); }
.hero-shade {
  position: absolute; inset: 0; z-index: -1; pointer-events: none;
  background:
    linear-gradient(to bottom, rgb(0 0 0 / .6) 0, rgb(0 0 0 / .22) 15%, transparent 30%),
    linear-gradient(to top, transparent 0, rgb(0 0 0 / .74) 9%, rgb(0 0 0 / .62) 22%, rgb(0 0 0 / .3) 40%, transparent 62%);
}
.hero-top { position: absolute; top: 0; left: 0; right: 0; padding: 18px 16px; }
.context { max-width: 100%; overflow: hidden; color: #fff; font-size: 14px; font-weight: 700; white-space: nowrap; text-overflow: ellipsis; text-shadow: 0 1px 8px rgb(0 0 0 / .5); }
.hero-info { position: absolute; left: 0; right: 0; bottom: 0; display: grid; gap: 2px; padding: 0 16px 18px; color: #fff; text-shadow: 0 1px 12px rgb(0 0 0 / .45); animation: npv-in 480ms 80ms var(--ease) both; }
.title { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.025em; line-height: 1.15; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.artists { overflow: hidden; color: rgb(255 255 255 / .78); font-size: 15px; font-weight: 500; white-space: nowrap; text-overflow: ellipsis; }
.artists .link:hover { color: #fff; }

/* ---------- up next ---------- */
.next { display: grid; gap: 8px; margin: 4px 12px 12px; padding: 14px 4px 6px; border-radius: 8px; background: color-mix(in oklab, var(--text) 5%, transparent); }
.next-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 4px 0 12px; }
.ghost { height: 28px; padding: 0 10px; border: 0; border-radius: 999px; background: none; color: var(--sub); font: 600 12px/1 var(--sc-font-ui, inherit); cursor: pointer; transition: color 160ms var(--ease), background-color 160ms var(--ease); }
.ghost:hover { color: var(--text); background: var(--hover); }
.rows { display: grid; gap: 2px; margin: 0; padding: 0; list-style: none; }
.row { display: grid; grid-template-columns: 40px minmax(0, 1fr); align-items: center; column-gap: 12px; padding: 6px 8px; border-radius: 6px; animation: npv-in 360ms var(--ease) both; animation-delay: calc(var(--i, 0) * 40ms); }
.row:hover { background: var(--hover); }
.thumb { width: 40px; height: 40px; border-radius: 4px; object-fit: cover; background: color-mix(in oklab, var(--text) 8%, var(--bg)); }
.row-text { display: grid; min-width: 0; }
.row-name, .row-sub { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.row-name { font-weight: 500; }
.row-sub { color: var(--sub); font-size: 13px; }

@keyframes npv-in { from { opacity: 0; transform: translateY(6px); } }
@keyframes npv-cover { from { opacity: 0; transform: scale(1.04); } }
@media (prefers-reduced-motion: reduce) {
  .hero-img, .hero-info, .row { animation: none; }
}
`
