# Releasing an update

Every release is built by GitHub Actions from a tag. Installed copies check the newest release every few hours and offer
the update in the theme studio and the tray menu.

## Publish

```sh
make check                    # optional: CI runs it too
git commit -am "…"            # everything you want in the release
make publish VERSION=0.2.0    # pushes main, tags v0.2.0, pushes the tag
```

Then watch **Actions → Release** on GitHub (about 10 minutes). It:

1. runs `make check` and builds the Mac app (`make release`) on macOS,
2. runs the Go helper's tests on Windows and builds `SpotifyCustom-Setup.exe` with Inno Setup,
3. publishes the GitHub release with `SpotifyCustom.dmg`, `SpotifyCustom-Setup.exe`, `SpotifyCustom-mac.zip`,
   `latest.json` and `SHA256SUMS.txt`.

If any step fails, nothing is published. Fix it, delete the tag (`git tag -d v0.2.0 && git push origin :v0.2.0`) and
publish again.

Versions are `X.Y.Z` and must go up: the helper only offers a version that is newer than its own.

## How updates work

- `latest.json` (from `helper/packaging/manifest.sh`) lists the version and, per OS, the package URL and its SHA-256. The
  helper fetches it from `releases/latest/download/latest.json`, which always points at the newest published release.
  Drafts and pre-releases are skipped, so marking a release as a pre-release on GitHub hides it from users.
- **Mac:** the helper downloads `SpotifyCustom-mac.zip`, checks the SHA-256, swaps the `.app` in place and reopens it.
  If the app runs from somewhere it can't write (Downloads, a disk image, a read-only folder), it opens the release
  page instead.
- **Windows:** the helper downloads `SpotifyCustom-Setup.exe`, checks the SHA-256 and runs it silently. Setup closes
  the helper, installs into `%LOCALAPPDATA%\Programs\Spotify Custom` and starts the new version.
- Local builds (version `dev`) never check for updates.

## Pulling a bad release

Mark it as a pre-release (or delete it) on GitHub. `latest` then points back at the previous release. Copies that
already updated stay on the bad version until you publish a fixed, higher version.

## Signing (not set up)

Builds are unsigned, so first installs need **Open Anyway** (Mac) or **More info → Run anyway** (Windows), and macOS
asks again for the audio permission after each update. To remove both:

- **Mac:** an Apple Developer ID ($99/year). Replace the ad-hoc `codesign --sign -` in `helper/Makefile` with the
  Developer ID identity, add `--options runtime`, then notarise with `xcrun notarytool` and staple the DMG. In CI, the
  certificate and an App Store Connect API key go in repository secrets.
- **Windows:** a code-signing certificate (or Azure Trusted Signing). Sign `SpotifyCustom.exe` before Inno Setup
  packs it and `SpotifyCustom-Setup.exe` after, with `signtool` in the `windows` job.
