# Helper

The installable part of Spotify Custom: a tray app that starts Spotify with DevTools on
`127.0.0.1:<port>`, keeps the payload injected, and stores the user's data. See the spec
(`docs/superpowers/specs/2026-10-02-spotify-custom-design.md` §5) and `CONVENTIONS.md`.

| Package | Responsibility |
|---|---|
| `cmd/spotifycustom` | Wiring only: flags, data dir, log, single instance, tray ↔ loop ↔ bridge |
| `internal/app` | Control loop: observe → `spotify.Decide` → launch / restart / ask / connect |
| `internal/spotify` | Locate, observe, launch, quit Spotify; the pure decision table (`Decide`) |
| `internal/cdp` | Minimal DevTools client (+ `cdptest` fake endpoint for tests) |
| `internal/inject` | Attach to the UI page, inject payload (now + every reload), serve the bridge binding |
| `internal/bridge` | Bridge ops from `payload/src/types.ts` (`BridgeOps`) on top of the store |
| `internal/store` | Data folder: settings, themes, icon packs, extensions, runtime state (atomic writes) |
| `internal/tray` | Menu bar / notification area menu |
| `internal/desktop` | Notifications, dialogs, opening folders/URLs |
| `internal/autostart` | Start at login (LaunchAgent / `HKCU\…\Run`) |
| `internal/instance` | Single instance lock + "second launch opens Spotify" signal |
| `internal/logging` | `helper.log`, rotated at 1 MB |
| `internal/sysexec` | Runs system tools without console windows on Windows |
| `tools/mkicon` | Renders app/tray icons from vectors (`make icons`) |

## Commands

```sh
make test        # go test -race ./...
make lint        # go vet + gofmt + staticcheck, for macOS and Windows targets
make live-test   # read-only checks against a running Spotify (SC_PORT, default 9222)
make icons       # regenerate assets/ and internal/tray/assets/
make release OUT=/abs/dist   # universal SpotifyCustom.app (zipped) + SpotifyCustom.exe
```

Dev run against an already running Spotify (no restart):
`go run ./cmd/spotifycustom --dev --port 9222 --payload ../payload/dist/payload.js`

`internal/inject/payload.js` is the embedded bundle; the root `make payload` overwrites the committed
placeholder with `payload/dist/payload.js`.

## Behaviour notes

- Theme and settings documents are stored as opaque JSON; the payload owns their schema. The helper
  only reads a theme's `id`, and the folder name wins over it (`themes/<id>/`).
- Spotify is never restarted without asking unless the user just opened the helper / clicked a menu
  item, or the helper started at login and Spotify is under 60 s old (`spotify.Decide`).
- On quit, the helper removes its binding and reload script, so a reload shows plain Spotify.
