//go:build windows

// Windows capture: WASAPI process loopback of Spotify's process tree (Windows 10 build 20348+ / Windows 11).
// Older Windows reports ErrUnsupported; we never fall back to capturing all system audio.
package audio

import (
	"errors"
	"fmt"
	"runtime"
	"sync"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

const (
	wasapiSampleRate = 48000
	wasapiChannels   = 2

	streamFlagsLoopback          = 0x00020000
	streamFlagsEventCallback     = 0x00040000
	streamFlagsSrcDefaultQuality = 0x08000000
	streamFlagsAutoConvertPCM    = 0x80000000
	bufferFlagsSilent            = 0x2
	// wasapiBufferDuration (100 ns units, 200 ms) is headroom in case draining is delayed; it adds no
	// latency because every event drains the buffer.
	wasapiBufferDuration = 2_000_000
	// wasapiWaitMs bounds each wait: process loopback only signals while Spotify renders, and Close must stay prompt.
	wasapiWaitMs      = 250
	wasapiStillActive = 259 // STILL_ACTIVE exit code
)

type wasapiCapturer struct{}

// NewCapturer returns the Windows process-loopback capturer.
func NewCapturer() Capturer { return wasapiCapturer{} }

func (wasapiCapturer) Start(target Target, onSamples func([]float32)) (Stream, error) {
	if v := windows.RtlGetVersion(); !wasapiSupported(v.BuildNumber) {
		return nil, fmt.Errorf("%w: Windows build %d, process loopback needs %d or newer", ErrUnsupported, v.BuildNumber, wasapiMinBuild)
	}
	if err := wasapiCheckProcess(target.PID); err != nil {
		return nil, err
	}
	stop, err := windows.CreateEvent(nil, 1, 0, nil)
	if err != nil {
		return nil, fmt.Errorf("create stop event: %w", err)
	}
	s := &wasapiStream{stop: stop, done: make(chan struct{})}
	ready := make(chan error, 1)
	go s.run(uint32(target.PID), onSamples, ready)
	if err := <-ready; err != nil {
		<-s.done
		_ = windows.CloseHandle(stop)
		return nil, err
	}
	return s, nil
}

// wasapiCheckProcess turns a missing or exited Spotify into ErrNoProcess before COM gives a vaguer error.
func wasapiCheckProcess(pid int) error {
	if pid <= 0 {
		return fmt.Errorf("%w (pid %d)", ErrNoProcess, pid)
	}
	h, err := windows.OpenProcess(windows.PROCESS_QUERY_LIMITED_INFORMATION, false, uint32(pid))
	if errors.Is(err, windows.ERROR_INVALID_PARAMETER) {
		return fmt.Errorf("%w (pid %d)", ErrNoProcess, pid)
	}
	if err != nil {
		return nil // e.g. access denied: the process exists; let activation decide
	}
	defer windows.CloseHandle(h)
	var code uint32
	if windows.GetExitCodeProcess(h, &code) == nil && code != wasapiStillActive {
		return fmt.Errorf("%w (pid %d exited)", ErrNoProcess, pid)
	}
	return nil
}

type wasapiStream struct {
	stop      windows.Handle
	done      chan struct{}
	latencyMs int   // set before Start returns
	err       error // why capture ended early; read after done
	closeOnce sync.Once
}

func (s *wasapiStream) SampleRate() int { return wasapiSampleRate }
func (s *wasapiStream) LatencyMs() int  { return s.latencyMs }

func (s *wasapiStream) Close() error {
	s.closeOnce.Do(func() {
		_ = windows.SetEvent(s.stop)
		<-s.done
		_ = windows.CloseHandle(s.stop)
	})
	return s.err
}

// run owns every COM object on one locked MTA thread: set up, report on ready, pump until stopped, tear down.
func (s *wasapiStream) run(pid uint32, onSamples func([]float32), ready chan<- error) {
	defer close(s.done)
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	// S_FALSE (already initialised on this thread) still needs the matching CoUninitialize.
	if err := windows.CoInitializeEx(0, windows.COINIT_MULTITHREADED); err != nil && err != syscall.Errno(1) {
		ready <- fmt.Errorf("initialise COM: %w", err)
		return
	}
	defer windows.CoUninitialize()

	s.latencyMs = renderLatencyMs()
	client, err := activateProcessLoopback(pid)
	if err != nil {
		ready <- err
		return
	}
	defer comRelease(client)

	format := wasapiFloatFormat(wasapiSampleRate, wasapiChannels)
	flags := uint32(streamFlagsLoopback | streamFlagsEventCallback | streamFlagsAutoConvertPCM | streamFlagsSrcDefaultQuality)
	if err := client.initialize(flags, wasapiBufferDuration, &format); err != nil {
		ready <- err
		return
	}
	event, err := windows.CreateEvent(nil, 0, 0, nil)
	if err != nil {
		ready <- fmt.Errorf("create capture event: %w", err)
		return
	}
	defer windows.CloseHandle(event)
	if err := client.setEventHandle(event); err != nil {
		ready <- err
		return
	}
	cc, err := client.captureClient()
	if err != nil {
		ready <- err
		return
	}
	defer comRelease(cc)
	if err := client.start(); err != nil {
		ready <- err
		return
	}
	defer client.stop()
	ready <- nil

	s.err = s.pump(cc, event, onSamples)
}

func (s *wasapiStream) pump(cc *audioCaptureClient, event windows.Handle, onSamples func([]float32)) error {
	handles := []windows.Handle{s.stop, event}
	for {
		ev, err := windows.WaitForMultipleObjects(handles, false, wasapiWaitMs)
		if err != nil {
			return fmt.Errorf("wait for audio: %w", err)
		}
		if ev == windows.WAIT_OBJECT_0 {
			return nil
		}
		if err := wasapiDrain(cc, onSamples); err != nil {
			return err
		}
	}
}

// wasapiDrain hands every queued packet to onSamples as mono, releasing each buffer before the callback runs.
func wasapiDrain(cc *audioCaptureClient, onSamples func([]float32)) error {
	for {
		n, err := cc.nextPacketSize()
		if err != nil || n == 0 {
			return err
		}
		data, frames, flags, err := cc.buffer()
		if err != nil {
			return err
		}
		var mono []float32
		if flags&bufferFlagsSilent != 0 || data == nil {
			mono = make([]float32, frames)
		} else {
			mono = wasapiDownmix(unsafe.Slice((*float32)(unsafe.Pointer(data)), int(frames)*wasapiChannels), wasapiChannels)
		}
		if err := cc.releaseBuffer(frames); err != nil {
			return err
		}
		if len(mono) > 0 {
			onSamples(mono)
		}
	}
}
