package app

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"sync"
	"testing"
	"time"

	"spotifycustom/internal/cdp"
	"spotifycustom/internal/spotify"
	"spotifycustom/internal/store"
)

// world is a fake Spotify + desktop + runtime that the loop drives.
type world struct {
	mu        sync.Mutex
	running   bool
	debugPort int // port Spotify listens on; 0 = no debug port
	uptime    time.Duration
	pid       int
	ignoreArg bool // a Spotify that never opens the debug port

	launches, restarts, focuses, serves int
	notes                               []string
	confirms                            int
	confirmAnswer                       bool
	statuses                            []Status
	rt                                  store.Runtime
	serving                             chan struct{} // closed by test to simulate Spotify quitting
}

func (w *world) Status() (spotify.Process, bool, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	return spotify.Process{PID: w.pid, Uptime: w.uptime}, w.running, nil
}

func (w *world) start(port int) {
	w.running, w.uptime = true, 0
	w.pid++
	if !w.ignoreArg {
		w.debugPort = port
	}
}

func (w *world) Launch(port int) error {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.launches++
	w.start(port)
	return nil
}

func (w *world) Restart(_ context.Context, port int) error {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.restarts++
	w.start(port)
	return nil
}

func (w *world) Focus() error {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.focuses++
	return nil
}

func (w *world) Notify(_, msg string) error {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.notes = append(w.notes, msg)
	return nil
}

func (w *world) Confirm(_, _, _, _ string) (bool, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.confirms++
	return w.confirmAnswer, nil
}

func (w *world) Runtime() store.Runtime {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.rt
}

func (w *world) SaveRuntime(rt store.Runtime) error {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.rt = rt
	return nil
}

func (w *world) discover(_ context.Context, port int) (cdp.Endpoint, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.running && w.debugPort == port {
		return cdp.Endpoint{BrowserURL: "ws://fake"}, nil
	}
	return cdp.Endpoint{}, errors.New("connection refused")
}

func (w *world) serve(ctx context.Context, _ int) error {
	w.mu.Lock()
	w.serves++
	quit := w.serving
	w.mu.Unlock()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-quit:
		w.mu.Lock()
		w.running, w.debugPort = false, 0
		w.mu.Unlock()
		return cdp.ErrClosed
	}
}

// counts is a consistent copy of the fake's counters.
type counts struct{ launches, restarts, focuses, serves, confirms, notes int }

func (w *world) counts() counts {
	w.mu.Lock()
	defer w.mu.Unlock()
	return counts{w.launches, w.restarts, w.focuses, w.serves, w.confirms, len(w.notes)}
}

func (w *world) get(fn func(w *world) int) int {
	w.mu.Lock()
	defer w.mu.Unlock()
	return fn(w)
}

func run(t *testing.T, w *world, cfg Config) *App {
	t.Helper()
	if w.serving == nil {
		w.serving = make(chan struct{})
	}
	cfg.PollInterval = 5 * time.Millisecond
	cfg.StartupTimeout = 100 * time.Millisecond
	if cfg.Port == 0 {
		cfg.Port = 41000
	}
	a := New(cfg, Deps{
		Log:      slog.New(slog.NewTextHandler(io.Discard, nil)),
		Spotify:  w,
		Desktop:  w,
		Runtime:  w,
		Discover: w.discover,
		Serve:    w.serve,
		OnStatus: func(s Status) {
			w.mu.Lock()
			w.statuses = append(w.statuses, s)
			w.mu.Unlock()
		},
	})
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- a.Run(ctx) }()
	t.Cleanup(func() {
		cancel()
		select {
		case <-done:
		case <-time.After(2 * time.Second):
			t.Error("Run did not stop")
		}
	})
	return a
}

func eventually(t *testing.T, what string, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for !cond() {
		if time.Now().After(deadline) {
			t.Fatalf("timed out waiting for: %s", what)
		}
		time.Sleep(2 * time.Millisecond)
	}
}

func lastStatus(w *world) Status {
	w.mu.Lock()
	defer w.mu.Unlock()
	if len(w.statuses) == 0 {
		return -1
	}
	return w.statuses[len(w.statuses)-1]
}

func TestUserStartLaunchesAndConnects(t *testing.T) {
	w := &world{}
	run(t, w, Config{})
	eventually(t, "connected", func() bool { return w.get(func(w *world) int { return w.serves }) == 1 })
	if c := w.counts(); c.launches != 1 || lastStatus(w) != StatusActive {
		t.Fatalf("counts=%+v status=%v", c, lastStatus(w))
	}
}

func TestUserStartRestartsUntouchedSpotifyAndSaysSo(t *testing.T) {
	w := &world{running: true, uptime: time.Hour, pid: 10}
	run(t, w, Config{})
	eventually(t, "connected", func() bool { return w.get(func(w *world) int { return w.serves }) == 1 })
	if c := w.counts(); c.restarts != 1 || c.confirms != 0 || c.notes == 0 {
		t.Fatalf("counts=%+v", c)
	}
}

func TestLaterUntouchedSpotifyIsAskedAboutOnce(t *testing.T) {
	w := &world{}
	run(t, w, Config{})
	eventually(t, "connected", func() bool { return w.get(func(w *world) int { return w.serves }) == 1 })

	// User quits Spotify, then opens it from its own icon (no debug port).
	close(w.serving)
	eventually(t, "waiting", func() bool { return lastStatus(w) == StatusWaiting })
	w.mu.Lock()
	w.running, w.uptime, w.pid = true, 5*time.Second, 99
	w.mu.Unlock()

	eventually(t, "asked", func() bool { return w.get(func(w *world) int { return w.confirms }) == 1 })
	time.Sleep(50 * time.Millisecond) // several more polls
	if c, r := w.get(func(w *world) int { return w.confirms }), w.get(func(w *world) int { return w.restarts }); c != 1 || r != 0 {
		t.Fatalf("confirms=%d restarts=%d; want asked once, no restart after 'Not now'", c, r)
	}
	if lastStatus(w) != StatusUntouched {
		t.Fatalf("status = %v", lastStatus(w))
	}
}

func TestAcceptedAskRestarts(t *testing.T) {
	w := &world{running: true, uptime: time.Hour, pid: 3, confirmAnswer: true}
	run(t, w, Config{Login: true})
	eventually(t, "connected", func() bool { return w.get(func(w *world) int { return w.serves }) == 1 })
	if c := w.counts(); c.confirms != 1 || c.restarts != 1 {
		t.Fatalf("counts=%+v", c)
	}
}

func TestLoginWithFreshSpotifyRestartsWithoutAsking(t *testing.T) {
	w := &world{running: true, uptime: 3 * time.Second, pid: 3}
	run(t, w, Config{Login: true})
	eventually(t, "connected", func() bool { return w.get(func(w *world) int { return w.serves }) == 1 })
	if c := w.counts(); c.confirms != 0 || c.restarts != 1 {
		t.Fatalf("counts=%+v", c)
	}
}

func TestLoginWithoutSpotifyDoesNotLaunchIt(t *testing.T) {
	w := &world{}
	run(t, w, Config{Login: true})
	time.Sleep(50 * time.Millisecond)
	if n := w.get(func(w *world) int { return w.launches }); n != 0 {
		t.Fatalf("launched Spotify %d times at login", n)
	}
}

func TestRestartCommandWhileConnected(t *testing.T) {
	w := &world{}
	a := run(t, w, Config{})
	eventually(t, "connected", func() bool { return w.get(func(w *world) int { return w.serves }) == 1 })
	a.RestartThemed()
	eventually(t, "reconnected", func() bool { return w.get(func(w *world) int { return w.serves }) == 2 })
	if c := w.counts(); c.restarts != 1 {
		t.Fatalf("counts=%+v", c)
	}
}

func TestOpenCommandWhileConnectedFocuses(t *testing.T) {
	w := &world{}
	a := run(t, w, Config{})
	eventually(t, "connected", func() bool { return w.get(func(w *world) int { return w.serves }) == 1 })
	a.OpenSpotify()
	eventually(t, "focused", func() bool { return w.get(func(w *world) int { return w.focuses }) == 1 })
}

func TestSpotifyIgnoringTheFlagFailsVisibly(t *testing.T) {
	w := &world{ignoreArg: true}
	run(t, w, Config{})
	eventually(t, "failed", func() bool { return lastStatus(w) == StatusFailed })
	if w.counts().notes == 0 {
		t.Fatal("user was not told")
	}
}

func TestPortIsPickedOnceAndRemembered(t *testing.T) {
	w := &world{}
	a := New(Config{}, Deps{Runtime: w})
	p1, err := a.resolvePort()
	if saved := w.Runtime().Port; err != nil || p1 == 0 || saved != p1 {
		t.Fatalf("first port = %d, %v (saved %d)", p1, err, saved)
	}
	p2, _ := a.resolvePort()
	if p2 != p1 {
		t.Fatalf("second port = %d, want remembered %d", p2, p1)
	}
	if p, _ := New(Config{Port: 9222}, Deps{Runtime: w}).resolvePort(); p != 9222 {
		t.Fatalf("--port override = %d", p)
	}
}
