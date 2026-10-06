package inject

import (
	"context"
	_ "embed"
	"fmt"
	"log/slog"
	"os"
	"time"
)

// embeddedPayload is the built payload bundle. `make payload` copies payload/dist/payload.js here;
// the committed file is a tiny placeholder so `go build` works on a fresh checkout.
//
//go:embed payload.js
var embeddedPayload string

// Payload supplies the JavaScript injected into Spotify.
type Payload interface {
	Source() (string, error)
}

// Embedded returns the payload compiled into the binary.
func Embedded() Payload { return embedded{} }

type embedded struct{}

func (embedded) Source() (string, error) { return embeddedPayload, nil }

// File reads the payload from disk on every Source call (dev mode).
type File struct{ Path string }

// Source reads the payload file.
func (f File) Source() (string, error) {
	data, err := os.ReadFile(f.Path)
	if err != nil {
		return "", fmt.Errorf("read payload: %w", err)
	}
	return string(data), nil
}

// FileWatcher reports when a dev-mode payload file has been rebuilt. Polling keeps it
// dependency-free and portable.
type FileWatcher struct {
	Path  string
	Every time.Duration
	// MissingGrace is how long the file may be missing or empty (a bundler clearing its output
	// folder mid-build) before it is logged as a problem. Default 3s.
	MissingGrace time.Duration
	Log          *slog.Logger
}

// Watch signals whenever the file has new, non-empty contents (by modification time). A missing or
// empty file means "not ready yet": it is skipped silently and checked again on the next poll. The
// channel is never closed (a closed channel would read as endless changes); it goes quiet when ctx ends.
func (w FileWatcher) Watch(ctx context.Context) <-chan struct{} {
	grace := w.MissingGrace
	if grace == 0 {
		grace = 3 * time.Second
	}
	changed := make(chan struct{}, 1)
	last, _ := readyModTime(w.Path)
	go func() {
		ticker := time.NewTicker(w.Every)
		defer ticker.Stop()
		var missingSince time.Time // zero while the file is ready
		reported := false
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
			}
			mt, ready := readyModTime(w.Path)
			if !ready {
				if missingSince.IsZero() {
					missingSince = time.Now()
				}
				if !reported && time.Since(missingSince) >= grace {
					reported = true
					w.Log.Warn("payload file missing or empty; waiting for the next build", "path", w.Path)
				}
				continue
			}
			missingSince, reported = time.Time{}, false
			if mt.Equal(last) {
				continue
			}
			last = mt
			select {
			case changed <- struct{}{}:
			default: // a reload is already pending
			}
		}
	}()
	return changed
}

// readyModTime returns the file's modification time, and false while it is missing or empty.
func readyModTime(path string) (time.Time, bool) {
	info, err := os.Stat(path)
	if err != nil || info.Size() == 0 {
		return time.Time{}, false
	}
	return info.ModTime(), true
}
