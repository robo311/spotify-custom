package main

import (
	"encoding/json"
	"log/slog"
	"os"
	"sync"

	"spotifycustom/internal/app"
	"spotifycustom/internal/autostart"
	"spotifycustom/internal/desktop"
	"spotifycustom/internal/store"
	"spotifycustom/internal/tray"
	"spotifycustom/internal/update"
)

// shell adapts the app loop, store and desktop to what the tray menu and the bridge need.
type shell struct {
	loop    *app.App
	store   *store.Store
	desk    desktop.Desktop
	updates *update.Service
	log     *slog.Logger
}

func (s *shell) OpenSpotify()   { s.loop.OpenSpotify() }
func (s *shell) RestartThemed() { s.loop.RestartThemed() }
func (s *shell) InstallUpdate() { s.updates.Install() }

// RestartSpotify is the bridge's restartSpotify op.
func (s *shell) RestartSpotify() { s.loop.RestartThemed() }

// OpenFolder is the bridge's openFolder op.
func (s *shell) OpenFolder(path string) error { return s.desk.Open(path) }

func (s *shell) OpenDataFolder() {
	if err := s.desk.Open(s.store.Dir()); err != nil {
		s.log.Warn("opening data folder failed", "err", err)
	}
}

func (s *shell) StartAtLogin() bool { return autostart.Enabled() }

func (s *shell) SetStartAtLogin(on bool) error {
	var err error
	if on {
		var exe string
		if exe, err = os.Executable(); err == nil {
			err = autostart.Enable(exe)
		}
	} else {
		err = autostart.Disable()
	}
	if err != nil {
		s.log.Warn("changing start at login failed", "on", on, "err", err)
	}
	return err
}

// statusSink forwards app status to the tray menu, remembering it until the menu exists.
type statusSink struct {
	mu   sync.Mutex
	menu *tray.Menu
	last *app.Status
}

func (s *statusSink) set(st app.Status) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.last = &st
	if s.menu != nil {
		s.menu.SetStatus(st.String())
	}
}

func (s *statusSink) attach(m *tray.Menu) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.menu = m
	if s.last != nil {
		m.SetStatus(s.last.String())
	}
}

// updateSink forwards update status to the tray menu (remembered until the menu exists) and to Spotify.
type updateSink struct {
	page func(expr string)

	mu   sync.Mutex
	menu *tray.Menu
	last *update.Status
}

func (s *updateSink) set(st update.Status) {
	s.mu.Lock()
	s.last = &st
	if s.menu != nil {
		s.menu.SetUpdate(updateLabel(st))
	}
	s.mu.Unlock()
	if data, err := json.Marshal(st); err == nil {
		s.page("window.__sc?.update?.(" + string(data) + ")")
	}
}

func (s *updateSink) attach(m *tray.Menu) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.menu = m
	if s.last != nil {
		m.SetUpdate(updateLabel(*s.last))
	}
}

// updateLabel is the tray item for a status ("" = hidden) and whether it can be clicked.
func updateLabel(st update.Status) (string, bool) {
	switch st.State {
	case update.StateAvailable:
		return "Update to version " + st.Latest + "…", true
	case update.StateInstalling:
		return "Updating to " + st.Latest + "…", false
	case update.StateFailed:
		return "Update to " + st.Latest + " failed. Try again", true
	}
	return "", false
}
