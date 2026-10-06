package audio

/*
#cgo CFLAGS: -fobjc-arc -mmacosx-version-min=11.0
#cgo LDFLAGS: -framework CoreAudio -framework Foundation
#include <stdlib.h>
#include "capture_darwin.h"
*/
import "C"

import (
	"fmt"
	"sync"
	"time"
	"unsafe"
)

const drainInterval = 10 * time.Millisecond

type darwinCapturer struct{}

// NewCapturer returns the macOS process-tap capturer (macOS 14.2+; ErrUnsupported on older systems).
func NewCapturer() Capturer { return darwinCapturer{} }

type darwinStream struct {
	tap       *C.sc_tap
	stop      chan struct{}
	done      chan struct{}
	closeOnce sync.Once
}

func (darwinCapturer) Start(target Target, onSamples func([]float32)) (Stream, error) {
	bundle := C.CString(target.BundleID)
	defer C.free(unsafe.Pointer(bundle))
	var tap *C.sc_tap
	var status C.int32_t
	var step [64]C.char
	switch C.sc_tap_start(bundle, C.int(target.PID), &tap, &status, &step[0], C.int(len(step))) {
	case C.SC_TAP_OK:
	case C.SC_TAP_UNSUPPORTED:
		return nil, fmt.Errorf("process taps need macOS 14.2 or later: %w", ErrUnsupported)
	case C.SC_TAP_NO_PROCESS:
		return nil, ErrNoProcess
	default:
		return nil, fmt.Errorf("macOS audio tap: %s: %s", C.GoString(&step[0]), osStatus(int32(status)))
	}
	s := &darwinStream{tap: tap, stop: make(chan struct{}), done: make(chan struct{})}
	go s.drain(onSamples)
	return s, nil
}

func (s *darwinStream) drain(onSamples func([]float32)) {
	defer close(s.done)
	buf := make([]float32, 1<<14)
	tick := time.NewTicker(drainInterval)
	defer tick.Stop()
	for {
		select {
		case <-s.stop:
			return
		case <-tick.C:
		}
		if n := int(C.sc_tap_read(s.tap, (*C.float)(unsafe.Pointer(&buf[0])), C.int(len(buf)))); n > 0 {
			onSamples(buf[:n])
		}
	}
}

func (s *darwinStream) SampleRate() int { return int(C.sc_tap_sample_rate(s.tap)) }
func (s *darwinStream) LatencyMs() int  { return int(C.sc_tap_latency_ms(s.tap)) }

func (s *darwinStream) Close() error {
	s.closeOnce.Do(func() {
		close(s.stop)
		<-s.done
		C.sc_tap_stop(s.tap)
	})
	return nil
}

// osStatus shows Core Audio's four-char codes readably ('who?' etc.), else the number.
func osStatus(v int32) string {
	b := []byte{byte(v >> 24), byte(v >> 16), byte(v >> 8), byte(v)}
	for _, c := range b {
		if c < 0x20 || c > 0x7e {
			return fmt.Sprintf("OSStatus %d", v)
		}
	}
	return fmt.Sprintf("OSStatus '%s'", b)
}
