# Code conventions

These apply to every change. If code and this file disagree, fix the code or propose a change to this file.

## Architecture

- **One folder = one responsibility.** Other modules use a folder only through its `index.ts` exports and the shared
  contracts in `payload/src/types.ts`. Never import another module's internals.
- **Pure core, thin edges.** Logic (palette maths, theme compilation, share codes, launch decisions, Spotify lookup)
  lives in pure functions with unit tests. DOM, CDP, file system and process work sit in small adapters around them.
- **Data-driven registries.** Parts, layout options, presets, icon packs and extensions are data tables. Adding one means adding
  one entry, with no edits elsewhere.
- **Every start function returns a disposer.** Hot reload calls `dispose()` and boots again, so it must leave no duplicate DOM,
  listeners, observers, timers or styles. Everything we inject into Spotify gets an `sc-` prefix (ids, classes,
  attributes, CSS custom properties `--sc-*`).

## Talking to Spotify

- **Selectors:** only `[data-testid=…]`, `[data-encore-id=…]`, semantic tags and roles. **Never** hashed class names, and
  **never** `aria-label` or visible text (they're localised). Each module keeps its selectors in one `selectors.ts`.
  Exceptions, because they're readable names rather than hashes:
  - Encore design-system classes (`encore-dark-theme`, `encore-*-set`, …): Spotify's theming API.
  - Landmark ids (`#main-view`, `#Desktop_LeftSidebar_Id`, `#Desktop_PanelContainer_Id`): where no test-id exists.
  - Selectors **discovered at runtime** from Spotify's own stylesheets (theme/recolor.ts): never hard-coded in our source.
- **CSS variables for our UI:** the theme engine always defines `--sc-background, --sc-surface, --sc-elevated, --sc-text,
  --sc-text-subdued, --sc-accent, --sc-on-accent, --sc-border` (the palette), `--sc-radius`, `--sc-font-ui`, `--sc-font-mono` on `:root`.
  Injected UI uses only these.
- **CSS before JS.** Use JS DOM work only when CSS can't do it. Never move or remove React-owned nodes. Add our own
  siblings, or hide with CSS.
- **Observers:** scoped as narrowly as possible, batched per animation frame. No polling faster than 1 s.
- **Fail soft at the boundary.** If Spotify's DOM or internal API isn't what we expect, log once with the `[spotify-custom]` prefix
  and degrade only that feature. Don't wrap internal code that can't fail in try/catch.

## TypeScript (payload)

- `strict`, no `any` (`unknown` plus narrowing at boundaries), no non-null assertions on DOM queries.
- Files: `kebab-case.ts`; Preact components `PascalCase.tsx`, one component per file plus its small helpers.
- Keep files focused, around 300 lines at most. Split by responsibility, not by type.
- Each module starts with a header comment stating its responsibility. Other comments explain *why*, not *what*.
- Fonts available to everything: `font-family: "SC Inter"` and `"SC Mono"` (registered by the theme engine, always present).
- UI injected into Spotify renders inside a Shadow DOM root. Styles live next to their component (CSS strings / constructable
  stylesheets). No global CSS leaks either way.
- Tests: `*.test.ts(x)` next to the code, using vitest and happy-dom. Test behaviour through the public functions.
- Don't run `npm install`. The lockfile is shared. If you need a dependency, say so in your report.

## Go (helper)

- Standard layout: `cmd/spotifycustom`, `internal/<pkg>` with one responsibility each. Interfaces are defined at the consumer.
- `context.Context` carries lifecycle. Wrap errors with context (`fmt.Errorf("launch spotify: %w", err)`). No panics.
- Table-driven tests. OS-specific code goes in `_darwin.go` / `_windows.go` files behind a small interface so the logic stays testable
  on any OS.
- Must be clean under `gofmt`, `go vet` and `go test ./...`.

## Shared dev tools

- `payload/scripts/cdp.mjs`: `inject`, `eval`, `shot` against the running Spotify (port `SC_PORT`, default 9222).
  Several people and agents share one Spotify instance. Inject right before you check, keep evaluations read-only where possible,
  always navigate back to Home after navigating away, and **never quit or restart Spotify**.
- **Screenshots: never use `Page.captureScreenshot` with `clip.scale` ≠ 1, and never use `Emulation.setDeviceMetricsOverride`.** In
  Spotify's CEF either one can leave the real window's viewport stuck at a wrong size (seen: 1190×80) until the window is
  resized. Crop or zoom afterwards instead.
