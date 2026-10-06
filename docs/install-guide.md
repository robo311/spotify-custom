# Spotify Custom: install guide

Spotify Custom gives your Spotify app new colours, fonts, icons and layout, and you design the look yourself. It doesn't
change your account, your music or your playlists, and you can switch back to Spotify's normal look at any time.

**You need:** the Spotify desktop app from [spotify.com/download](https://www.spotify.com/download).
On Windows, the version from the *Microsoft Store* doesn't work. If that's the one you have, uninstall it and install
Spotify from the website instead.

## Download

Get the newest version from the **[Releases page](https://github.com/robo311/spotify-custom/releases/latest)**:

- Mac: `SpotifyCustom.dmg`
- Windows: `SpotifyCustom-Setup.exe`

You install it once. After that, Spotify Custom tells you when there's a new version and updates itself (see
[Updates](#updates)).

## Mac

1. Open `SpotifyCustom.dmg` and drag **SpotifyCustom** onto the **Applications** folder next to it.
   Run it from Applications, not from the disk image or Downloads: that's what lets it update itself.
2. Double-click it in Applications. The first time, macOS says it can't verify the app. That's normal for apps that
   don't come from the App Store. Click **Done**.
3. Open **System Settings → Privacy & Security**, scroll down, and click **Open Anyway** next to "SpotifyCustom".
   Confirm with your password or Touch ID. You only ever do this once.
4. A small icon appears in the menu bar at the top of your screen, and Spotify opens with the new look.

## Windows

1. Double-click `SpotifyCustom-Setup.exe`.
2. If Windows shows "Windows protected your PC", click **More info → Run anyway**. You only ever do this once.
3. Click through the installer. It installs just for you (no administrator password) and adds **Spotify Custom** to the
   Start menu.
4. A small icon appears in the system tray (bottom right, next to the clock; you may need to click **^** to see it),
   and Spotify opens with the new look.

## Updates

Spotify Custom checks for a new version when it starts and every few hours. When there is one:

- the theme studio shows **"Spotify Custom x.y.z is available"** with an **Update** button, and
- the tray / menu bar menu shows **Update to version x.y.z…**

Click either one. Spotify Custom downloads the new version, checks it isn't damaged, installs it and starts again.
Your theme disappears for a few seconds while it restarts. Your themes and settings are kept.

On a Mac, the first time you use music-reactive effects after an update, macOS asks again whether Spotify Custom may
listen to Spotify's sound. Allow it as before.

## Using it

- **Make it yours:** click the **palette button** in Spotify's top bar. Pick a theme, choose your own colours, or click
  **Start → From album art** to get colours from whatever's playing. Everything changes live, and **Ctrl+Z / ⌘Z** undoes.
- **Click to customise:** in the **Parts** tab, turn on the brush, then click any part of Spotify (the player bar, the sidebar
  and so on) to change just that part.
- **Album Mode:** with this on, Spotify's colours follow the cover of each song you play.
- **Share your look:** **Share → Copy share code** and send the code to a friend. They paste it into **Share → Import**.
- **Tray / menu bar icon:** *Open Spotify*, *Restart themed*, *Open my customisations folder*, *Start at login*, *Quit*.

## Something's not right?

| What you see | What to do |
|---|---|
| Spotify opened with its normal look | Click the tray/menu bar icon → **Restart themed**. This happens when Spotify was opened from its own icon. |
| A part of the theme stopped working after a Spotify update | The palette panel marks it "not found in this Spotify version". Everything else keeps working, and an updated Spotify Custom will fix it. |
| I want plain Spotify back | Palette button → **Start → Spotify Original**. Or quit Spotify Custom from the tray icon and open Spotify normally. |

## Uninstall

- **Mac:** menu bar icon → turn off **Start at login**, then **Quit**. Drag SpotifyCustom from Applications to the Bin.
- **Windows:** **Settings → Apps → Installed apps → Spotify Custom → Uninstall** (this also turns off Start at login).
- Optional: delete your saved themes, in the folder that **Open my customisations folder** shows
  (Mac: `~/Library/Application Support/SpotifyCustom`, Windows: `%APPDATA%\SpotifyCustom`).

## Privacy & safety

- Spotify Custom works by starting Spotify with a developer connection that only programs **on your own computer** can use. It
  isn't reachable from the internet or your home network. It doesn't send your data anywhere. The only thing it
  downloads on its own is the update check (a small file from this project's GitHub releases).
- Themes and share codes only contain colours and styles, never programs.
- *Extensions* are small programs. Only turn on extensions you got from someone you trust.
- Changing the Spotify app is against Spotify's terms of use. In practice Spotify hasn't acted against people using
  tools like this, but you use it at your own risk.
