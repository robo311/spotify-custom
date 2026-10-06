package audio

import (
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math"
	"strings"
	"sync"
	"testing"
	"time"

	"spotifycustom/internal/spotify"
)

type fakeSpotify struct{ running bool }

func (f fakeSpotify) Status() (spotify.Process, bool, error) {
	return spotify.Process{PID: 42}, f.running, nil
}

// fakeCapturer feeds a tone (or zeros) from its own goroutine, like a real stream.
type fakeCapturer struct {
	mu      sync.Mutex
	err     error
	silent  bool
	open    int // streams currently open
	starts  int
	targets []Target
}

type fakeStream struct {
	c    *fakeCapturer
	stop chan struct{}
	done chan struct{}
}

func (c *fakeCapturer) Start(target Target, onSamples func([]float32)) (Stream, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.starts++
	c.targets = append(c.targets, target)
	if c.err != nil {
		return nil, c.err
	}
	c.open++
	s := &fakeStream{c: c, stop: make(chan struct{}), done: make(chan struct{})}
	silent := c.silent
	go func() {
		defer close(s.done)
		n := 0
		for {
			select {
			case <-s.stop:
				return
			case <-time.After(2 * time.Millisecond):
			}
			buf := make([]float32, 480)
			if !silent {
				for i := range buf {
					buf[i] = float32(0.5 * math.Sin(2*math.Pi*440*float64(n+i)/testRate))
				}
			}
			n += len(buf)
			onSamples(buf)
		}
	}()
	return s, nil
}

func (s *fakeStream) SampleRate() int { return testRate }
func (s *fakeStream) LatencyMs() int  { return 25 }
func (s *fakeStream) Close() error {
	close(s.stop)
	<-s.done
	s.c.mu.Lock()
	s.c.open--
	s.c.mu.Unlock()
	return nil
}

func (c *fakeCapturer) openStreams() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.open
}

type sink struct {
	mu  sync.Mutex
	out []string
}

func (s *sink) push(expr string) {
	s.mu.Lock()
	s.out = append(s.out, expr)
	s.mu.Unlock()
}

func (s *sink) count(prefix string) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	n := 0
	for _, e := range s.out {
		if strings.HasPrefix(e, prefix) {
			n++
		}
	}
	return n
}

func (s *sink) has(sub string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, e := range s.out {
		if strings.Contains(e, sub) {
			return true
		}
	}
	return false
}

const framePrefix = `window.__sc?.audio?.frame("`

func newService(c Capturer, running bool) (*Service, *sink) {
	out := &sink{}
	return &Service{
		Capturer:       c,
		Spotify:        fakeSpotify{running: running},
		Sink:           out.push,
		Log:            slog.New(slog.NewTextHandler(io.Discard, nil)),
		FrameInterval:  5 * time.Millisecond,
		SilenceTimeout: 60 * time.Millisecond,
	}, out
}

func eventually(t *testing.T, what string, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for !cond() {
		if time.Now().After(deadline) {
			t.Fatalf("timed out waiting for %s", what)
		}
		time.Sleep(2 * time.Millisecond)
	}
}

func TestStartStopFollowsWant(t *testing.T) {
	c := &fakeCapturer{}
	s, out := newService(c, true)

	if st := s.Want(false); st.State != StateOff || c.starts != 0 {
		t.Fatalf("Want(false) while off: %+v, starts %d", st, c.starts)
	}
	st := s.Want(true)
	if st.State != StateListening || st.LatencyMs != 25 {
		t.Fatalf("Want(true) → %+v, want listening with the stream's latency", st)
	}
	if got := c.targets[0]; got.PID != 42 || got.BundleID != SpotifyBundleID {
		t.Errorf("target %+v", got)
	}
	s.Want(true) // already running: no second stream
	if c.openStreams() != 1 || c.starts != 1 {
		t.Fatalf("open %d, starts %d after a repeated Want(true)", c.openStreams(), c.starts)
	}
	eventually(t, "frames", func() bool { return out.count(framePrefix) >= 3 })

	if st := s.Want(false); st.State != StateOff {
		t.Errorf("Want(false) → %+v", st)
	}
	if c.openStreams() != 0 {
		t.Fatal("stream still open after Want(false)")
	}
	n := out.count(framePrefix)
	time.Sleep(30 * time.Millisecond)
	if out.count(framePrefix) != n {
		t.Error("frames kept coming after stop")
	}
	if !out.has(`status({"state":"off"`) || !out.has(`status({"state":"listening","latencyMs":25})`) {
		t.Errorf("status pushes missing: %v", out.out)
	}
}

func TestStopEndsCapture(t *testing.T) {
	c := &fakeCapturer{}
	s, _ := newService(c, true)
	s.Want(true)
	s.Stop()
	if c.openStreams() != 0 || s.Status().State != StateOff {
		t.Fatalf("after Stop: open %d, %+v", c.openStreams(), s.Status())
	}
	s.Stop() // idempotent
}

func TestCaptureErrorsMapToStates(t *testing.T) {
	for _, tc := range []struct {
		err  error
		want string
	}{
		{fmt.Errorf("tap: %w", ErrUnsupported), StateUnsupported},
		{fmt.Errorf("tap: %w", ErrPermission), StateNeedsPermission},
		{errors.New("boom"), StateError},
		{ErrNoProcess, StateStarting},
	} {
		c := &fakeCapturer{err: tc.err}
		s, _ := newService(c, true)
		if st := s.Want(true); st.State != tc.want {
			t.Errorf("%v → %+v, want %s", tc.err, st, tc.want)
		}
		s.Stop()
	}
}

func TestSpotifyNotRunningRetries(t *testing.T) {
	c := &fakeCapturer{}
	s, _ := newService(c, false)
	if st := s.Want(true); st.State != StateStarting {
		t.Fatalf("→ %+v, want starting while Spotify isn't running", st)
	}
	if c.starts != 0 {
		t.Error("capture started without a Spotify process")
	}
	s.Stop()
	if s.Status().State != StateOff {
		t.Errorf("after stop: %+v", s.Status())
	}
}

func TestDigitalSilenceBecomesNoSignal(t *testing.T) {
	c := &fakeCapturer{silent: true}
	s, out := newService(c, true)
	s.Want(true)
	defer s.Stop()
	eventually(t, "no-signal", func() bool { return s.Status().State == StateNoSignal })
	// The page push follows the state change (outside the lock), so wait for it too.
	eventually(t, "no-signal pushed to the page", func() bool { return out.has(`"state":"no-signal"`) })
	if n := out.count(framePrefix); n > 1 {
		t.Errorf("%d silent frames streamed, want at most one", n)
	}
}
