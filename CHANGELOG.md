# Changelog

All notable changes to Spotify Custom. Versions follow `X.Y.Z`; installed copies update themselves (see
[docs/install-guide.md](docs/install-guide.md#updates)).

## 0.2.5 — 2026-10-13

### Added

- **Collapse the lyrics Now playing column.** A button in its top corner, like the one on Spotify's own panel, folds
  the column to a narrow strip so the lyrics (or music video) get the room. It slides closed and open, the lyrics
  widening with it. Hover the strip to see the column drift in faintly underneath; click it to bring the column
  back. It stays the way you left it, across songs and restarts.

### Fixed

- **Theme studio at the top of the window.** With the panel (or one of its popovers) moved up over Spotify's top bar,
  you can drag it and use its header buttons again. Before, the window's own drag strip took the mouse there and
  dragged the whole Spotify window instead.
- **Now playing Canvas fade matches your theme.** The dark fades over the Canvas video in the right panel (Spotify
  1.3.4) now blend into your theme's background instead of Spotify's own grey. Before, a grey box with rounded corners
  showed behind the title and through the top of the lyrics card.
- **Music videos.** With "Switch to video" on, the video now fits the space between the top bar and the player bar,
  centred on black. Before, it was cut off and sat too low, with a band of the lyrics gradient above it. The Now playing
  column beside it shows the album cover instead of a still frame of the video. Switching back to audio no longer
  leaves the related music videos showing under the lyrics for a second or two.
- **Closing the lyrics view.** The right panel's song title and buttons stay in view while the panel slides back,
  instead of disappearing under the cover or Canvas and popping back in at the end.

## 0.2.4 — 2026-10-13

### Added

- **Animated lyrics** (🎨 → Lyrics → Animated lyrics). Lyrics on the lyrics page are drawn word by word: each word
  fills in as it's sung, with optional glow, lift, blur on the other lines and an accent gradient fill. A "Cover left"
  layout puts the cover, title and progress beside the lyrics. Most songs only have line timing from Spotify, so the
  word timing is estimated from it (real syllable timing is used when Spotify has it). Click a line to jump to it;
  after you scroll, the lyrics follow the song again by themselves (Spotify's own "Sync" button is hidden meanwhile).
  Songs without synced lyrics keep Spotify's own view. Uses your theme's lyrics font, size, alignment and colours.
  On by default in every theme except Spotify Original. Skipping songs keeps the view in place: the cover panel
  updates at once and only the lines fade over to the new song.
- **Hide Up next in the lyrics Now playing column** (🎨 → Lyrics → Up next). With it off the column shows only the
  cover (or Canvas video), song and artist, and the cover or video fills the whole column, fading out over a longer
  stretch at the bottom.

### Fixed

- **Lyrics page edges.** With the library kept beside the lyrics, it now sits flush with the window edge instead of
  leaving a dark strip there, and in immersive lyrics the side columns run to the top and bottom edges as well.
- **Lyrics under the header.** Lyric lines fade out before they reach the lyrics view's header row (and, in immersive
  lyrics, the player bar) instead of showing through behind its buttons.
- **Blurred cover background:** the lyrics view now reaches the columns beside it, so its dark header fade no longer
  stops short over a strip of bare cover. The library and the right panel stay resizable over it.
- **No more black flash when skipping songs on the lyrics page** with the blurred cover background. The background
  keeps the previous cover until the next one has loaded, instead of going empty for a moment.
- **Sharper Canvas video in the lyrics Now playing column.** It loads at the size it's shown at (a portrait video
  covering a tall column needs more width than the column), instead of being stretched and soft, most visibly while
  paused. The cover no longer shows through faintly where the video fades out at the bottom.

## 0.2.3 — 2026-10-13

### Added

- **Canvas video in the lyrics Now playing column.** Songs with a Canvas now play it in the column beside the lyrics,
  like Spotify's own panel does, instead of a still cover. It pauses with the song, loads only while the lyrics view
  is open, and keeps the cover if the video can't load. Turn it off with **Canvas video** in the Lyrics tab.
- **Your Episodes artwork.** Your Episodes gets its own picture, icon or colours in the Library tab, like Liked Songs.
- **Nine more fonts:** Bricolage Grotesque, Syne, Unbounded, Quicksand, Comfortaa, Caveat, Playfair Display,
  Cormorant Garamond and EB Garamond.
- **Resize the lyrics Now playing column** with Spotify's own panel resize bar.
- **New versions show up as soon as Spotify opens.** Opening (or reopening) Spotify now checks for an update straight
  away, instead of waiting for the hourly check.

### Fixed

- **The theme font applies everywhere**, including the Now playing panel and the stats shelf (Spotify's own font
  stacks used to win).
- **Now playing panel settings work again on Spotify 1.3.4.** Spotify rebuilt its Now playing panel, and every panel
  setting had stopped working. The Layout tab said the panel wasn't open. Sections, hide and reorder, compact cover,
  cover height, gradient, title size, the video switch and Liked tick, and card styling now work on 1.3.4 and still
  on 1.3.3.
- **Lyrics lines no longer vanish for a moment** when the song moves to the next line (the opening animation replayed
  on every line change).
- **Breathing background shows in the lyrics view.** It was drawn behind the lyrics view, out of sight.
- **No solid colour band under album and playlist headers** with the blurred-cover, accent, custom or theme
  backdrop (most visible on Liked Songs). The blurred cover now fades into the page without a seam.
- **Track numbers 100 and up stay inside outlined and card rows.**
- **Centred page headers centre Your Episodes' cover** too.

## 0.2.2 — 2026-10-12

### Added

- **Guided tour of the theme studio.** The first time Spotify starts with Spotify Custom, a small card under the
  studio button offers a short tour (**Show me** or **Not now**, asked once). The tour walks through presets,
  pointing at a part of Spotify to restyle it, colours, Album Mode, album/playlist/artist pages, lyrics, the other
  sections, sharing and, at the end, custom CSS in Advanced. Each step highlights the real control so it can be tried
  on the spot. Replay it any time with the **?** button in the studio's header.
- **Start with Spotify (Windows, on by default).** Spotify's own icons (Start menu, desktop, taskbar) open Spotify
  Custom, which opens Spotify with your look, even after you quit Spotify Custom. Turn it off in the tray menu to give
  the icons back to Spotify; uninstalling gives them back too.

### Changed

- **Start at login is switched on** once, on the first start of this version (new installs and updates alike);
  after that it's your choice in the tray menu.
- **Opening Spotify from its own icon no longer asks** whether to restart it: a Spotify that only just started is
  restarted once with your look straight away. One that has been open for a while is still asked about first.
- **New app icon**: five equaliser bars, each in a theme colour, on a dark tile, replacing the gauge knob. Used for
  the app and its shortcuts, the Windows tray and the Mac menu bar.

### Docs

- Install guide: new **Starting with Spotify** section (start at login, opening Spotify from its own icon, Start with
  Spotify on Windows); the tray menu list, troubleshooting table and uninstall steps cover the new option.

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
