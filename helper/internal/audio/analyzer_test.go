package audio

import (
	"encoding/base64"
	"math"
	"testing"
)

const testRate = 48000
const hop = testRate / 30 // one frame at 30 Hz

// signal renders fn over n samples.
func signal(n int, fn func(t float64) float64) []float32 {
	out := make([]float32, n)
	for i := range out {
		out[i] = float32(fn(float64(i) / testRate))
	}
	return out
}

// frames runs the analyser over sig at 30 Hz, like the service does.
func frames(a *Analyzer, sig []float32) []Frame {
	var out []Frame
	for end := hop; end <= len(sig); end += hop {
		out = append(out, a.Analyze(sig[max(0, end-FFTSize):end]))
	}
	return out
}

func expectedBand(freq float64) int {
	return int(math.Floor(Bands * math.Log(freq/minFreq) / math.Log(maxFreq/minFreq)))
}

func TestSinePeaksInItsBand(t *testing.T) {
	for _, tc := range []struct {
		freq      float64
		tolerance int // low bands are narrower than an FFT bin, so neighbours can tie
	}{
		{60, 1}, {100, 1}, {440, 0}, {1000, 0}, {5000, 0}, {12000, 0},
	} {
		a := NewAnalyzer(testRate)
		fs := frames(a, signal(testRate, func(t float64) float64 { return 0.5 * math.Sin(2*math.Pi*tc.freq*t) }))
		last := fs[len(fs)-1]
		peak := 0
		for b, v := range last.Bands {
			if v > last.Bands[peak] {
				peak = b
			}
		}
		want := expectedBand(tc.freq)
		if d := peak - want; d < -tc.tolerance || d > tc.tolerance {
			t.Errorf("%v Hz: peak in band %d, want %d±%d (bands %v)", tc.freq, peak, want, tc.tolerance, last.Bands)
		}
		if last.Bands[peak] < 180 {
			t.Errorf("%v Hz: peak %d, want auto-gained near %v", tc.freq, last.Bands[peak], loudValue)
		}
		if last.Level == 0 {
			t.Errorf("%v Hz: level 0 for a loud tone", tc.freq)
		}
	}
}

// kicks: decaying 55 Hz thumps every 500 ms from 1 s on, over a faint high tone so the analyser is warmed up.
func kickSignal(seconds float64) (sig []float32, kickStarts []int) {
	period, first := testRate/2, testRate
	sig = signal(int(seconds*testRate), func(t float64) float64 {
		bed := 0.01 * math.Sin(2*math.Pi*3000*t)
		since := t - 1
		if since < 0 {
			return bed
		}
		since = math.Mod(since, 0.5)
		return bed + 0.8*math.Exp(-since/0.06)*math.Sin(2*math.Pi*55*since)
	})
	for s := first; s < len(sig); s += period {
		kickStarts = append(kickStarts, s)
	}
	return sig, kickStarts
}

func TestKicksProduceBeatsAtTheRightFrames(t *testing.T) {
	sig, kicks := kickSignal(4)
	fs := frames(NewAnalyzer(testRate), sig)

	var beats []int
	for i, f := range fs {
		if f.Beat > 0 {
			beats = append(beats, i)
		}
	}
	// Frame i covers samples up to (i+1)*hop, so a kick at sample s first shows in frame s/hop.
	var want []int
	for _, s := range kicks {
		if s/hop < len(fs) {
			want = append(want, s/hop)
		}
	}
	if len(beats) != len(want) {
		t.Fatalf("beats at frames %v, want one per kick near %v", beats, want)
	}
	for i := range want {
		if d := beats[i] - want[i]; d < 0 || d > 1 {
			t.Errorf("beat %d at frame %d, want %d (or the next)", i, beats[i], want[i])
		}
	}
}

func TestSteadyToneHasNoBeats(t *testing.T) {
	sig := signal(3*testRate, func(t float64) float64 {
		return 0.5*math.Sin(2*math.Pi*80*t) + 0.3*math.Sin(2*math.Pi*1000*t)
	})
	for i, f := range frames(NewAnalyzer(testRate), sig) {
		if f.Beat != 0 {
			t.Errorf("frame %d: beat %d in a steady tone", i, f.Beat)
		}
	}
}

func TestSilenceIsZero(t *testing.T) {
	a := NewAnalyzer(testRate)
	for _, in := range [][]float32{make([]float32, FFTSize), nil, make([]float32, 10)} {
		if f := a.Analyze(in); !f.IsZero() {
			t.Errorf("silence → %+v, want zero frame", f)
		}
	}
}

func TestEncode(t *testing.T) {
	f := Frame{Level: 7, Beat: 9}
	f.Bands[0], f.Bands[Bands-1] = 1, 255
	raw, err := base64.StdEncoding.DecodeString(f.Encode())
	if err != nil {
		t.Fatal(err)
	}
	if len(raw) != FrameBytes || FrameBytes != 35 {
		t.Fatalf("frame is %d bytes, want 35", len(raw))
	}
	if raw[0] != FrameVersion || raw[1] != 7 || raw[2] != 9 || raw[3] != 1 || raw[34] != 255 {
		t.Errorf("layout wrong: %v", raw)
	}
}

func TestFFTMatchesDFT(t *testing.T) {
	x := []complex128{1, 2, 3, 4, 0, -1, 2, 0.5}
	want := make([]complex128, len(x))
	for k := range want {
		for n, v := range x {
			want[k] += v * complex(math.Cos(2*math.Pi*float64(k*n)/8), -math.Sin(2*math.Pi*float64(k*n)/8))
		}
	}
	got := append([]complex128(nil), x...)
	fft(got)
	for k := range got {
		if d := got[k] - want[k]; math.Hypot(real(d), imag(d)) > 1e-9 {
			t.Errorf("bin %d: %v, want %v", k, got[k], want[k])
		}
	}
}
