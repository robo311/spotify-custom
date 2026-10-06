package audio

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"spotifycustom/internal/spotify"
)

// SpotifyBundleID is the macOS bundle id of the process that plays Spotify's audio (verified on 1.3.3).
const SpotifyBundleID = "com.spotify.client"

// State values mirror AudioStatus.state in payload/src/types.ts.
const (
	StateOff             = "off"
	StateStarting        = "starting"
	StateListening       = "listening"
	StateNoSignal        = "no-signal"
	StateNeedsPermission = "needs-permission"
	StateUnsupported     = "unsupported"
	StateError           = "error"
)

// Status mirrors AudioStatus in payload/src/types.ts.
type Status struct {
	State     string `json:"state"`
	LatencyMs int    `json:"latencyMs"`
	Message   string `json:"message,omitempty"`
}

// SpotifyProcess finds Spotify's main process (spotify.Controller).
type SpotifyProcess interface {
	Status() (spotify.Process, bool, error)
}

const (
	defaultFrameInterval  = time.Second / 30
	defaultSilenceTimeout = 3 * time.Second
	retryInterval         = 2 * time.Second
	ringSize              = FFTSize * 4
)

// Service captures Spotify's audio while the page wants it and streams analysis frames to Sink.
// Audio only ever lives in a small in-memory ring; nothing is stored or logged.
type Service struct {
	Capturer Capturer
	Spotify  SpotifyProcess
	// Sink receives JavaScript to run in the Spotify page (frames ~30×/s, status on change). Must not block.
	Sink func(expr string)
	Log  *slog.Logger

	FrameInterval  time.Duration // default 1/30 s
	SilenceTimeout time.Duration // digital silence this long while capturing → no-signal (default 3 s)

	mu      sync.Mutex
	status  Status
	cancel  context.CancelFunc // non-nil while a capture loop runs
	stopped chan struct{}      // closed when that loop has ended

	samples sampleRing
}

// Want starts (on) or stops capturing and returns the resulting status. Starting waits for the first attempt.
func (s *Service) Want(on bool) Status {
	if !on {
		s.Stop()
		return s.Status()
	}
	s.mu.Lock()
	if s.cancel != nil {
		st := s.status
		s.mu.Unlock()
		return st
	}
	ctx, cancel := context.WithCancel(context.Background())
	first := make(chan struct{})
	s.cancel, s.stopped = cancel, make(chan struct{})
	stopped := s.stopped
	s.mu.Unlock()

	go func() {
		defer close(stopped)
		s.run(ctx, first)
	}()
	<-first
	return s.Status()
}

// Stop ends any capture (connection to Spotify gone, or the page asked) and waits for it to close.
func (s *Service) Stop() {
	s.mu.Lock()
	cancel, stopped := s.cancel, s.stopped
	s.mu.Unlock()
	if cancel == nil {
		return
	}
	cancel()
	<-stopped
}

// Status is the current state.
func (s *Service) Status() Status {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.status.State == "" {
		return Status{State: StateOff}
	}
	return s.status
}

// run owns one capture: open (retrying while Spotify's audio process doesn't exist yet), analyse, close.
func (s *Service) run(ctx context.Context, first chan struct{}) {
	signalFirst := sync.OnceFunc(func() { close(first) })
	defer signalFirst()
	defer func() {
		s.mu.Lock()
		s.cancel, s.stopped = nil, nil
		s.mu.Unlock()
		s.setStatus(Status{State: StateOff})
	}()

	s.setStatus(Status{State: StateStarting})
	var stream Stream
	for {
		var err error
		stream, err = s.open()
		if err == nil {
			break
		}
		s.setStatus(statusFor(err))
		if !errors.Is(err, ErrNoProcess) {
			signalFirst()
			<-ctx.Done() // stay in the failed state until the page stops wanting it
			return
		}
		signalFirst()
		select {
		case <-ctx.Done():
			return
		case <-time.After(retryInterval):
		}
	}
	defer func() {
		if err := stream.Close(); err != nil {
			s.Log.Warn("closing audio capture failed", "err", err)
		}
	}()
	latency := stream.LatencyMs()
	s.setStatus(Status{State: StateListening, LatencyMs: latency})
	signalFirst()
	s.analyse(ctx, NewAnalyzer(stream.SampleRate()), latency)
}

func (s *Service) open() (Stream, error) {
	proc, running, err := s.Spotify.Status()
	if err != nil {
		return nil, fmt.Errorf("find spotify: %w", err)
	}
	if !running {
		return nil, ErrNoProcess
	}
	s.samples.reset()
	return s.Capturer.Start(Target{PID: proc.PID, BundleID: SpotifyBundleID}, s.samples.write)
}

func (s *Service) analyse(ctx context.Context, an *Analyzer, latency int) {
	interval, silenceLimit := s.FrameInterval, s.SilenceTimeout
	if interval == 0 {
		interval = defaultFrameInterval
	}
	if silenceLimit == 0 {
		silenceLimit = defaultSilenceTimeout
	}
	tick := time.NewTicker(interval)
	defer tick.Stop()
	window := make([]float32, FFTSize)
	var silentFor time.Duration
	lastZero := false
	for {
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
		}
		heard := s.samples.latest(window)
		if heard {
			silentFor = 0
		} else {
			silentFor += interval
		}
		switch {
		case silentFor >= silenceLimit:
			s.setStatus(Status{State: StateNoSignal, LatencyMs: latency,
				Message: "Spotify's sound isn't reaching Spotify Custom. If you didn't allow audio capture, allow it in System Settings → Privacy & Security."})
		case heard:
			s.setStatus(Status{State: StateListening, LatencyMs: latency})
		}
		f := an.Analyze(window)
		if f.IsZero() && lastZero {
			continue // the page already decays to rest; don't stream silence
		}
		lastZero = f.IsZero()
		s.Sink(`window.__sc?.audio?.frame("` + f.Encode() + `")`)
	}
}

func (s *Service) setStatus(st Status) {
	s.mu.Lock()
	changed := st != s.status
	s.status = st
	s.mu.Unlock()
	if !changed {
		return
	}
	s.Log.Info("music-reactive", "state", st.State, "latencyMs", st.LatencyMs, "message", st.Message)
	data, err := json.Marshal(st)
	if err != nil {
		return
	}
	s.Sink("window.__sc?.audio?.status(" + string(data) + ")")
}

func statusFor(err error) Status {
	switch {
	case errors.Is(err, ErrUnsupported):
		return Status{State: StateUnsupported, Message: err.Error()}
	case errors.Is(err, ErrPermission):
		return Status{State: StateNeedsPermission, Message: err.Error()}
	case errors.Is(err, ErrNoProcess):
		return Status{State: StateStarting, Message: "Waiting for Spotify to play"}
	}
	return Status{State: StateError, Message: err.Error()}
}

// sampleRing keeps the most recent samples and whether any non-zero sample arrived since the last read.
type sampleRing struct {
	mu    sync.Mutex
	buf   [ringSize]float32
	pos   int
	heard bool
}

func (r *sampleRing) reset() {
	r.mu.Lock()
	defer r.mu.Unlock()
	clear(r.buf[:])
	r.pos, r.heard = 0, false
}

func (r *sampleRing) write(samples []float32) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, v := range samples {
		r.buf[r.pos] = v
		r.pos = (r.pos + 1) % ringSize
		if v != 0 {
			r.heard = true
		}
	}
}

// latest fills out with the newest len(out) samples and reports (and clears) whether sound arrived.
func (r *sampleRing) latest(out []float32) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	start := (r.pos - len(out) + ringSize) % ringSize
	for i := range out {
		out[i] = r.buf[(start+i)%ringSize]
	}
	heard := r.heard
	r.heard = false
	return heard
}
