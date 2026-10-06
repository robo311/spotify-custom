package audio

import (
	"encoding/base64"
	"math"
)

// Analysis constants. The frame layout is the contract with the payload (AudioStatus in payload/src/types.ts).
const (
	FFTSize      = 2048
	Bands        = 32
	FrameVersion = 1
	FrameBytes   = 3 + Bands

	minFreq = 30.0
	maxFreq = 16000.0

	bandRangeDB  = 50.0 // a band this far below the tracked peak reads 0
	levelRangeDB = 30.0
	loudValue    = 200.0 // what the tracked peak maps to; transients overshoot towards 255
	refFloorDB   = -80.0 // the auto-gain never boosts beyond this, so hiss stays dark

	// The analyser assumes it is called ~30×/s: these are per-frame rates.
	refAttack    = 0.3   // share of the gap closed per frame when louder than the reference
	refReleaseDB = 0.067 // dB per frame the reference falls when quieter (≈2 dB/s)

	beatLowHz       = 150.0
	beatWarmup      = 8   // frames before the flux statistics are trusted
	beatRefractory  = 5   // frames (≈170 ms) between beats
	beatFluxRatio   = 1.5 // onset flux vs. its running mean
	beatRiseShare   = 0.25
	beatAudibleDB   = 40.0 // low end must be within this of the band reference
	fluxMeanAlpha   = 0.1
	silenceRMSFloor = 1e-7
)

// Frame is one analysis result, values 0–255.
type Frame struct {
	Level uint8
	Beat  uint8 // onset strength; 0 = no beat in this frame
	Bands [Bands]uint8
}

// Encode is the base64 wire form: version, level, beat, bands.
func (f Frame) Encode() string {
	var b [FrameBytes]byte
	b[0], b[1], b[2] = FrameVersion, f.Level, f.Beat
	copy(b[3:], f.Bands[:])
	return base64.StdEncoding.EncodeToString(b[:])
}

// IsZero reports a silent frame.
func (f Frame) IsZero() bool { return f == Frame{} }

// Analyzer turns windows of mono samples into frames, keeping the auto-gain and beat state between calls.
// Not safe for concurrent use.
type Analyzer struct {
	rate   float64
	window [FFTSize]float64
	buf    []complex128
	ranges [Bands][2]int // FFT bin range [lo, hi] per band
	lowHi  int           // last bin of the beat range

	bandRef, levelRef float64 // dBFS, tracked peaks
	prevLow           []float64
	fluxMean          float64
	frames, sinceBeat int
}

// NewAnalyzer prepares an analyser for samples at rate Hz.
func NewAnalyzer(rate int) *Analyzer {
	a := &Analyzer{rate: float64(rate), buf: make([]complex128, FFTSize), bandRef: refFloorDB, levelRef: refFloorDB, sinceBeat: beatRefractory}
	for i := range a.window {
		a.window[i] = 0.5 - 0.5*math.Cos(2*math.Pi*float64(i)/FFTSize)
	}
	binHz := a.rate / FFTSize
	nyquistBin := FFTSize/2 - 1
	for b := range Bands {
		lo := minFreq * math.Pow(maxFreq/minFreq, float64(b)/Bands)
		hi := minFreq * math.Pow(maxFreq/minFreq, float64(b+1)/Bands)
		first, last := int(math.Ceil(lo/binHz)), int(math.Ceil(hi/binHz))-1
		if last < first { // narrower than a bin (low end): use the bin nearest the band's centre
			first = int(math.Round(math.Sqrt(lo*hi) / binHz))
			last = first
		}
		a.ranges[b] = [2]int{min(first, nyquistBin), min(last, nyquistBin)}
	}
	a.lowHi = int(beatLowHz / binHz)
	a.prevLow = make([]float64, a.lowHi+1)
	return a
}

// Analyze reads the last FFTSize samples (zero-padded in front if fewer).
func (a *Analyzer) Analyze(samples []float32) Frame {
	if len(samples) > FFTSize {
		samples = samples[len(samples)-FFTSize:]
	}
	pad := FFTSize - len(samples)
	var sum float64
	for i := range a.buf {
		v := 0.0
		if i >= pad {
			v = float64(samples[i-pad])
		}
		sum += v * v
		a.buf[i] = complex(v*a.window[i], 0)
	}
	rms := math.Sqrt(sum / FFTSize)
	if rms < silenceRMSFloor {
		a.resetBeat()
		return Frame{}
	}
	fft(a.buf)

	// Normalised so a full-scale sine reads ~1 at its bin (Hann coherent gain 0.5).
	mag := func(k int) float64 {
		re, im := real(a.buf[k]), imag(a.buf[k])
		return math.Sqrt(re*re+im*im) / (FFTSize / 4)
	}

	var f Frame
	var db [Bands]float64
	peak := math.Inf(-1)
	for b, r := range a.ranges {
		m := 0.0
		for k := r[0]; k <= r[1]; k++ {
			m = max(m, mag(k))
		}
		db[b] = toDB(m)
		peak = max(peak, db[b])
	}
	a.bandRef = track(a.bandRef, peak)
	for b := range db {
		f.Bands[b] = scale(db[b], a.bandRef, bandRangeDB)
	}

	levelDB := toDB(rms)
	a.levelRef = track(a.levelRef, levelDB)
	f.Level = scale(levelDB, a.levelRef, levelRangeDB)

	f.Beat = a.beat(mag)
	return f
}

// beat detects onsets as low-end spectral flux well above its running mean.
func (a *Analyzer) beat(mag func(int) float64) uint8 {
	var flux, low float64
	for k := 1; k <= a.lowHi; k++ {
		m := mag(k)
		flux += max(0, m-a.prevLow[k])
		low += m
		a.prevLow[k] = m
	}
	a.frames++
	a.sinceBeat++
	mean := a.fluxMean
	if a.frames == 1 {
		mean = flux
	}
	a.fluxMean = mean*(1-fluxMeanAlpha) + flux*fluxMeanAlpha

	onset := a.frames > beatWarmup &&
		a.sinceBeat >= beatRefractory &&
		flux > beatFluxRatio*mean &&
		flux > beatRiseShare*low &&
		toDB(low/float64(a.lowHi)) > a.bandRef-beatAudibleDB
	if !onset {
		return 0
	}
	a.sinceBeat = 0
	return uint8(math.Max(1, math.Min(255, 255*flux/(flux+2*mean))))
}

func (a *Analyzer) resetBeat() {
	clear(a.prevLow)
	a.sinceBeat = beatRefractory
}

func toDB(v float64) float64 { return 20 * math.Log10(v+1e-12) }

// track follows a peak: fast towards louder, slow release, never below the floor.
func track(ref, v float64) float64 {
	if v > ref {
		ref += (v - ref) * refAttack
	} else {
		ref -= refReleaseDB
	}
	return max(ref, refFloorDB)
}

// scale maps ref-rangeDB … ref to 0 … loudValue, clamped to a byte.
func scale(v, ref, rangeDB float64) uint8 {
	x := loudValue * (v - (ref - rangeDB)) / rangeDB
	return uint8(math.Round(math.Max(0, math.Min(255, x))))
}
