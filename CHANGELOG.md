# Changelog

All notable changes to Spotify Custom. Versions follow `X.Y.Z`; installed copies update themselves (see
[docs/install-guide.md](docs/install-guide.md#updates)).

## Unreleased

### Changed

- **Spotify Custom is open source** under the [MIT licence](LICENSE).

## 0.4.2 — 2026-10-19

### Fixed

- **One Spotify icon on the Windows taskbar.** Start with Spotify no longer changes a Spotify icon pinned to the
  taskbar. Changing it made Windows show Spotify as a second icon next to the pin, and the pin could stop working after
  a restart, so you had to pin Spotify again every time. Pins changed by earlier versions are given back to Spotify. A
  Spotify opened from the pin gets your look a moment later. Start menu and desktop icons work as before.
- **Spotify's add button opens its full playlist list again.** The + next to a song showed only "New playlist": our
  right-click menu took Spotify's add-to-playlist window for one of its menus. It's left alone now.
- **Shortcut buttons stay on the line in recent searches.** On a recent search (no ⋯, only the remove ×) the buttons
  dropped to a line of their own. They now sit before the ×, next to the text.
- **Long names in the search suggestions scroll on hover.** A title or artist list that doesn't fit ends in "…"; point
  at the row (or move to it with the arrow keys) and it scrolls to show the rest, then back. Short ones stay put, and
  nothing moves if your system asks for reduced motion.
- **The "New release from" block on Home stays in its place.** It sometimes showed up between your shortcuts and
  Your listening. Your listening now always comes first, and the block is listed in the Home tab as its own section,
  so you can hide it or move it.

## 0.4.1 — 2026-10-16

### Added

- **Edit the right-click menu right in its picture.** The Menu tab now shows one menu, drawn like the real one, and you
  edit it in place: drag a row to move it, use its eye to hide or show it, remove separators and groups, and type
  group names straight into the menu. Hidden items stay in the picture, faded, so you can bring them back. No more
  scrolling between a list and a separate preview.
- **Keep or hide Spotify's own add button.** The shortcut buttons list for song rows and the player bar now includes
  Spotify's + (the one that saves to Liked Songs or a playlist). Hide it there if your shortcuts already cover it.
- **A preview of your shortcut buttons.** The Shortcut buttons section explains what the buttons are for and shows a
  song with your buttons where they'll appear, next to Spotify's own.
- **Shortcut buttons in search suggestions.** Songs in the dropdown under the search box can have their own shortcut
  buttons (pick them under Shortcut buttons → Search), and you can hide Spotify's ✓ there too. Playlists, albums and
  artists in the dropdown keep their own buttons.
- **Style the search suggestions.** Top bar → Search suggestions sets how tight the rows sit (Spotify, Compact, Dense),
  the cover and text sizes, how tall the dropdown grows before it scrolls, and can hide the ↑↓ / Enter hint bar and the
  "Song •" type before the artist. Its colours, accent and corners are yours too. The row highlight follows your text
  colour, so a light dropdown still shows which row you're on.
- **The search suggestions open while you edit them.** Point at Top bar → Search suggestions, or pick Search under
  Shortcut buttons, and the dropdown opens and stays open while you change things, even while you look at it in Spotify.
  Moving on to another section or tab, or closing the studio, closes it again.
- **Drag the Now playing panel shut.** Pull its edge to the right past the narrowest width and keep going (about
  100 px further), and the panel hides, just like with the hide button at its top left. The library on the left
  already worked this way.
  - Still holding the mouse button, pull back to the left and the panel comes back, then keeps following the mouse
    as usual. You can hide and bring it back as often as you like in one drag.
  - Let go while it's hidden and it stays hidden; it opens again with a click on the strip at the window's edge, at
    the narrowest width (not some random width left over from the drag).
  - On the lyrics page the same edge sizes the Now playing column beside the lyrics: the drag folds it to its strip
    and, while you still hold the button, unfolds it again.
  - Only the Now playing panel works this way; the queue and friend activity panels resize as before.

### Changed

- **The Menu tab sits with the other areas of Spotify**, right after Player.
- **Add to queue and Add to playlist shortcuts use Spotify's own icons**, so they look like the menu items they
  replace.
- **Music-reactive effects are much lighter.** The spectrum and the breathing background are now drawn outside
  Spotify's page, so they no longer make Spotify redraw everything 60 times a second. With them on, Spotify's window
  used about a third less CPU in our tests. They also update less often (the spectrum 30 times a second, the speed the
  sound analysis arrives at, and the soft background light 15), which spares the graphics chip. They look the same.
  The Music-reactive tab now says that these effects use some extra CPU and GPU while music plays.
- **Spotify reacts faster with your theme on.** Every time Spotify restyles the window (hovering, scrolling, opening
  a page, typing in search), the browser checks every rule of your theme against every element, and some of our rules
  were slow to rule out: with them, that work took nearly twice as long. They are now written so the browser can skip
  them where they can't apply. On an album page in our tests, restyling the window went from 44 ms to 29 ms. Nothing
  looks different.
- **The Flow progress bar shimmers when there's something to see**: a few sweeps after the song changes or you jump to
  another place in it, and while the pointer is over the player bar. Before, it shimmered nonstop while music played,
  which kept the whole window redrawing and the graphics chip busy.
- **Lyrics react rests while no lyrics are showing.** It used to follow the music even with the lyrics closed.

### Fixed

- **"Hide on this album" is back in the right-click menu layout.** Spotify gives this album-only item no name our menu
  could read, so it only turned up as an unnamed leftover and was missing from the Menu tab. It now has its own row:
  in the Spotify Custom layout it sits in the last section, under Hide in this playlist.
- **"Remove from Liked Songs" has its icon again.** Spotify shows a small Liked Songs cover there instead of an icon,
  and our menu left the spot empty.
- **Shortcut buttons in the queue can be clicked.** Spotify lays an invisible click area over each queue row, and it
  sat on top of the buttons, so a click played or selected the song instead.
- **Shortcut buttons no longer push Spotify's ✓ onto the song's length.** The last column of song lists kept its
  width while our buttons moved in, so Spotify's own buttons got squeezed and the ✓ landed on the duration. The column
  now grows by the width of your buttons.
- **The tour and What's new highlight stays inside the studio.** For a section taller than the studio, the highlight
  ran past the studio's bottom edge to the bottom of the window. It now covers only the part you can see.
- **Turning lyrics off in the full-window view shows the cover again.** With animated lyrics on, opening the Now
  playing view full-window and then turning lyrics off (the lyrics button in the player bar) left our lyrics drawn
  over the big cover Spotify shows instead. They now step aside while lyrics are off and come back when you turn them
  on again.

## 0.4.0 — 2026-10-15

### Added

- **Your own right-click menu.** Right-click a song and the menu now follows your theme's colours and your order.
  Pick Spotify's order, the Spotify Custom layout (collect, go to, play and share, remove), or build your own in the
  new Menu tab: drag items into any order, hide what you never use, and split the list with separators or named
  groups. Every item still does exactly what Spotify's does. Menus for albums, playlists and artists get the same look
  in Spotify's order.
- **A better Add to playlist.** The playlist list in the menu shows covers, keeps your folders, and can be sorted A–Z,
  in your library's order or in your own order, with favourite playlists pinned to the top. A search field appears
  when you have many playlists.
- **One-click shortcuts on songs.** Put up to three buttons, like Add to queue, Like or Add to playlist, right on song
  rows, on the rows in your queue and next to the song in the player bar. Choose them in the Menu tab.

### Fixed

- **The library and the queue can be resized again with rounded corners on.** Rounding those columns clipped Spotify's
  resize handle, which sits just outside them, so only a hair-thin strip could be grabbed. The corners now clip the
  column's content instead, and the whole handle works.
- **The right panel no longer slides sideways.** With the panel at its narrowest, the queue and Recently played tabs
  didn't fit beside the close button, and switching tabs shifted the whole panel left with its text cut off. The tabs
  now shorten with an ellipsis when space runs out, and the panel stays put.
- **Development: `make dev` always runs your working copy.** A helper that was already running (for example a local
  `make release` build started at login) used to keep the single-instance lock, so `make dev` exited silently and
  the old build kept injecting. A dev helper now asks the running one to quit and takes over. Dev and local builds
  no longer register themselves for Start at login, and `make dev` stops its payload watcher when it exits.

## 0.3.1 — 2026-10-14

### Added

- **Style the Now playing column beside the lyrics.** Point and click now picks it, and it has its own section at the
  bottom of the Lyrics tab: background, text and accent colours and corner roundness. Corners against the window edge
  stay square unless the column floats.

### Fixed

- **A gradient behind the main view no longer ends in a hard edge on Home.** Spotify's colour wash at the top of Home
  now fades out smoothly into your gradient, so the gradient carries on behind the whole page instead of being cut off
  under the shortcut cards.

## 0.3.0 — 2026-10-14

### Added

- **Two new themes: Galaxy and Catppuccin Latte.** Galaxy is deep-space indigo with a violet-to-cyan nebula on the
  play buttons, a flowing progress bar and the blurred cover behind the lyrics. Catppuccin Latte is the first light
  theme: the light flavour of Catppuccin Mocha, with its mauve accent.
- **Pictures in the top bar and the player bar, up to five per bar.** Under Pictures in the Top bar and Player tabs,
  add pictures and combine them: the first fills the bar, later ones go on top wherever you put them, even partly past
  the bar's top or bottom edge. Each picture has its own fit (free, fill or tile), size, position, opacity, blur,
  brightness and edge fade, and can be hidden, reordered or replaced. **Arrange on the bar** turns the real bar into a
  canvas: drag pictures to move them, drag a corner or scroll to resize, nudge with the arrow keys; Cancel puts
  everything back, Done or Esc keeps it, and every drag is one undo step. Spotify's buttons and window dragging pause
  only while you arrange. Wide pictures work best (at least 2400 × 160 px for the top bar); bigger ones are scaled down,
  and a theme holds about 700 KB of pictures in total. Pictures are part of the theme, so share codes and theme files
  carry them too (the code gets long; Save as file is easier to send). Galaxy shows the idea: nebula clouds fading out
  at both sides, and a banded, ringed planet on its own layer that you can drag anywhere.
- **New in Spotify Custom.** A sparkle button next to the theme studio button lights up in your accent colour after an
  update that brings something new. Click it for a short showcase of what changed (this time: pictures in your bars);
  skip or watch, and it goes quiet until the next release with news. It stays there to replay the showcase. New
  installs get the guided tour instead, so the sparkle first lights up at the next release.

### Changed

- **Calmer top-bar buttons.** The theme studio and What's new buttons no longer bounce: not on hover or click, and
  not to the music either. Beat pulse now kicks only the cover art and the play button, so its "Theme studio button"
  switch is gone. The palette still tilts and shows your theme's colours, easing in without overshoot.
- **One tab per area in the theme studio.** The tabs now follow Spotify's window: Top bar, Library, Home, Pages,
  Lyrics, Now playing and Player each hold everything for that area: colours, layout, which buttons show and their
  icons. Want to change the right panel? Open Now playing. Above them, Themes holds the gallery, starting points and
  sharing, and Look holds what the whole theme shares: colours, font, roundness, Album Mode, ambient glow, the icon
  pack, and cards and buttons found all over Spotify. Below them sit Reactive and Advanced, which now also lists your
  extensions. The Parts, Layout, Icons, Extras and Share tabs are gone, and nothing appears in two places any more.
- **Point and style lives in the studio's header**, so it's one click away from any tab. The editor that opens next
  to a part now ends with a "More in …" link to that part's section in its tab, where everything else for that area
  is; your edits stay.
- **Card and player play buttons are styled separately.** The round play buttons on cards and pages are under Look;
  the player's play button is under Player. Themes that styled "Play button" keep that look on both.
- **Home's shortcut cards and Your listening** are set up in the Home tab, including switching Your listening on or
  off. Before, their layout was only reachable by pointing at them.
- **Easier-to-spot section titles in the theme studio.** Each section's title is a little bigger, with an icon on a
  small key beside it, so you can find your way down a long tab at a glance.
- **App version on its own line.** In the studio's header it now sits under "Your theme · …" instead of at the end
  of that line.

## 0.2.7 — 2026-10-13

### Added

- **App version in the theme studio.** The studio's header shows which Spotify Custom version you're running, small
  and faint at the end of the line under the theme name.

### Changed

- **Floating lyrics columns.** A floating library, Now playing column or queue on the lyrics page now also keeps a gap
  above and below, so it stands clear of the top bar and the player. With the blurred cover background, the dark
  shade under the lyrics page's header row now runs across those gaps too, so they don't show as lighter strips. In
  the Lyrics settings, "Floating library" and "Floating Now playing and queue" now sit together.
- **Animated lyrics hide Spotify's view switcher.** The cover, Canvas, artist image and lyrics buttons in the lyrics
  page's header swapped the picture underneath our lyrics, which kept drawing over it. They're hidden while animated
  lyrics show; songs without synced lyrics still have them.

### Fixed

- **Music-reactive "No sound" message.** On Windows it no longer points to the Mac's System Settings. It now tells
  you to check that the song plays on this computer with Spotify's volume up. When Spotify plays on another device
  (Spotify Connect), it says so, since the sound then never reaches this computer.
- **Lyrics page opens and closes faster.** The first lines used to finish rising about 1.7 s after the click, which
  looked like the lyrics were still loading; they're now in place after about 1.1 s. The open/close morph is shorter
  too (about 120 ms less each way).
- **Notification bell.** With unread items in What's new, a second, blue bell showed over the bell (any icon pack
  except Spotify's). It's Spotify's unread dot again, over the bell.

## 0.2.6 — 2026-10-13

### Added

- **Floating side columns on the lyrics page.** Two new switches under Lyrics page in the Lyrics tab. "Floating
  library" gives the kept library rounded corners and a gap at the window edge. "Floating Now playing and queue" does
  the same for the Now playing column and Spotify's own queue panel. Off, they run to the window edge, as before. The
  queue panel now runs to the edge too, like the column it replaces.

### Fixed

- **Gradient fill without word by word.** With Lift on, the words of the sung line no longer pile up on top of each
  other at the start of the line. The line now lifts as a whole.
- **Blurred cover at the window edges.** The cover now reaches the window edges, so the gaps beside floating columns
  show the cover instead of a dark strip.
- **Music-reactive on Windows 10.** Works from Windows 10 version 2004 (build 19041) on. Before, it needed build
  20348 or newer, which turned away Windows 10 22H2 (build 19045).

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
