// Package shortcut points Spotify's own shortcuts (Start menu, desktop, pinned taskbar) at Spotify Custom, so opening
// Spotify from its usual icon starts Spotify Custom, which opens Spotify with the theme. Windows only: Dock icons on
// macOS can't take another app's place without changing Spotify.app. Elsewhere Links finds nothing.
package shortcut

import (
	"errors"
	"fmt"
	"path/filepath"
	"strings"
)

// Marker is the only argument our re-pointed shortcuts pass. It is how they are recognised as ours, so turning the
// option off (or uninstalling) restores exactly those and nothing else.
const Marker = "--spotify-shortcut"

// Link is one shortcut file.
type Link struct {
	Path   string
	Target string // the program it opens
	Args   string
}

// Links finds and rewrites shortcut files.
type Links interface {
	// Find returns the shortcuts that may be Spotify's or ours (by name; Sync decides by target).
	Find() ([]Link, error)
	// Retarget points the shortcut at target with args, showing icon's first icon.
	Retarget(path, target, args, icon string) error
}

// Sync points every plain Spotify shortcut at self (on), or every one of ours back at spotify (off). A Spotify
// shortcut with arguments of its own is left alone, so restoring is always exact. Shortcuts of ours that point at
// another copy of the app (it moved) follow it. Every shortcut is tried; it returns how many it changed.
func Sync(links Links, on bool, spotify, self string) (int, error) {
	found, err := links.Find()
	if err != nil {
		return 0, fmt.Errorf("find shortcuts: %w", err)
	}
	var changed int
	var errs []error
	for _, l := range found {
		target, args, ok := wanted(l, on, spotify, self)
		if !ok {
			continue
		}
		if err := links.Retarget(l.Path, target, args, spotify); err != nil {
			errs = append(errs, fmt.Errorf("%s: %w", l.Path, err))
			continue
		}
		changed++
	}
	return changed, errors.Join(errs...)
}

// wanted is what l should point at, or ok=false to leave it as it is.
func wanted(l Link, on bool, spotify, self string) (target, args string, ok bool) {
	ours := strings.TrimSpace(l.Args) == Marker
	switch {
	case on && ours && !samePath(l.Target, self):
		return self, Marker, true
	case on && !ours && l.Args == "" && samePath(l.Target, spotify):
		return self, Marker, true
	case !on && ours:
		return spotify, "", true
	}
	return "", "", false
}

// samePath compares Windows paths: case-insensitive, either separator.
func samePath(a, b string) bool {
	norm := func(p string) string { return filepath.Clean(strings.ReplaceAll(p, `\`, "/")) }
	return strings.EqualFold(norm(a), norm(b))
}
