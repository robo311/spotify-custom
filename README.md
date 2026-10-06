# Spotify Custom

Your own look for the Spotify desktop app on Mac and Windows: colours, fonts, icons and layout, designed in a visual
theme studio inside Spotify. It doesn't modify Spotify's files and doesn't touch your account or music.

**[Download the latest version](https://github.com/robo311/spotify-custom/releases/latest)**:
`SpotifyCustom.dmg` (Mac) or `SpotifyCustom-Setup.exe` (Windows). See the [install guide](docs/install-guide.md).
It updates itself after that.

## Development

| | |
|---|---|
| `make dev` | live development against your running Spotify |
| `make check` | typecheck, lint and tests (payload + helper, macOS and Windows targets) |
| `make release` | local Mac + Windows build into `dist/` |
| `make publish VERSION=x.y.z` | publish a release via GitHub Actions ([docs/releasing.md](docs/releasing.md)) |

Design: [docs/superpowers/specs](docs/superpowers/specs/2026-10-02-spotify-custom-design.md) · rules:
[CONVENTIONS.md](CONVENTIONS.md) · payload in `payload/` (TypeScript, Preact) · helper in `helper/` (Go).
