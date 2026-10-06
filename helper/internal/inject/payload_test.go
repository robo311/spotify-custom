package inject_test

import (
	"bytes"
	"context"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"spotifycustom/internal/inject"
)

// syncBuffer is a goroutine-safe log sink.
type syncBuffer struct {
	mu sync.Mutex
	b  bytes.Buffer
}

func (s *syncBuffer) Write(p []byte) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.b.Write(p)
}

func (s *syncBuffer) String() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.b.String()
}

type watched struct {
	path    string
	changed <-chan struct{}
	log     *syncBuffer
	cancel  context.CancelFunc
}

func watch(t *testing.T, grace time.Duration) *watched {
	t.Helper()
	path := filepath.Join(t.TempDir(), "payload.js")
	write(t, path, "v1", time.Now())
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	logs := &syncBuffer{}
	w := inject.FileWatcher{
		Path:         path,
		Every:        5 * time.Millisecond,
		MissingGrace: grace,
		Log:          slog.New(slog.NewTextHandler(logs, nil)),
	}
	return &watched{path: path, changed: w.Watch(ctx), log: logs, cancel: cancel}
}

func write(t *testing.T, path, body string, mtime time.Time) {
	t.Helper()
	if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.Chtimes(path, mtime, mtime); err != nil {
		t.Fatal(err)
	}
}

func expectSignal(t *testing.T, ch <-chan struct{}) {
	t.Helper()
	select {
	case <-ch:
	case <-time.After(2 * time.Second):
		t.Fatal("no change signalled")
	}
}

func expectQuiet(t *testing.T, ch <-chan struct{}, d time.Duration) {
	t.Helper()
	select {
	case <-ch:
		t.Fatal("unexpected change signalled")
	case <-time.After(d):
	}
}

func TestWatcherSignalsChanges(t *testing.T) {
	w := watch(t, time.Second)
	write(t, w.path, "v2", time.Now().Add(time.Second))
	expectSignal(t, w.changed)
}

// Regression: a closed channel is always ready, so closing it on shutdown made the injector's
// select fire bogus "dev reloads" while it was cleaning up.
func TestWatcherDoesNotSignalAfterCancel(t *testing.T) {
	w := watch(t, time.Second)
	w.cancel()
	expectQuiet(t, w.changed, 100*time.Millisecond)
}

// Vite's emptyOutDir deletes (or truncates) the bundle before writing the new one. That window is
// "not ready yet": no reload, no log; only the finished file triggers a reload.
func TestWatcherSkipsMissingOrEmptyFileWhileRebuilding(t *testing.T) {
	w := watch(t, time.Second)

	if err := os.Remove(w.path); err != nil {
		t.Fatal(err)
	}
	expectQuiet(t, w.changed, 50*time.Millisecond)
	write(t, w.path, "", time.Now().Add(time.Second)) // created but not written yet
	expectQuiet(t, w.changed, 50*time.Millisecond)
	write(t, w.path, "v2", time.Now().Add(2*time.Second))
	expectSignal(t, w.changed)

	if got := w.log.String(); got != "" {
		t.Fatalf("logged during a normal rebuild: %s", got)
	}
}

func TestWatcherLogsOnceWhenFileStaysMissing(t *testing.T) {
	w := watch(t, 30*time.Millisecond)
	if err := os.Remove(w.path); err != nil {
		t.Fatal(err)
	}
	expectQuiet(t, w.changed, 150*time.Millisecond)
	if n := strings.Count(w.log.String(), "payload file missing"); n != 1 {
		t.Fatalf("logged %d times, want once:\n%s", n, w.log.String())
	}

	// Once it is back, a later outage is reported again.
	write(t, w.path, "v2", time.Now().Add(time.Second))
	expectSignal(t, w.changed)
	if err := os.Remove(w.path); err != nil {
		t.Fatal(err)
	}
	expectQuiet(t, w.changed, 150*time.Millisecond)
	if n := strings.Count(w.log.String(), "payload file missing"); n != 2 {
		t.Fatalf("logged %d times, want twice:\n%s", n, w.log.String())
	}
}
