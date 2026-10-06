// Package bridge implements the helper side of the page→helper bridge ops (BridgeOps in
// payload/src/types.ts) on top of the data store and app actions.
package bridge

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"spotifycustom/internal/audio"
	"spotifycustom/internal/store"
	"spotifycustom/internal/update"
)

// ErrUnknownOp is returned for an op the helper does not implement.
var ErrUnknownOp = errors.New("unknown bridge op")

// Store is the part of the data store the bridge needs.
type Store interface {
	Dir() string
	SubDir(sub string) (string, error)
	Settings() (json.RawMessage, error)
	SaveSettings(json.RawMessage) error
	Themes() ([]json.RawMessage, error)
	SaveTheme(json.RawMessage) error
	DeleteTheme(id string) error
	IconPacks() ([]store.IconPack, error)
	Extensions() ([]store.ExtensionFile, error)
}

// Actions are side effects outside the data folder.
type Actions interface {
	OpenFolder(path string) error
	// RestartSpotify restarts Spotify with the theme; it returns before the restart completes.
	RestartSpotify()
}

// Audio is the music-reactive capture service.
type Audio interface {
	Want(on bool) audio.Status
}

// Updates is the helper self-update service.
type Updates interface {
	Status() update.Status
	// Install starts installing the available update; it returns before the install completes.
	Install()
}

// Handler answers bridge calls.
type Handler struct {
	Store    Store
	Actions  Actions
	Audio    Audio
	Updates  Updates
	Version  string
	Platform string // "darwin" | "windows"
}

// State mirrors HelperState in payload/src/types.ts.
type State struct {
	Settings   json.RawMessage       `json:"settings"` // null on first run
	UserThemes []json.RawMessage     `json:"userThemes"`
	IconPacks  []store.IconPack      `json:"iconPacks"`
	Extensions []store.ExtensionFile `json:"extensions"`
	DataDir    string                `json:"dataDir"`
	Version    string                `json:"version"`
	Platform   string                `json:"platform"`
	Update     update.Status         `json:"update"`
}

// Handle dispatches one op. Results are JSON-encoded by the caller.
func (h *Handler) Handle(_ context.Context, op string, args json.RawMessage) (any, error) {
	switch op {
	case "getState":
		return h.state()
	case "saveSettings":
		return nil, h.Store.SaveSettings(args)
	case "saveTheme":
		return nil, h.Store.SaveTheme(args)
	case "deleteTheme":
		var a struct {
			ID string `json:"id"`
		}
		if err := json.Unmarshal(args, &a); err != nil {
			return nil, fmt.Errorf("deleteTheme: %w", err)
		}
		return nil, h.Store.DeleteTheme(a.ID)
	case "openFolder":
		var a struct {
			Sub string `json:"sub"`
		}
		if err := json.Unmarshal(args, &a); err != nil {
			return nil, fmt.Errorf("openFolder: %w", err)
		}
		dir, err := h.Store.SubDir(a.Sub)
		if err != nil {
			return nil, err
		}
		return nil, h.Actions.OpenFolder(dir)
	case "restartSpotify":
		h.Actions.RestartSpotify()
		return nil, nil
	case "audio":
		var a struct {
			On bool `json:"on"`
		}
		if err := json.Unmarshal(args, &a); err != nil {
			return nil, fmt.Errorf("audio: %w", err)
		}
		return h.Audio.Want(a.On), nil
	case "installUpdate":
		h.Updates.Install()
		return nil, nil
	}
	return nil, fmt.Errorf("%w: %q", ErrUnknownOp, op)
}

func (h *Handler) state() (State, error) {
	settings, err := h.Store.Settings()
	if err != nil {
		return State{}, err
	}
	themes, err := h.Store.Themes()
	if err != nil {
		return State{}, err
	}
	packs, err := h.Store.IconPacks()
	if err != nil {
		return State{}, err
	}
	exts, err := h.Store.Extensions()
	if err != nil {
		return State{}, err
	}
	if settings == nil {
		settings = json.RawMessage("null")
	}
	return State{
		Settings:   settings,
		UserThemes: themes,
		IconPacks:  packs,
		Extensions: exts,
		DataDir:    h.Store.Dir(),
		Version:    h.Version,
		Platform:   h.Platform,
		Update:     h.Updates.Status(),
	}, nil
}
