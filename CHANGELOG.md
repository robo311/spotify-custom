# Changelog

All notable changes to Spotify Custom. Versions follow `X.Y.Z`; installed copies update themselves (see
[docs/install-guide.md](docs/install-guide.md#updates)).

## 0.2.1 — 2026-10-12

### Added

- **Update button in Spotify's top bar.** When a new version is out, an **Update x.y.z** button appears next to the
  theme studio button on every page. One click installs it; it shows **Updating…** while it works and
  **Update failed · retry** (with the reason on hover) if something goes wrong.

### Changed

- **New installs start on Tokyo Night.** It is the default theme for first-time users and comes first in the theme
  gallery. Existing installs keep the theme they have.
- **Updates show up within the hour.** Spotify Custom now checks for a new version every hour instead of every six
  hours, so a restart is no longer needed to see one.
- The small dot under the theme studio button no longer doubles as the "update waiting" sign; it only means the
  studio is open.

## 0.2.0 — 2026-10-12

### Fixed

- **Updates**
  - The update notice in the theme studio could stay hidden while music-reactive effects were running (the status
    message was dropped behind the stream of audio frames). Status messages are now always delivered, in order.
  - Clicking Update in the tray and in the studio at the same time starts a single install.
  - The studio no longer gets stuck on "Updating…" when there turns out to be nothing to install, or when the update
    has to be installed by hand.
  - Before installing, Spotify Custom checks again that the release is still offered, so a release that was pulled
    in the meantime is never installed.
  - Downloaded update files are always saved inside the update folder, whatever the file name in the release.
- **Theme studio**
  - Esc works the same everywhere: it leaves pick mode and closes popovers even when focus is in Spotify, and Esc in
    Spotify's own search, dialogs and menus is left to Spotify.
  - Pick mode no longer picks the studio's own button and drawer, while the lyrics column and the stats shelf stay
    pickable.
  - Popovers no longer steal focus from the control you are using on every edit.
  - Custom CSS typed in the Advanced tab is applied even if you leave the tab mid-typing.
  - Closing the import panel (or the studio) always removes the theme preview from Spotify.
  - Recent colours record where a colour drag ended, even if the picker closes during the drag.
  - Renaming a theme is no longer undone by Undo.
- **Themes**
  - Shared themes may only use plain gradients for backgrounds; anything that loads an image or URL is rejected.
  - A theme keeps its folder when edited, so edits save to, and deletes remove, the right theme.
  - Text colours picked for contrast stay readable on mid-tone backgrounds.
  - Canvas-as-cover stops mirroring the video once nothing shows it, and no longer rewrites its styles needlessly.
  - Large folder pictures shrink reliably to fit the size limit.
- **Helper**
  - Quitting Spotify no longer makes Spotify Custom start it again.
  - Music-reactive effects analyse silence instead of repeating the last sound when Windows stops sending audio
    (for example while paused).
  - "Start at login" is not pointed at a copy running from a disk image or the Downloads folder.
  - Log rotation on Windows no longer stops logging when the file is in use.
  - A stalled connection to Spotify no longer hangs the helper.

### Security

- Release builds run with read-only GitHub tokens; only the publishing step may write releases, and releases publish
  one at a time.
- Build tools are pinned to fixed versions.

## 0.1.0 — 2026-10-06

First release.

- **Theme studio** inside Spotify: palette, fonts, icons, corner radius, layout, and per-part styling with pick mode.
- **10 presets**: Darcula, Spotify Original, Catppuccin Mocha, Tokyo Night, Gruvbox Dark, Nord, Midnight Blue,
  Sunset, Forest, Mono. Editing a preset makes your own copy; themes can be shared as codes.
- **Pages**: album, playlist, song and artist headers, song lists, playing-row and equaliser colours, CD-style and
  spinning covers, Canvas video as cover.
- **Lyrics view**: backgrounds (theme, accent, blurred cover), line colours, font and size, keep the library open,
  immersive mode, and a Now playing column.
- **Music-reactive effects**: spectrum, beat pulse, breathing background and lyrics, driven by Spotify's audio.
- **Home**: shortcut cards, shelves and a listening stats shelf.
- **Installers** for macOS (.dmg) and Windows (setup .exe), a tray / menu bar icon, start at login, and one-click
  self-update.
