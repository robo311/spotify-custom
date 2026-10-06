# Spotify Custom — Design Spec

Date: 2026-10-02 · Status: draft for review

## 1. Goal

A Spicetify-like customiser for the **Spotify desktop app** that non-technical people can use. It injects our own
theme, layout tweaks, icons and extensions into the installed Spotify. A visual theme builder means nobody has to write CSS. CSS and JS are
still available as an escape hatch for technical users.

**Audience:** the author plus a small circle of friends/family on **macOS and Windows**. Handed out as a zip/exe, not a
public release.

**Not:** Spicetify, a separate Spotify client built on the Web API, or an Electron wrapper around the web player.

## 2. Key decisions

| Decision | Choice | Why |
|---|---|---|
| Injection method | **Runtime injection via Chrome DevTools Protocol (CDP).** Spotify is launched with `--remote-debugging-port` and our code is injected into the live page. | Spotify's files are never modified, so it survives Spotify updates, can't break the install, and gives instant live reload. Verified working on 1.3.3 (§3). |
| Installable part | **Go helper**: a single binary with the payload embedded | ~10 MB, no runtime, the Windows `.exe` cross-compiles from macOS |
| In-Spotify part | **TypeScript payload** (Vite, Preact, rendered in a Shadow DOM) | Runs inside Spotify's page. Shadow DOM isolates our UI styles from Spotify's in both directions. Preact (~3 KB) avoids clashing with Spotify's own React. |
| Customisation UX | **Visual theme builder** in a side drawer inside Spotify, with Spotify itself as the live preview | Non-technical users never touch files or CSS |
| Themes | 10 read-only presets; editing one creates the user's own copy | Presets can be improved later without overwriting anyone's edits, and "Reset to preset" always works |
| Settings storage | Files in the user's app-data folder, written by the helper | They survive Spotify logout or reinstall and can be backed up or shared |

## 3. Verified facts (probed 2026-10-02 on the author's Mac)

- Spotify **1.3.3.264** is CEF/Chromium 151. Its UI is a web app at `https://xpui.app.spotify.com/index.html`, packaged in
  `Spotify.app/Contents/Resources/Apps/xpui.spa`.
- Launching with `--remote-debugging-port=9222` works: `/json/version` answers, and the main UI is a `type: "page"` target.
- Colours are CSS custom properties (~394 in total), e.g. `--background-base #121212`, `--background-highlight`,
  `--background-elevated-base`, `--background-tinted-*`, `--text-base`, `--text-subdued`, `--text-bright-accent #1ed760`,
  `--essential-*`, `--decorative-*`. They're set on `html.encore-dark-theme`.
- Class names are hashed (they change per build), so **we never target them**. The stable hooks are `data-testid`, e.g. `global-nav-bar`,
  `now-playing-bar`, `now-playing-widget`, `player-controls`, `control-button-*`, `playback-progressbar`, `volume-bar`,
  `whats-new-feed-button`, `friend-activity-button`, `pip-toggle-button`, `home-page`, `component-shelf`, `see-all-link`,
  `card-image`, `play-button`, `search-input`, `left-sidebar-footer`, `LayoutResizer__resize-bar`.
- `aria-label`s are localised (the author's UI is Slovak), so they're **never used as selectors**.
- The session's Bearer token can be read from Spotify's own traffic, but calling the public Web API (`/v1/me/top/*`) with it
  returns **429** immediately. So the public Web API is not used.
- Spotify's own profile page fetches top artists/tracks via an internal GraphQL operation **`userTopContent`**, which covers
  "this month".

## 4. User experience

1. **Install:** unzip `SpotifyCustom.app` (Mac) or run `SpotifyCustom.exe` (Windows). First run needs the one-time OS
   override (Mac: System Settings → Privacy & Security → Open Anyway; Windows: SmartScreen → More info → Run anyway).
   `docs/install-guide.md` walks through this with screenshots.
2. **Run:** a tray icon appears and Spotify opens themed (default preset: Darcula).
3. **Customise:** a 🎨 button in Spotify's top bar opens the theme builder drawer, and every change applies live.
4. **Tray menu:** Open Spotify · Restart themed · Open my customisations folder · Start at login ✓ · Quit.

## 5. Architecture

```
┌──────────────── Go helper (tray app) ────────────────┐        ┌────── Spotify (CEF) ───────┐
│ spotify/   locate · launch with debug port · restart  │ CDP/ws │ page xpui.app.spotify.com  │
│ cdp/       browser-level connection, target tracking  │◀──────▶│  payload.js (embedded)     │
│ inject/    addBinding + addScriptToEvaluateOnNewDoc   │        │   ├ theme engine            │
│ store/     settings.json, themes/, icons/, extensions/│        │   ├ builder UI (shadow DOM) │
│ tray/      menu, notifications, start-at-login        │        │   ├ parts / layout / home   │
└───────────────────────────────────────────────────────┘        │   ├ icons                   │
                                                                  │   └ extensions (stats, user)│
                                                                  └────────────────────────────┘
```

### 5.1 Helper (Go)

- **Single instance.** A second launch focuses Spotify and exits.
- **Locate Spotify:**
  - **Mac:** `/Applications/Spotify.app`, `~/Applications/Spotify.app`.
  - **Windows:** `%APPDATA%\Spotify\Spotify.exe`. If only the Microsoft Store package is found, show a dialog explaining it's unsupported and
    linking to spotify.com/download.
- **Debug port:** choose a free localhost port on first run, store it in `<data>/runtime.json`, and reuse it. Before trusting
  an endpoint, check that `/json/version`'s User-Agent contains `Spotify/`.
- **Launch/restart rules:**
  - Spotify not running: launch it with `--remote-debugging-port=<port>`.
  - Spotify running with our port: connect.
  - Spotify running without our port:
    - If the helper was opened by the user, or started at login while Spotify had been running for less than 60 s: restart Spotify themed
      (graceful quit, force after 10 s) and show a notification.
    - Otherwise (Spotify opened later from its own icon): show a notification **asking** "Click to apply your theme".
      Never interrupt playback without asking.
- **CDP:** connect at browser level, `Target.setDiscoverTargets`, auto-attach to the `xpui` page target, and re-attach after
  reloads or Spotify restarts. On each attach:
  1. `Runtime.addBinding({name: "__scHelper"})`
  2. `Page.addScriptToEvaluateOnNewDocument(payload)` (so it runs before Spotify's code on every reload)
  3. `Runtime.evaluate(payload)` for the already-loaded document (the payload is idempotent: a second boot is a no-op)
- **Bridge (page → helper):** `__scHelper(JSON.stringify({id, op, args}))`. The helper replies through
  `Runtime.evaluate("__sc.bridge.reply(id, result)")`. Operations:
  `getState`, `saveSettings`, `saveTheme`, `deleteTheme`, `openFolder`, `restartSpotify`.
- **Start at login:**
  - Mac: a LaunchAgent plist in `~/Library/LaunchAgents/`.
  - Windows: `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`.
- **Dev mode** (`--dev --payload <path>`): read the payload from disk instead of the embedded copy, watch that file, and re-inject on change.
  The payload hot-swaps its stylesheet and UI without a page reload.

### 5.2 Data folder

`~/Library/Application Support/SpotifyCustom/` (Mac) · `%APPDATA%\SpotifyCustom\` (Windows)

```
settings.json          active theme, home shelves, extension on/off + extension data
runtime.json           debug port
themes/<id>/theme.json (+ theme.css)   user themes (builder output and hand-written are the same format)
icons/<pack>/<name>.svg                user icon packs
extensions/<name>.js                   user extensions
```

### 5.3 Payload (TypeScript)

| Module | Responsibility |
|---|---|
| `core/bridge` | RPC to the helper via the binding |
| `core/store` | Loads state, keeps the working theme, undo/redo stack, debounced save |
| `theme/model` | theme.json schema, validation, migration (`schema` field) |
| `theme/compile` | theme → one CSS string (palette → Spotify vars, parts, layout, fonts, radius, icons, custom CSS), applied as a single `<style id="sc-theme">` |
| `theme/palette` | palette from one colour, palette from an image (album art / upload), contrast check and auto-fix |
| `theme/sharecode` | `SC1:` + base64url(deflate(theme JSON)). Theme only, **never JS**. |
| `parts/registry` | Curated parts: id, label, selectors, editable properties, presence check |
| `home/shelves` | Discovers Home shelves, applies hide and order |
| `icons/` | Built-in packs: `spotify` (no change) and `line`, a thin-stroke JetBrains New UI style based on Lucide icons (ISC licence): play, pause, next, prev, shuffle, repeat, home, search, library, queue, lyrics, volume. Applies icons as CSS masks on elements keyed by `data-testid`. |
| `builder/` | Drawer UI (Preact in a shadow root), pick mode, popovers |
| `ext/api` | Extension API (§9), loads user extensions |
| `ext/stats` | Built-in stats extension |
| `spotify/query` | Calls internal GraphQL using Spotify's own session (§10) |

Fonts Inter and JetBrains Mono (both OFL) are bundled as woff2 inside the payload.

## 6. Theme model (`theme.json`, schema 1)

```jsonc
{
  "schema": 1,
  "id": "darcula-mine",
  "name": "Darcula (my version)",
  "basedOn": "darcula",                 // preset id, null for presets themselves
  "palette": {                          // 8 semantic colours, the only required part
    "background": "#1e1f22", "surface": "#2b2d30", "elevated": "#393b40",
    "text": "#dfe1e5", "textSubdued": "#868a91",
    "accent": "#3574f0", "onAccent": "#ffffff", "border": "#43454a"
  },
  "font": "inter",                      // inter | jetbrains-mono | spotify | system
  "radius": 6,                          // px, 0–24, global corner roundness
  "parts": {                            // optional per-part overrides
    "playerBar": { "background": "linear-gradient(#2b2d30,#1e1f22)", "text": "#dfe1e5" },
    "playButton": { "background": "#3574f0", "radius": 4 }
  },
  "layout": {
    "hidden": ["whatsNew", "friendActivity"],
    "compactPlayer": false,
    "librarySide": "left"               // "right" only if verified feasible (§13)
  },
  "icons": "line",                      // spotify | line | <user pack id>
  "css": ""                             // optional custom CSS, applied last
}
```

- **Theme versus personal settings:** a theme describes *how Spotify looks* and is what share codes carry. Home shelf hide/order
  and extension settings are *personal* (shelf IDs are partly user-specific), so they live in `settings.json` and are not
  shared.
- The **palette → Spotify variables mapping** lives in exactly one table in `theme/compile`. When Spotify renames a variable, we fix
  it in one place.

## 7. Presets (v1)

Read-only and shipped inside the payload: **Darcula** (default), **Spotify Original** (palette = Spotify's own default
colours, font `spotify`, icons `spotify`, so it looks the way Spotify ships), **Catppuccin Mocha, Tokyo Night, Gruvbox Dark, Nord, Midnight Blue, Sunset, Forest, Mono**. All dark.
Editing a preset forks it into a user theme named "<Preset> (my version)" and saves it to `themes/`.

## 8. Theme builder

A side drawer (right edge, about 380 px, resizable). Spotify stays visible and live behind it. Undo/redo (⌘Z/Ctrl+Z, ⇧⌘Z/Ctrl+Y),
and "Reset" per section.

| Tab | Contents |
|---|---|
| **Start** | Preset gallery (thumbnails), *My themes* (switch / rename / delete), **Pick one colour** → generated palette, **From album art** (current cover) / **From image** (upload) |
| **Colours** | Accent picker up front. "All colours" expands the 8 palette pickers. Font, roundness slider. |
| **Parts** | List of curated parts, plus a 🖌 **Pick mode** toggle: hovering highlights parts with their label, clicking opens a popover with only that part's properties |
| **Layout** | Mini-map of the window (sidebar · main · right panel · player bar). Click an area to hide it. Toggles: compact player, hide What's New, hide Friend Activity, hide PiP button, library side (if feasible). |
| **Home** | Current Home shelves with drag handles (reorder) and 👁 (hide) |
| **Icons** | Icon pack gallery with previews |
| **Extensions** | On/off per extension (built-in and user) |
| **Share** | *Copy share code*, *Import share code* (shows a preview before applying), *Export/Import file* |
| **Advanced** | Custom CSS editor (live), *Open my customisations folder* |

**Readability guard:** whenever text/background pairs change, compute the WCAG contrast ratio of each pair. Below 4.5:1, show a
⚠ next to the colour, with **Fix it**, which adjusts lightness until it passes. The "one colour" and "image" generators always
produce passing palettes.

**Curated parts (v1, 12):** `sidebar`, `topBar`, `main`, `rightPanel`, `playerBar`, `cards`, `buttons`, `playButton`,
`progressBar`, `volumeBar`, `searchBox`, `shelfHeaders`. Each one defines its selectors (from `data-testid` / `data-encore-id` only) and
its allowed properties, a subset of: `background` (colour or gradient), `text`, `accent`, `radius`. Parts that can be
hidden show a *Hide* toggle in their popover. It writes to `layout.hidden`, which is the single place where hiding is stored, and the
Layout tab's mini-map reads from it too.
**Missing-part handling:** at startup and after navigation, each part runs a presence check. If a selector matches nothing, the builder shows
"⚠ not found in this Spotify version" for that part, and nothing else is affected.

## 9. Extension API (for built-in and user extensions)

```ts
SC.registerExtension({
  id: string, name: string, description?: string,
  start(ctx: {
    addHomeShelf(def: { id: string; title: string; render(el: HTMLElement): void | (() => void) }): void
    onNavigate(fn: (path: string) => void): () => void
    navigate(path: string): void                   // in-app navigation, e.g. "/artist/<id>"
    spotify: { query<T>(operation: string, variables: object): Promise<T> }
    settings: { get<T>(key: string): T | undefined; set(key: string, value: unknown): void }
  }): void | (() => void)                          // returns optional cleanup
})
```

- User extensions are plain `.js` files in `extensions/` and are **off by default**. The Extensions tab shows a warning that
  extensions can do anything in Spotify, so users should only enable ones they trust.
- Each extension runs inside a try/catch boundary. A crashing extension gets disabled with an error in the Extensions tab.
- `docs/extensions.md` documents the API, with the stats extension as the worked example.

## 10. Stats extension (built-in)

- A Home shelf, **"Your listening"**, with *Top artists* / *Top tracks* tabs and covers. Clicking an item navigates in-app.
- Data: internal GraphQL `userTopContent`, called through `ctx.spotify.query`. **v1 range: this month.**
- `spotify/query` uses Spotify's own session. The payload runs before Spotify's code (`addScriptToEvaluateOnNewDocument`)
  and observes the auth/client-token headers on Spotify's own GraphQL requests. It takes the operation's persisted-query hash from
  Spotify's loaded JS. Both still need verifying (§13).
- On any failure, the shelf shows "Stats aren't available in this Spotify version" and nothing else breaks.

## 11. Build, dev, release

```
helper/   Go module          payload/   TS (Vite, Preact, vitest)
themes/   preset sources     docs/      install-guide.md, extensions.md
e2e/      live-Spotify checks (Node, CDP)          Makefile
```

- `make dev`: Vite watch build plus `go run ./helper --dev --payload payload/dist/payload.js`, live re-inject on save.
- `make test`: `vitest run` plus `go test ./...`.
- `make e2e`: the checks in §12 against the real Spotify on the dev Mac.
- `make release`:
  - `dist/SpotifyCustom-mac.zip`: a universal `.app` (arm64 + amd64 via `lipo`), app icon, ad-hoc signed.
  - `dist/SpotifyCustom.exe`: windows/amd64, GUI subsystem (no console), with icon.

## 12. Done criteria

1. `make test` passes. It covers at least: palette generators always meet 4.5:1 on text pairs; theme → CSS compile
   (snapshot per preset); share code round-trip equals the input; schema migration; part registry; helper Spotify
   location (Mac/Win/Store); launch/restart decision table; settings IO; CDP re-attach after the target is destroyed (fake server).
2. `make e2e` passes on the dev Mac against real Spotify, launched through the helper:
   - computed `--background-base` equals the Darcula `background`;
   - switching to Nord changes it within 1 s, without a page reload;
   - setting `layout.hidden: ["friendActivity"]` gives `[data-testid=friend-activity-button]` computed `display: none`;
   - export share code → switch to Spotify Original → import gives byte-identical compiled CSS;
   - after `Page.reload`, the theme is re-applied with no helper restart;
   - the stats shelf renders ≥ 1 artist;
   - screenshots for each preset are saved to `e2e/out/` for visual review.
3. `make release` produces both artefacts. `lipo -info` shows arm64 + x86_64, and `file` reports a PE32+ GUI executable.
4. **Manual, not verifiable here:** the Windows build runs on a real Windows machine (launch, theme, builder, tray).

## 13. Verify first (spikes at the start of the plan)

1. `userTopContent`: hash discovery from loaded JS (and lazy chunks), the headers needed, and whether it accepts time ranges.
2. `data-encore-id` hooks exist for buttons/cards (the `buttons` and `cards` parts depend on this).
3. Home shelves: whether the container allows CSS `order` for reordering, and whether shelf section IDs are stable across reloads/days.
4. Main layout grid: whether "library on the right" is achievable with CSS only. If not, drop it from v1.
5. `<input type=file>` works inside Spotify's CEF (for "From image").
6. The Go WebSocket client connects to CEF's DevTools without `--remote-allow-origins` (no Origin header).
7. Windows Spotify honours `--remote-debugging-port`. This can't be verified on the dev Mac and needs a Windows machine.

## 14. Risks

| Risk | Mitigation |
|---|---|
| Spotify stops honouring the debug flag | Swap the helper's injection to Spicetify-style `xpui.spa` patching. Payload, builder and themes stay the same. |
| Spotify UI update changes hooks | Per-part presence check and "not found" badge. Fix in `parts/registry` and ship a new build. |
| Internal GraphQL changes | Stats shelf degrades to the "unavailable" message |
| The debug port lets local software control the Spotify session | Bound to localhost only, and the User-Agent is checked. Documented in the install guide. |
| Modifying the client is against Spotify's terms | Small private circle, no public distribution. Accepted by the author. |
| No auto-update for our app | Friends re-download. "Update available" in the tray is a candidate for later. |

## 15. Out of scope (v1)

Auto-update of the helper · light and high-contrast presets · stats beyond "this month" (local play-history log is a
candidate for later) · Microsoft Store Spotify · Linux · moving layout areas if spike 13.4 fails · Apple notarisation /
Windows code signing · community theme marketplace.

## 16. Addendum (2026-10-02, after approval to build)

- **Creative additions** (the user asked for a "wow" level): circular-reveal theme switch, palette colour morphing, hover-to-preview
  presets, live mini-Spotify preset cards, pick-mode spotlight, **Album Mode** (`effects.albumMode`: the palette follows the
  current cover), **Ambient Glow** (`effects.ambientGlow`), eyedropper. Details are in `docs/creative-direction.md`.
  `Theme.effects` is part of the theme and is shared via share codes.
- **Quality gates:** ESLint (typescript-eslint strict + stylistic, type-aware), `tsc --noEmit`, vitest; Go: gofmt, go vet,
  staticcheck, go test. `make check` runs all of them. TypeScript is pinned to 6.0 because typescript-eslint doesn't support TS 7 yet.
- **Contract change:** `ctx.spotify.query` and `ctx.settings.get` return `unknown`, and callers narrow the result at the boundary.

## 17. Addendum: user feedback round 1 (2026-10-02)

- **Lyrics page** (`theme.lyrics`, `layout.lyricsKeepLibrary`, `layout.lyricsImmersive`): restore the library sidebar that
  Spotify hides on the lyrics page; immersive mode (top and player bars fade until hovered or focused); lyrics background
  (Spotify / theme / accent / blurred cover), line colours, size, font and alignment. The same style applies to the lyrics preview
  card in the Now playing panel.
- **Now playing panel** (`layout.nowPlaying`): hide and reorder its sections, compact cover. These are part of the theme (shared via
  share codes), unlike Home shelves, which are personal.
- **Floating editor:** drag the builder anywhere in the window, with snapping and docking.
- **Entry icon:** a paint palette whose dots show the current theme's colours.
