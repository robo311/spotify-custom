package spotify

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"
)

// fakePlatform simulates a Spotify process that may ignore quit requests and/or kills.
type fakePlatform struct {
	mu          sync.Mutex
	running     bool
	ignoreQuit  bool
	ignoreKill  bool
	launchedOn  []int
	quitAsked   int
	killed      int
	locateError error
}

func (f *fakePlatform) Locate() (Install, error) {
	return Install{Path: "/Applications/Spotify.app"}, f.locateError
}

func (f *fakePlatform) MainProcess() (Process, bool, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return Process{PID: 42, Uptime: time.Minute}, f.running, nil
}

func (f *fakePlatform) Launch(_ Install, port int) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.running = true
	f.launchedOn = append(f.launchedOn, port)
	return nil
}

func (f *fakePlatform) RequestQuit(Install, Process) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.quitAsked++
	if !f.ignoreQuit {
		f.running = false
	}
	return nil
}

func (f *fakePlatform) Kill(Process) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.killed++
	if !f.ignoreKill {
		f.running = false
	}
	return nil
}

func (f *fakePlatform) Focus(Install) error { return nil }

func newTestController(t *testing.T, f *fakePlatform) *Controller {
	t.Helper()
	c, err := NewController(f)
	if err != nil {
		t.Fatal(err)
	}
	c.QuitTimeout = 30 * time.Millisecond
	c.KillTimeout = 30 * time.Millisecond
	c.PollInterval = 5 * time.Millisecond
	return c
}

func TestRestartQuitsGracefullyThenLaunchesWithPort(t *testing.T) {
	f := &fakePlatform{running: true}
	if err := newTestController(t, f).Restart(context.Background(), 41234); err != nil {
		t.Fatal(err)
	}
	if f.quitAsked != 1 || f.killed != 0 || len(f.launchedOn) != 1 || f.launchedOn[0] != 41234 {
		t.Fatalf("quit=%d kill=%d launched=%v", f.quitAsked, f.killed, f.launchedOn)
	}
}

func TestRestartForceKillsWhenQuitIsIgnored(t *testing.T) {
	f := &fakePlatform{running: true, ignoreQuit: true}
	if err := newTestController(t, f).Restart(context.Background(), 1); err != nil {
		t.Fatal(err)
	}
	if f.killed != 1 || len(f.launchedOn) != 1 {
		t.Fatalf("kill=%d launched=%v", f.killed, f.launchedOn)
	}
}

func TestRestartFailsWhenSpotifyWontDie(t *testing.T) {
	f := &fakePlatform{running: true, ignoreQuit: true, ignoreKill: true}
	c := newTestController(t, f)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := c.Restart(ctx, 1); !errors.Is(err, ErrStillRunning) {
		t.Fatalf("err = %v, want ErrStillRunning", err)
	}
	if len(f.launchedOn) != 0 {
		t.Fatal("launched a second Spotify while the first was still running")
	}
}

func TestRestartWhenNotRunningJustLaunches(t *testing.T) {
	f := &fakePlatform{}
	if err := newTestController(t, f).Restart(context.Background(), 7); err != nil {
		t.Fatal(err)
	}
	if f.quitAsked != 0 || len(f.launchedOn) != 1 {
		t.Fatalf("quit=%d launched=%v", f.quitAsked, f.launchedOn)
	}
}

func TestNewControllerPropagatesLocateErrors(t *testing.T) {
	if _, err := NewController(&fakePlatform{locateError: ErrStoreVersion}); !errors.Is(err, ErrStoreVersion) {
		t.Fatalf("err = %v", err)
	}
}
