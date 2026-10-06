//go:build live && darwin

package audio

import (
	"encoding/base64"
	"io"
	"log/slog"
	"math"
	"strings"
	"sync"
	"testing"
	"time"
)

// TestLiveCapture taps the running Spotify for ~3 s and prints what arrived. Play music first. The first run
// may show macOS's audio-capture permission prompt; until it's allowed, samples are all zero.
func TestLiveCapture(t *testing.T) {
	var mu sync.Mutex
	var n, nonZero int
	var sumSq float64
	stream, err := NewCapturer().Start(Target{BundleID: SpotifyBundleID}, func(s []float32) {
		mu.Lock()
		defer mu.Unlock()
		for _, v := range s {
			n++
			sumSq += float64(v) * float64(v)
			if v != 0 {
				nonZero++
			}
		}
	})
	if err != nil {
		t.Fatalf("start: %v", err)
	}
	rate, latency := stream.SampleRate(), stream.LatencyMs()
	time.Sleep(3 * time.Second)
	if err := stream.Close(); err != nil {
		t.Fatal(err)
	}
	mu.Lock()
	defer mu.Unlock()
	rms := 0.0
	if n > 0 {
		rms = math.Sqrt(sumSq / float64(n))
	}
	t.Logf("rate %d Hz, latency %d ms, %d samples (%.0f/s), %d non-zero, rms %.4f",
		rate, latency, n, float64(n)/3, nonZero, rms)
	if n == 0 {
		t.Error("no samples arrived")
	}
}

// TestLiveService runs the whole service on the real tap for ~3 s and counts frames and beats.
func TestLiveService(t *testing.T) {
	var mu sync.Mutex
	var frames, beats int
	var statuses []string
	s := &Service{Capturer: NewCapturer(), Spotify: fakeSpotify{running: true}, Log: slogDiscard(), Sink: func(expr string) {
		mu.Lock()
		defer mu.Unlock()
		if f, ok := decodeFrameExpr(expr); ok {
			frames++
			if f[2] > 0 {
				beats++
			}
			return
		}
		statuses = append(statuses, expr)
	}}
	st := s.Want(true)
	time.Sleep(3 * time.Second)
	s.Stop()
	mu.Lock()
	defer mu.Unlock()
	t.Logf("start status %+v; %d frames (%.1f/s), %d beats; statuses %v", st, frames, float64(frames)/3, beats, statuses)
	if st.State != StateListening || frames < 60 {
		t.Error("expected listening and ~90 frames")
	}
}

func slogDiscard() *slog.Logger { return slog.New(slog.NewTextHandler(io.Discard, nil)) }

func decodeFrameExpr(expr string) ([]byte, bool) {
	rest, ok := strings.CutPrefix(expr, framePrefix)
	if !ok {
		return nil, false
	}
	raw, err := base64.StdEncoding.DecodeString(strings.TrimSuffix(rest, `")`))
	return raw, err == nil
}
