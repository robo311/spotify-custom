package audio

import (
	"errors"
	"testing"
	"unsafe"
)

func TestWasapiFloatFormat(t *testing.T) {
	f := wasapiFloatFormat(48000, 2)
	want := wasapiWaveFormat{FormatTag: 3, Channels: 2, SamplesPerSec: 48000, AvgBytesPerSec: 384000, BlockAlign: 8, BitsPerSample: 32}
	if f != want {
		t.Fatalf("got %+v, want %+v", f, want)
	}
	// WAVEFORMATEX field offsets as Windows reads them (packed, 18 bytes).
	offsets := []struct {
		name      string
		got, want uintptr
	}{
		{"nChannels", unsafe.Offsetof(f.Channels), 2},
		{"nSamplesPerSec", unsafe.Offsetof(f.SamplesPerSec), 4},
		{"nAvgBytesPerSec", unsafe.Offsetof(f.AvgBytesPerSec), 8},
		{"nBlockAlign", unsafe.Offsetof(f.BlockAlign), 12},
		{"wBitsPerSample", unsafe.Offsetof(f.BitsPerSample), 14},
		{"cbSize", unsafe.Offsetof(f.CbSize), 16},
	}
	for _, o := range offsets {
		if o.got != o.want {
			t.Errorf("%s at %d, want %d", o.name, o.got, o.want)
		}
	}
}

func TestWasapiActivationBlobLayout(t *testing.T) {
	params, pv := wasapiActivationBlob(4242)
	if *params != (wasapiActivationParams{ActivationType: 1, TargetProcessID: 4242, LoopbackMode: 0}) {
		t.Fatalf("params = %+v", *params)
	}
	if unsafe.Sizeof(*params) != 12 {
		t.Errorf("AUDIOCLIENT_ACTIVATION_PARAMS is %d bytes, want 12", unsafe.Sizeof(*params))
	}
	if pv.vt != 65 || pv.blobSize != 12 || pv.blobData != (*byte)(unsafe.Pointer(params)) {
		t.Errorf("propvariant = %+v", *pv)
	}
	if unsafe.Sizeof(uintptr(0)) == 8 {
		if unsafe.Sizeof(*pv) != 24 || unsafe.Offsetof(pv.blobSize) != 8 || unsafe.Offsetof(pv.blobData) != 16 {
			t.Errorf("PROPVARIANT layout: size %d, cbSize at %d, pBlobData at %d; want 24, 8, 16",
				unsafe.Sizeof(*pv), unsafe.Offsetof(pv.blobSize), unsafe.Offsetof(pv.blobData))
		}
	}
}

func TestWasapiDownmix(t *testing.T) {
	tests := []struct {
		name     string
		in       []float32
		channels int
		want     []float32
	}{
		{"stereo", []float32{1, 0, -0.5, -0.5, 0.25, 0.75}, 2, []float32{0.5, -0.5, 0.5}},
		{"mono", []float32{0.1, 0.2}, 1, []float32{0.1, 0.2}},
		{"partial frame dropped", []float32{1, 1, 1}, 2, []float32{1}},
		{"empty", nil, 2, []float32{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := wasapiDownmix(tt.in, tt.channels)
			if len(got) != len(tt.want) {
				t.Fatalf("got %v, want %v", got, tt.want)
			}
			for i := range got {
				if got[i] != tt.want[i] {
					t.Fatalf("got %v, want %v", got, tt.want)
				}
			}
		})
	}
}

func TestWasapiSupported(t *testing.T) {
	for build, want := range map[uint32]bool{19045: false, 20347: false, 20348: true, 22631: true, 26100: true} {
		if got := wasapiSupported(build); got != want {
			t.Errorf("build %d: got %v, want %v", build, got, want)
		}
	}
}

func TestWasapiError(t *testing.T) {
	tests := []struct {
		name string
		hr   uint32
		is   error // nil: no sentinel expected
		ok   bool
	}{
		{"S_OK", 0, nil, true},
		{"S_FALSE", 1, nil, true},
		{"AUDCLNT_S_BUFFER_EMPTY", 0x08890001, nil, true},
		{"E_ACCESSDENIED", 0x80070005, ErrPermission, false},
		{"E_NOTIMPL", 0x80004001, ErrUnsupported, false},
		{"AUDCLNT_E_DEVICE_INVALIDATED", 0x88890004, nil, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := wasapiError("op", tt.hr)
			if (err == nil) != tt.ok {
				t.Fatalf("err = %v, want ok=%v", err, tt.ok)
			}
			if tt.is != nil && !errors.Is(err, tt.is) {
				t.Fatalf("err = %v, want it to wrap %v", err, tt.is)
			}
			if tt.is == nil && err != nil && (errors.Is(err, ErrPermission) || errors.Is(err, ErrUnsupported) || errors.Is(err, ErrNoProcess)) {
				t.Fatalf("err = %v wraps a sentinel it shouldn't", err)
			}
		})
	}
}
