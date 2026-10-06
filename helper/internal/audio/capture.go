// Package audio turns Spotify's own audio output into small analysis frames for the music-reactive effects.
// Audio is captured from the Spotify process only, analysed in memory and reduced to levels; nothing is
// recorded, stored, logged or sent anywhere but the Spotify page on this machine (see AudioStatus in
// payload/src/types.ts for the frame format).
package audio

import "errors"

// Capture errors. Implementations wrap them so the service can map them to a status.
var (
	// ErrUnsupported: this OS (version) can't capture a single app's audio.
	ErrUnsupported = errors.New("capturing app audio is not supported on this system")
	// ErrPermission: the OS refused (macOS audio-capture permission denied).
	ErrPermission = errors.New("permission to capture audio was denied")
	// ErrNoProcess: Spotify isn't running or isn't known to the audio system yet.
	ErrNoProcess = errors.New("spotify's audio process was not found")
)

// Target identifies Spotify's audio-producing process.
type Target struct {
	PID      int    // Spotify's main process (Windows captures it including its child processes)
	BundleID string // macOS: "com.spotify.client"; the tap is created for the audio process with this bundle id
}

// Capturer starts captures. One implementation per OS (capture_darwin.go, capture_windows.go, capture_other.go).
type Capturer interface {
	// Start begins capturing Spotify's output. onSamples receives mono float32 samples in [-1, 1] (any batch
	// size) on a goroutine owned by the stream; it must return quickly. The stream stops delivering before
	// Close returns.
	Start(target Target, onSamples func([]float32)) (Stream, error)
}

// Stream is one running capture.
type Stream interface {
	SampleRate() int
	// LatencyMs is the output device's latency (how long until captured audio is actually heard); 0 = unknown.
	LatencyMs() int
	Close() error
}
