# Tasks

Spec: `docs/superpowers/specs/2026-10-02-spotify-custom-design.md` · Rules: `CONVENTIONS.md` · Look & feel: `docs/creative-direction.md`
Contracts: `payload/src/types.ts` + stub signatures in each module's `index.ts`

## Phase 0: Scaffold (coordinator) ✅
- [x] Spec + creative direction + conventions
- [x] Payload scaffold: Vite 8 IIFE build, TS 6 (pinned for typescript-eslint), ESLint strict type-checked, vitest + happy-dom
- [x] Contracts (`types.ts`), module stubs, `main.ts` wiring, `scripts/cdp.mjs` dev tool
- [x] Makefile (dev / typecheck / lint / test / check / e2e / release)

## Phase 1: Parallel workstreams
| # | Workstream | Owns | Status |
|---|---|---|---|
| A | Go helper | `helper/**` | ✅ done (lint/vet mac+win, -race tests, release artefacts) — real restart + Windows runtime unverified |
| B | Theme core | `payload/src/core/**`, `payload/src/theme/**` | ✅ done (189 tests; bold mood presets, header wash recolour, hover accent) |
| C | Parts, layout, Home, icons | `payload/src/parts/**`, `payload/src/home/**`, `payload/src/icons/**` | ✅ done (58 tests; spikes 13.2–13.4 pass; mute icon + pageSpecific) — verify real mute in integration |
| D | Theme builder UI | `payload/src/builder/**` | 🔄 running |
| E | Extensions, Spotify internals, Stats | `payload/src/ext/**`, `payload/src/spotify/**`, `docs/extensions.md` | ✅ done (40 tests; 3 time ranges; hero + contrast polished) |

## Phase 2: Integration (coordinator)
- [ ] Merge reports and fix contract mismatches
- [ ] `make check` green
- [ ] Helper + payload end-to-end on real Spotify (incl. real restart flow)
- [x] `e2e/run.mjs` written (spec §12.2); [ ] passing + screenshots of every preset
- [ ] `make release` artefacts (spec §12.3)
- [x] `docs/install-guide.md` drafted (text only; OS dialog screenshots not captured)
- [ ] Code review pass and fixes

## Phase 3: User feedback round 1 (live testing)
- [x] D: "Point and style" card → compact row
- [x] D: accent picker polish (okhsv rectangle, suggested accents, no raw numbers; drag bug fixed)
- [x] Coordinator: entry icon redesigned (Lucide palette at Spotify's 16px/1.5px; tilt + staggered colour pop on hover/open, active dot, theme-change ping, album ring, reduced motion)
- [x] A: BUG payload lost after Page.reload → 3 root causes (Page.enable, Runtime.enable, recolor at doc-start); headless-Chrome reload regression test; e2e 8/8
- [x] Coordinator: e2e reuses a running helper (no longer strips the theme from the live session)
- [x] B+D: hover preview lag + flicker (preview 8–13 ms; no revert between cards)
- [x] C+D: lyrics page (keep library, immersive incl. header row, 4 backgrounds, edge fade, line colours, card)
- [x] D: draggable floating editor (snap/dock, remembered position)
- [x] C+D: Now playing panel (8 section kinds, order/hide, compact cover verified)
- [x] Coordinator: stats shelf only on unfiltered Home (CSS on "All" chip; selector bug caught by test; e2e check added)
- [x] C: Home regression (built mid-edit; observer moved to app root) · [ ] B: stray `sc-no-morph` class
- [x] E+B+D: library folder artwork (list, collapsed, grid; picture/icon/colour)
- [x] Coordinator: rename folder → artwork contracts (whole-word, 21 files; 466 tests green)
- [x] E+B+D: Liked Songs artwork (keyed by Spotify's fixed cover asset; Library artwork tab; picture upload verified end to end) · [ ] live pick-mode check on Liked Songs card
- [x] C: animated progress bar styles (glow / flow / wave; !important-vs-keyframes bug found + test)
- [x] C + coordinator: lyrics auto colours single source of truth (parts/lyric-colors.ts; builder binds mixHex)
- [x] D+B: popover Save / Cancel (snapshot restore, Esc) + small icon Reset; header save indicator · [x] B: `retrySave()` (required in contract; coordinator removed dead guards + updated test)
- [x] Coordinator: `startLibrary` wired (onSliceChange helper)  · [x] `watchPanelSections` / `startPartsRuntime` wired
- [ ] Coordinator: enable `noUncheckedIndexedAccess` (48 sites) after agents finish

- [x] Coordinator: dev helper now runs detached (session background limit had stopped it); stop with `pkill -INT -f sc-helper`

- [x] Coordinator: CONVENTIONS rule: no `clip.scale ≠ 1` screenshots / device-metrics overrides (they stuck Spotify's viewport at 1190×80)

## Phase 4: Creative round 2 (user: "keep pushing creativity and boundaries, keep everything polished")
- [ ] First-run welcome tour (3 steps; entry button pulse) for non-technical users
- [ ] Stats share card ("Wrapped"-style image → clipboard / file)
- [ ] Theme share card (mini-Spotify preview + code as an image)
- [ ] Lyrics focus effects (blur/soften non-active lines, glow active line)
- [ ] Day/night theme schedule (switch at sunset)
- [ ] Living background (slow-drifting cover-colour mesh, opt-in; upgrade of Ambient Glow)

## Phase 5: Polish & review gate
- [x] Visual QA agent (Sonnet 5.5, read-only): 0 high, 7 medium, 9 low defects + gaps list → left as open items (user asked to stop new work)
- [ ] Code review pass (not done: stopped at user's request)
- [x] `make check` green (511 TS tests, Go race tests, lint/vet/staticcheck mac+win) · [x] `make release` (universal .app, PE32+ GUI exe, codesign ok) · [~] e2e 7/9: last 2 failed because the Spotify window was hidden (rAF paused) — e2e now refuses to run hidden; rerun with Spotify in front

## Phase 6: User bug reports after wrap-up (lyrics view)
- [~] C: Queue in lyrics view with keep-library — fixed (our grid pin covered Spotify's own right-panel column); not verified live (window hidden)
- [~] C: 3-column lyrics layout via Spotify's own buttons — done for Queue/Friends; NPV-beside-lyrics unknown (lyrics view IS the expanded NPV); not verified live
- [~] C: auto-hide = Spotify's native idle mode (confirmed from its CSS) → overridden when immersive off; scoping out of Spotify Original; fullscreen-button interaction unknown; not verified live
- [x] Coordinator spike (live): Spotify UNMOUNTS the Now playing panel while lyrics are open → can't be CSS-toggled
- [ ] C+E+B+D: our own "lite" Now playing column beside lyrics (`layout.lyricsNowPlaying`): cover, title/artists, Up next (E `onUpNext`), yields to Spotify's Queue/Friends
- [ ] D: pick mode swallows pointer (elementsFromPoint) so Spotify's native tooltips/hover don't fire while picking

## Phase 7: User tweaks round 2 (2026-10-05)
Decisions (asked): redesign both studio + edit dialog in one look · stats = look + layout · 4 = style Home button, 5 = per-button icon swap · lyrics NPV = cover/canvas, title, artists, up next.
- [x] 6. Library resizable/clickable in lyrics view (cause: Spotify sets `inert` on #Desktop_LeftSidebar_Id; verified live that removing it makes the resizer work). Done = unit test: inert removed only when keepLibrary + lyrics open, restored when turned off; live: drag changes width.
- [x] 7. Own "Now playing" column (user round: Spotify-style full-bleed cover + scrim + overlaid titles; flush to window edge; Canvas video impossible — H.264 unsupported in CEF <video>, Spotify plays it via internal dwp-video-player) beside lyrics (`layout.lyricsNowPlaying`), toggle in Lyrics tab. Data = Spotify's playerAPI (React fiber prop, `getState()`, events `update`/`queue_update`). Done = tests for state mapping + CSS; live: column visible with lyrics open, yields to Queue/Friends.
- [x] 3. Home shortcut cards (recents grid) as a part: background, text, radius + size + columns. Done = compile tests; live: cards recolour/resize.
- [x] 2. Stats shelf: part (surface/text/accent/radius via --sc-stats-* vars) + layout (style hero/grid/list, 5/10 items, rank numerals, glow). Done = tests; live render.
- [x] 4. Home button part (background, icon colour, radius, size). Done = compile test; pickable live.
- [x] 5. Per-button icon swap (home, search, browse, friends, notifications; gallery or own SVG), beats the pack. Done = compile tests; live.
- [x] 1. Redesign theme studio + part edit dialog (one new look). Done = visual check via screenshots; tests green.
- [x] 8. (user, mid-run) Remove the black border around the lyrics window (it was Spotify's 8px #000 outline on the lyrics view; verified live)
- [x] Fix pre-existing typecheck errors (layout/lyrics test fixtures missing lyricsNowPlaying)
- [x] `make check` green, `make payload` (embed matches), injected live; live checks done for 1–8 except the open items below
- [ ] Open: stats shelf showed "unavailable" late in the session (suspect expired captured token while the window was hidden; not diagnosed)
- [ ] Open: not live-tested — library on the right + lyrics column, immersive + column, pick mode on shortcut cards / stats shelf, Console look on a light preset

## Phase 8: User tweaks round 3 (2026-10-05)
Decisions: item 6 = section cards look + song header (asked).
- [x] 2. Edit dialog overflows the window when content grows (Solid picker) → re-place on resize (ResizeObserver), keep inside viewport. Done = test: placement re-runs when height grows; live: player bar → Solid fully visible.
- [x] 5. Pick mode lag → profiled: hit test ≈0.5 ms/frame (not the cause); paint: 100vmax box-shadow spotlight animating left/top/width/height + backdrop-filter under it + hover state re-set every frame. Fix: transform-based spot/chip, no backdrop blur on near-opaque panels, skip identical hover updates.
- [x] 4. Search bar icons pickable → Search box editor gets Search + Browse icon choosers; Top bar editor gets What's New + Friend Activity.
- [x] 3. Edit dialog: bolder redesign (live preview header painted with the part's own colours, leader line to the picked element, Colour/Shape/More tabs); drawer header pushed further.
- [x] 6. Native Now playing panel: section cards part (bg/text/radius + spacing) and song header (cover height, gradient strength, title size, hide Switch-to-video, hide Liked tick).
- [x] 1. Smooth lyrics open/close: named view-transition for our column (slide in/out), eased longer morph for Spotify's cinema transition, lyric lines cascade in.
- [x] make check + payload + live check
- [ ] Open: not seen moving (window hidden all round): lyrics open/close motion, pick-mode smoothness, Spotify's own aspect-ratio animation; Now playing cards look not checked live (section keys not assigned while hidden)

## Phase 9: User tweaks round 4 (2026-10-05)
Decisions: page customisation = header backdrop, cover & title, track list (asked).
- [x] Lyrics → main transition: cause = our layout rules dropped out in Spotify's `preexit` state, which is when its close View Transition snapshots the "before" picture (recorded live: preexit ~100 ms → duringexit → postexit). LYRICS_VIEW_OPEN now includes both preexit attributes; tests for every state.
- [x] Pages tab (theme.pageStyle): backdrop (cover colour / accent / theme / blurred cover / none), header height, centred hero, cover size/corners/shadow (glow in the page's cover colour), title size, rows (striped by aria-rowindex / cards), playing-row highlight (row class discovered at runtime), fewer columns. Verified live in preview on an album (geometry + computed styles).
- [ ] Not done: compact rows (Spotify's virtual list relies on --row-height 56px; changing it would break scrolling on long playlists)
- [ ] Not seen moving: the close transition itself (window hidden); screenshot of the centred header was a stale paint while hidden

## Phase 11: More page customisation (2026-10-05)
Decisions (asked): header = backdrop strength + custom colour, title typography · action row = play size + shape · track list = thumbnails, index style, hide column header · also artist pages.
Done = page-look + model tests for each new field (fail first), `make check` green, live: computed styles on album, playlist and artist pages.
- [x] Fix: playlists use `playlist-tracklist`, not `track-list` → existing row styles never applied there (found live; now striped live)
- [x] Fix: album header rules leaked onto artist pages (same `entity-header`) → scoped out (verified live: tall/centred no longer hit artists)
- [x] Model + validation (custom backdrop without colour → accent)
- [x] page-look CSS + tests (629 tests green)
- [x] Pages tab UI (previews → tabs/pages/previews.tsx, artist section → tabs/pages/ArtistSection.tsx)
- [x] make check, live check via store.preview (computed styles; window hidden + lyrics open → no geometry/screenshots)
- [ ] Not seen: the Pages tab UI itself, any of it painted (window hidden); hover play button with numbers hidden
- [ ] Gap (pre-existing): editorial playlists with a photo banner (header has 1 child + `background-image`) get no backdrop options
- [ ] Unmeasured: style cost of the artist banner `:has(main > [data-testid="artist-page"])` selector
- [x] (user) Centred header wrapped the title: its wrapper shrank to the text in the centred column, so Spotify fitted the font to ~70px (2rem) and wrapped it. Wrapper stretched + h1 centred (Spotify's h1 rule is text-align: start). Test + live: DRIP at 6rem, one line, centre within 2px.
- [x] (user) Compact + centred was taller than centred (517 vs 493 px: compact's 24px top padding stacked on centred's 32px). Decision (asked): keep the cover; smaller title + less top space. Now: header padding 0, content padding 8px, gap 12px, title ×0.85 of Title size → 436 px live.
- [x] (user) Choose columns: Spotify already has a column chooser (right-click column titles → checkboxes, remembered by Spotify). Decision (asked): point to it. `fewerColumns` removed from the model; Pages tab has a hint + "Choose columns" button that opens Spotify's menu (opens the playing album first if no list is open). Verified live: menu opens even with Hide column titles on.
- [x] (user) More track-list styles: Lines, Outlined, Glow (accent bar + wash on hover) as row tiles with previews. Rows stay 56 px (virtual list). Verified live with screenshots; Glow checked via :focus-within (synthetic hover doesn't register while Spotify isn't focused).
- [ ] Not tested: clicking the real "Choose columns" button (Pages tab wasn't open), nor its open-album-then-menu path
- [x] (user) "Highlight the playing song" did nothing: the song played from a radio station, and Spotify only marks the playing row when the song plays from that very list (our rule reused Spotify's mark). Now parts/playing-row.ts marks the row by track URI (read from the row's React props via spotify.trackUriOfRow) → works from any context. Old class discovery removed from runtime.ts. Live: Gravity (from a station) marked on its album. Note: while the window is hidden, playback updates wait for it to be visible (rAF).
- [x] (user) Album banner layout (asked: layout choice; albums + songs). `headerLayout: spotify | centred | banner` replaces `centred` (old themes: centred:true → 'centred', verified on the saved theme). Banner = cover (largest srcset image, 640px) as the header backdrop, small cover hidden, title bottom-left; height follows Header height (300/404/520). Scoped by exclusion (not playlist/artist pages): song-page test id couldn't be confirmed without navigating the user's Spotify.
- [ ] Not seen: the final banner build on a real album (only the earlier hand-written prototype was screenshotted); song pages untested
- [x] (user) Pages tab navigation: sub-tabs General (titles, play button, track lists) · Albums & playlists (header, cover, title size) · Artists (banner, name). Grouping table in builder/tabs/pages/groups.ts (test: every PageStyle key in exactly one tab); per-tab Reset; sub-tab remembered for the session. Files: PagesTab (shell) + pages/GeneralTab, AlbumsTab, ArtistsTab, navigation.ts.
- [ ] Not seen: the sub-tabs on screen (builder was closed; didn't open it over the user's Spotify)
- Note: 2 failing model tests at 22:06 belong to another session's in-progress `layout.searchPosition` (tests written before the model) — not touched.

## Phase 12: Music-reactive (2026-10-05)
Decisions (asked): analysis in the Go helper, frames pushed over the existing CDP connection (~30/s); macOS + Windows; effects = spectrum, beat pulse, breathing background, lyrics; master switch + sync = personal Settings.reactive, looks = theme.effects.reactive; no all-system-audio fallback; **no data gathering** (in-memory only, nothing stored/logged/sent). User skipped the written spec ("go straight for implementation").
Contracts: `payload/src/types.ts` (ReactiveLook, ReactiveSettings, AudioStatus, BridgeOps.audio, ScGlobal.audio) · `helper/internal/audio/capture.go`.
Done = Go tests (sine → right band, kicks → beats, service start/stop) · TS tests (frame decode, delay buffer, model/settings, capture-wanted rule) · `make check` · live on Mac: effects move with music when on; no tap when off.
- [x] H: helper audio service (FFT/bands/beat, frames, lifecycle, status), macOS process tap (cgo), inject broadcast, bridge op, wiring, Info.plist usage string  — live: tap 48 kHz, latency 171 ms, 28 frames/s; evaluate round trip mean 1.2 ms, p95 1.9 ms
- [x] W: Windows WASAPI process loopback (no cgo): builds, vets, lints for windows; pure helpers tested; COM path never run (8-step Windows checklist in final report)
- [ ] P: payload audio module, 4 effects, model/settings/presets, mock helper, Reactive tab, wiring
- [ ] Coordinator: integrate, make check, live check on Mac (needs the user to allow the audio permission)

## Phase 13: Top bar layout + pick fix (2026-10-05)
Decisions (asked): search position Left / Centre / Right + hide toggles (no free reorder) · Home moves with search.
- [x] `layout.searchPosition` (old themes → centre) + hide options `backForward`, `topBarHome`; Layout tab "Top bar" section (What's New / Friends toggles moved there). Tests fail-first, 648 green. Live: compiled CSS applied as a temp style → Home+search at 160 px (left) / ends 8 px before right group (right); hidden Home lets search widen.
- [x] Pick mode on the top bar: cause = Spotify's `.body-drag-top` window-drag strip (app-region: drag, top 60 px) → OS eats mouse events over empty bar areas. Pick mode now sets every element no-drag while on (builder/lib/window-drag.ts). Live: computed app-region drag → no-drag → drag.
- [ ] Not verified: real mouse hover/click in pick mode over the empty top bar (needs a human mouse); narrow windows with search on a side; Windows title bar while picking
- [ ] Not injected: build not injected live (Phase 12 work in progress in types.ts/model.ts; `tsc` errors there are from that work, not this)
- [x] (user) Pages sub-tabs look: "Albums & playlists" wrapped the strip to two lines. Now General · Albums · Artists, a scope line under the tabs with the per-tab Reset at its end, KeyTabs labels never wrap (ellipsis). Screenshot: one-line 30px tabs.
- Note: typecheck currently fails on another session's in-progress `reactive` / `audio` contract fields (model.ts, main.ts, mock-helper, test-fakes) — not touched.
- [x] (user) Pages scope line was flush with the tabs → inset 26px like the section titles.
- [x] (user) Sticky bar on scroll (topbar fill + its play button): takes the header backdrop's colour (cover colour for Spotify / blurred / banner), 82% + black for contrast with a hairline + soft shadow; play size/shape apply, scaled for the 64px bar (40/48/56). Scoped to album/song/playlist main views via #main-view:has(entity-header not in artist page). Live: Love Tune, accent → purple bar, rounded 40px button.
- [x] (user) Playing-row look: style (bar / wash / fade / outline), colour (Auto = accent), strength 5–40 % (default 16 = old look), colour the title. Fields under the toggle in Pages › General (pages/PlayingRowFields.tsx). Live (computed styles, window hidden): all four styles apply on "Ever2Late!".
- Note: model tests `normalizeSettings` + `progress bar style` failing = other session's in-progress work.
- [x] (user) Cover size: 3-step choice → px slider 96–320 (Spotify 232; old Small/Large → 160/300). Live: preview 280 → cover 280px, back to 232 after.
- [x] (user) Mac window buttons: (1) back/forward hidden → Home slid under the zoom button (x 80; Spotify's 24px gap went with them) → spacer keeps margin-right 24px on Mac outside full screen (Home x 104). (2) Full screen keeps the empty 52px spacer → runtime marks <html data-sc-fullscreen> when the window covers the screen (data-sc-mac on macOS) and the spacer collapses (back button x 96 → 20, simulated). Not tested: a real macOS full-screen switch.
- [x] (user) Full screen still had the gap: on notched Macs a full-screen window stays below the notch (1800×1130 at y 39 on a 1169 screen), same as a zoomed window, so the size check never fired. Now CSS `@media (display-mode: fullscreen)` (Chromium sets it; CDP confirms windowState "fullscreen"). Live in real full screen: back 96 → 20, Home 160 → 84 (28 with back/forward hidden). Size-based JS check removed. Not tested: leaving full screen live (needs the user).
- [x] (user) Song covers: CD style (round, centre punched out by a mask, hole = 25% of the radius). Live: screenshot on an artist's top songs shows the hole.
- [x] (user) Spin the playing song's cover (lists with covers: playlists, artist top songs); the playing-row marker is "paused" while paused (spotify.onPlaying) and the spin holds. Live: artist page, playing row spinning ("running").
- [x] Refactor: song-list rules moved from page-look.ts (340 lines) to parts/track-list-look.ts (page-look 250).
- [ ] (user) Equaliser colour: waiting on a live capture (passive watcher in the page) — Spotify only shows it when the song plays from the open list; not found statically in Spotify's code.
- [x] (user) Two more spectrum shapes: Blocks (LED-meter segments) + Peaks (bars with hanging/falling caps); breathing background colour Cover / Accent / Custom (+ picker). Tests first (6 failing → green); live on real music: all 5 shapes draw, custom #ff3d7f reaches the light (core opacity ≤ 0.58); user's look restored via undo (verified equal).
- [ ] Note: reactive effects follow the saved theme, not store.preview (hover-preview of presets doesn't preview their reactive look)
- [ ] Unrelated, someone else's in-flight edit: compile.test.ts "mono" snapshot fails on font fallback sans-serif → monospace
- [x] (user) Equaliser colour: Spotify's equaliser is an image (/images/equaliser-animated-green.gif playing, /images/equaliser-green.svg paused; found by a passive live capture). Recoloured by hiding its pixels and painting the colour through the same file as a mask (GIF keeps animating; verified frame to frame). Default = playing-row colour (= accent); "Equaliser colour" field in Pages › General. Live: paused SVG in accent.
- [x] (user) Canvas as cover (effects.canvasCover, toggle in Start › effects): src/canvas mirrors the right panel's Canvas <video> via captureStream() into overlays on the player bar cover and the playing album's header (banner when Banner layout). Live: mirroring gets frames; overlay placement tested.
- [ ] Not seen live: Canvas overlays on screen (previews don't reach JS features — store.preview only re-applies CSS; needs the user to turn the toggle on)
- [x] (user) Canvas toggle was hard to find (bottom of Start › Effects, under the gallery) → moved to Pages › Albums › Cover and title as "Canvas video as cover" (still effects.canvasCover).
- [x] (user) Canvas split: effects.canvasAlbum + effects.canvasPlayerBar (old canvasCover → both). Two toggles in Pages › Albums › Cover and title. Live: user's theme migrated to both on; overlays playing in the player bar cover and the album header cover (1080×1920).
- [x] (user) Player bar Canvas switch moved to Layout › Player (next to Compact player); album one stays in Pages › Albums (its description points to Layout › Player).

## Phase 14: Ship (installers, auto-update, GitHub) (2026-10-06)
Decisions (asked): in-app one-click update · unsigned for now (signing hooks later) · real installers (Windows Inno Setup per-user, Mac .dmg) · GitHub Actions on tag.
Done = `internal/update` tests (version compare, manifest, asset pick, sha256, mac bundle swap) fail first → pass · `make check` green · CI green on macOS + native Windows · tag v0.1.0 → release with dmg, setup.exe, mac update zip, latest.json · repo committed + pushed.
- [x] .gitignore (node_modules, dist, e2e/out, generated payload.js, .tools)
- [x] helper/internal/update: manifest + compare + download/verify + install (mac bundle swap, windows silent setup) + periodic checker
- [x] tray: "Update to X…" item + status; bridge: update status in getState, `checkUpdate` / `installUpdate` ops, push status to page
- [x] payload: UpdateStatus contract + builder banner
- [x] packaging: Inno Setup script, DMG step, latest.json generator
- [x] CI: ci.yml (push: check mac + windows go test) · release.yml (tag: build, publish)
- [x] docs: install guide (dmg/setup, updates), RELEASING.md, README
- [ ] commit, push, tag v0.1.0, watch CI
