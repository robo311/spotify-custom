package spotify

import (
	"errors"
	"path/filepath"
	"strings"
)

var (
	// ErrNotInstalled means no supported Spotify installation was found.
	ErrNotInstalled = errors.New("spotify is not installed")
	// ErrStoreVersion means only the Microsoft Store build exists; it can't be launched with our flag.
	ErrStoreVersion = errors.New("spotify from the Microsoft Store is not supported")
)

// DownloadURL is where users get the supported (non-Store) desktop app.
const DownloadURL = "https://www.spotify.com/download"

// Install is a located Spotify desktop app.
type Install struct {
	// Path is the .app bundle on macOS and Spotify.exe on Windows.
	Path string
}

// locateMac returns the first Spotify.app found in the standard locations.
func locateMac(home string, exists func(string) bool) (Install, error) {
	for _, p := range []string{"/Applications/Spotify.app", filepath.Join(home, "Applications", "Spotify.app")} {
		if exists(filepath.Join(p, "Contents", "MacOS", "Spotify")) {
			return Install{Path: p}, nil
		}
	}
	return Install{}, ErrNotInstalled
}

// locateWindows prefers the regular desktop install and recognises the Store build by its
// app-execution alias, so we can explain why it can't be used instead of failing silently.
func locateWindows(appData, localAppData string, exists func(string) bool) (Install, error) {
	if appData != "" {
		exe := winJoin(appData, "Spotify", "Spotify.exe")
		if exists(exe) {
			return Install{Path: exe}, nil
		}
	}
	if localAppData != "" && exists(winJoin(localAppData, "Microsoft", "WindowsApps", "Spotify.exe")) {
		return Install{}, ErrStoreVersion
	}
	return Install{}, ErrNotInstalled
}

// winJoin joins Windows path segments independent of the OS running the code (keeps tests portable).
func winJoin(parts ...string) string {
	for i := range parts {
		parts[i] = strings.TrimRight(parts[i], `\/`)
	}
	return strings.Join(parts, `\`)
}
