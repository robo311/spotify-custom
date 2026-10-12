package main

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"spotifycustom/internal/app"
	"spotifycustom/internal/autostart"
	"spotifycustom/internal/shortcut"
)

// applyLoginDefault switches "Start at login" on the first time an installed release runs, so Spotify Custom is
// there when Spotify opens; after that it is the user's choice (the tray checkbox). Dev builds run from a temporary
// folder and a disk-image copy goes away, so neither is registered (the installed copy does it on its first run).
func applyLoginDefault(rt app.Runtime, exe string, release bool, enable func(exe string) error) error {
	r := rt.Runtime()
	if r.LoginDefaulted || !release || autostart.Temporary(exe) {
		return nil
	}
	if err := enable(exe); err != nil {
		return err
	}
	r.LoginDefaulted = true
	return rt.SaveRuntime(r)
}

// resyncShortcuts is how often Spotify's shortcuts are re-pointed: Spotify's updater recreates its own.
const resyncShortcuts = 10 * time.Minute

// spotifyShortcuts keeps Spotify's own shortcuts pointing at Spotify Custom while "Start with Spotify" is on
// (Windows; see internal/shortcut), and puts them back when it's turned off.
type spotifyShortcuts struct {
	links   shortcut.Links
	runtime app.Runtime
	spotify string // Spotify.exe
	self    string // this program
	release bool   // dev builds run from a temporary folder: never point Spotify's icons at them
	log     *slog.Logger
	mu      sync.Mutex
}

// On reports whether "Start with Spotify" is on (it is unless the user turned it off).
func (s *spotifyShortcuts) On() bool {
	return shortcut.Supported && !s.runtime.Runtime().NoSpotifyShortcuts
}

// Set remembers the choice and applies it right away.
func (s *spotifyShortcuts) Set(on bool) error {
	rt := s.runtime.Runtime()
	rt.NoSpotifyShortcuts = !on
	if err := s.runtime.SaveRuntime(rt); err != nil {
		return err
	}
	return s.Sync()
}

// Sync applies the current choice to the shortcuts on disk.
func (s *spotifyShortcuts) Sync() error {
	if !shortcut.Supported || !s.release {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	on := s.On()
	n, err := shortcut.Sync(s.links, on, s.spotify, s.self)
	if n > 0 {
		s.log.Info("spotify shortcuts updated", "pointAtUs", on, "changed", n)
	}
	if err != nil {
		s.log.Warn("updating spotify shortcuts failed", "err", err)
	}
	return err
}

// Run syncs now and then every resyncShortcuts until ctx ends.
func (s *spotifyShortcuts) Run(ctx context.Context) {
	for {
		_ = s.Sync() // logged
		select {
		case <-ctx.Done():
			return
		case <-time.After(resyncShortcuts):
		}
	}
}
