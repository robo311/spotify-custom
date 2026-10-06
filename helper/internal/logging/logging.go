// Package logging writes the helper's log to <data>/helper.log, capped at about 1 MB (one previous
// file is kept as helper.log.1) so friends can send it when something goes wrong.
package logging

import (
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
)

// MaxBytes is the size at which the log rotates.
const MaxBytes = 1 << 20

// New returns a logger writing to dir/helper.log (and stderr when tee is true, for dev runs).
func New(dir string, tee bool) (*slog.Logger, io.Closer, error) {
	w, err := OpenRotating(filepath.Join(dir, "helper.log"), MaxBytes)
	if err != nil {
		return nil, nil, err
	}
	var out io.Writer = w
	if tee {
		out = io.MultiWriter(w, os.Stderr)
	}
	return slog.New(slog.NewTextHandler(out, &slog.HandlerOptions{Level: slog.LevelInfo})), w, nil
}

// Rotating is an append-only file that moves itself to <path>.1 once it exceeds its limit.
type Rotating struct {
	path  string
	limit int64

	mu   sync.Mutex
	f    *os.File
	size int64
}

// OpenRotating opens (or creates) path for appending.
func OpenRotating(path string, limit int64) (*Rotating, error) {
	r := &Rotating{path: path, limit: limit}
	if err := r.open(); err != nil {
		return nil, err
	}
	return r, nil
}

func (r *Rotating) open() error {
	f, err := os.OpenFile(r.path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return fmt.Errorf("open log: %w", err)
	}
	info, err := f.Stat()
	if err != nil {
		f.Close()
		return fmt.Errorf("open log: %w", err)
	}
	r.f, r.size = f, info.Size()
	return nil
}

// Write appends p, rotating first if p would push the file over the limit.
func (r *Rotating) Write(p []byte) (int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.size > 0 && r.size+int64(len(p)) > r.limit {
		if err := r.rotate(); err != nil {
			return 0, err
		}
	}
	n, err := r.f.Write(p)
	r.size += int64(n)
	return n, err
}

func (r *Rotating) rotate() error {
	if err := r.f.Close(); err != nil {
		return fmt.Errorf("rotate log: %w", err)
	}
	if err := os.Rename(r.path, r.path+".1"); err != nil {
		return fmt.Errorf("rotate log: %w", err)
	}
	return r.open()
}

// Close closes the file.
func (r *Rotating) Close() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.f.Close()
}
