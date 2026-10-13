// Styles of the animated lyrics view (inside its Shadow DOM). Typography and line colours arrive as --ly-* variables
// copied from Spotify's own lines (so the theme's font, size, alignment and colours apply); palette variables
// (--sc-*) inherit from the page. Per word, render.ts sets --p (how far it has been sung, 0–1) and --g (emphasis:
// 1 while being sung, a little after); every effect is a function of those two.
export const VIEW_CSS = `
:host { position: absolute; inset: 0; z-index: 1; display: block; contain: strict; }
.view {
  --edge: 0.35;
  position: absolute; inset: 0;
  font-family: var(--ly-font, var(--sc-font-ui)); font-weight: var(--ly-weight, 700);
  color: var(--ly-rest);
}
/* Once per opening: render.ts drops the class when it ends, so a re-attached view (Spotify rebuilds its lyrics view
   on some song changes) doesn't rise in again. */
.view.entering { animation: sc-in 420ms cubic-bezier(.2, .8, .2, 1) both; }
@keyframes sc-in { from { opacity: 0; transform: translateY(12px); } }
.view[data-layout='cover-left'] { display: grid; grid-template-columns: minmax(240px, 36%) minmax(0, 1fr); }

.scroller {
  position: relative; height: 100%; overflow-y: auto; scrollbar-width: none; container-type: size;
  mask-image: linear-gradient(to bottom, transparent var(--sc-lyrics-clear-top, 48px), #000 var(--sc-lyrics-fade-top, 120px),
    #000 calc(100% - var(--sc-lyrics-fade-bottom, 11%)), transparent calc(100% - var(--sc-lyrics-clear-bottom, 0px)));
}
.scroller::-webkit-scrollbar { display: none; }
.lines { padding: 36cqh 56px 56cqh; zoom: var(--ly-zoom, 1); transition: opacity 320ms ease; }
.lines.leaving { opacity: 0; transition-duration: 160ms; }

.line {
  font-size: var(--ly-size, 48px); line-height: 1.2; text-align: var(--ly-align, start);
  margin: 0 0 0.5em; cursor: pointer; overflow-wrap: anywhere;
  transform-origin: var(--ly-origin, left) center;
  transition: color 320ms ease, opacity 320ms ease, filter 520ms ease, transform 520ms cubic-bezier(.2, .8, .2, 1);
}
.line.past { color: var(--ly-past); }
.line:not(.active):hover { opacity: 0.75; }
.line.active { color: var(--ly-sung); }

.w { display: inline-block; white-space: pre; }
/* The sung part of each word fills in from the left with a soft edge. */
.words .line.active .w {
  color: transparent; -webkit-background-clip: text; background-clip: text;
  background-image: linear-gradient(90deg, var(--ly-fill-from) 0, var(--ly-sung) calc(var(--p, 0) * 130% - 30%), var(--ly-rest) calc(var(--p, 0) * 130%));
}
.view { --ly-fill-from: var(--ly-sung); --ly-glow: rgb(from var(--ly-sung) r g b / 0.6); }
.gradient { --ly-fill-from: var(--sc-accent); }
.gradient:not(.words) .line.active {
  color: transparent; -webkit-background-clip: text; background-clip: text;
  background-image: linear-gradient(90deg, var(--sc-accent), var(--ly-sung));
}

/* Per word only in word mode: a transformed word under the line's gradient (background-clip: text) is painted at the
   line's start, so with word by word off the line lifts as a whole. */
.lift.words .line:not(.past) .w { transform: translateY(calc((1 - var(--p, 0)) * 0.06em)) scale(calc(1 + var(--g, 0) * 0.035)); transition: transform 240ms ease-out; }
.lift:not(.words) .line.active { transform: scale(1.03); }
.glow .line.active .w {
  /* No filter transition: Chromium interpolates drop-shadow colours wrongly (flashes near-black); --g is eased per frame instead. */
  filter: drop-shadow(0 0 calc(var(--g, 0) * 0.3em) var(--ly-glow));
}
.glow:not(.words) .line.active { filter: drop-shadow(0 0 0.25em var(--ly-glow)); }
.blur .line:not(.active) { filter: blur(calc(min(var(--d, 0), 5) * 0.6px)); }

.line.break { display: flex; gap: 0.22em; height: 0; margin: 0; opacity: 0; overflow: hidden; transition: height 420ms ease, margin 420ms ease, opacity 420ms ease; justify-content: var(--ly-justify, flex-start); }
.line.break.active { height: 0.9em; margin-bottom: 0.5em; opacity: 1; }
.dot {
  width: 0.26em; height: 0.26em; margin-top: 0.3em; border-radius: 50%; background: var(--ly-sung);
  opacity: calc(0.25 + var(--p, 0) * 0.75); transform: scale(calc(0.75 + var(--p, 0) * 0.35));
}

.credit { font: 500 12px var(--sc-font-ui); color: var(--ly-rest); margin-top: 2.5em; }

.panel { align-self: center; display: flex; flex-direction: column; gap: 16px; padding: 0 24px 0 56px; min-width: 0; font-family: var(--sc-font-ui); }
.cover { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: var(--sc-radius, 8px); box-shadow: 0 24px 64px rgb(0 0 0 / 0.45); }
.title { font-size: 22px; font-weight: 700; color: var(--ly-sung); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.artist { font-size: 15px; font-weight: 500; color: var(--ly-rest); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: -10px; }
.progress { cursor: pointer; padding: 6px 0; }
.track { height: 4px; border-radius: 2px; background: color-mix(in srgb, var(--ly-rest) 35%, transparent); overflow: hidden; }
.fill { height: 100%; background: var(--ly-sung); transform-origin: left; transform: scaleX(var(--t, 0)); }
.times { display: flex; justify-content: space-between; font-size: 12px; font-variant-numeric: tabular-nums; color: var(--ly-rest); margin-top: 6px; }

@media (prefers-reduced-motion: reduce) {
  .view.entering { animation: none; }
  .lift.words .line:not(.past) .w, .lift:not(.words) .line.active { transform: none; }
}
`
