//go:build windows

// COM plumbing for WASAPI process loopback without cgo: interface vtables called through syscall.SyscallN,
// and a Go-implemented IActivateAudioInterfaceCompletionHandler for ActivateAudioInterfaceAsync.
// 64-bit only (REFERENCE_TIME arguments are passed in one register); the release targets windows/amd64.
package audio

import (
	"errors"
	"fmt"
	"runtime"
	"sync"
	"sync/atomic"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	modMmdevapi                     = windows.NewLazySystemDLL("Mmdevapi.dll")
	procActivateAudioInterfaceAsync = modMmdevapi.NewProc("ActivateAudioInterfaceAsync")
	modOle32                        = windows.NewLazySystemDLL("ole32.dll")
	procCoCreateInstance            = modOle32.NewProc("CoCreateInstance")
)

func comGUID(d1 uint32, d2, d3 uint16, d4 [8]byte) windows.GUID {
	return windows.GUID{Data1: d1, Data2: d2, Data3: d3, Data4: d4}
}

var (
	iidIUnknown             = comGUID(0x00000000, 0x0000, 0x0000, [8]byte{0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46})
	iidIAgileObject         = comGUID(0x94EA2B94, 0xE9CC, 0x49E0, [8]byte{0xC0, 0xFF, 0xEE, 0x64, 0xCA, 0x8F, 0x5B, 0x90})
	iidCompletionHandler    = comGUID(0x41D949AB, 0x9862, 0x444A, [8]byte{0x80, 0xF6, 0xC2, 0x61, 0x33, 0x4D, 0xA5, 0xEB})
	iidIAudioClient         = comGUID(0x1CB9AD4C, 0xDBFA, 0x4C32, [8]byte{0xB1, 0x78, 0xC2, 0xF5, 0x68, 0xA7, 0x03, 0xB2})
	iidIAudioCaptureClient  = comGUID(0xC8ADBD64, 0xE71E, 0x48A0, [8]byte{0xA4, 0xDE, 0x18, 0x5C, 0x39, 0x5C, 0xD3, 0x17})
	clsidMMDeviceEnumerator = comGUID(0xBCDE0395, 0xE52F, 0x467C, [8]byte{0x8E, 0x3D, 0xC4, 0x57, 0x92, 0x91, 0x69, 0x2E})
	iidIMMDeviceEnumerator  = comGUID(0xA95664D2, 0x9614, 0x4F35, [8]byte{0xA7, 0x46, 0xDE, 0x8D, 0xB6, 0x36, 0x17, 0xE6})
)

const (
	virtualProcessLoopbackDevice = `VAD\Process_Loopback` // VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK
	clsctxAll                    = 0x17
	eRender, eConsole            = 0, 0
	hrENoInterface               = 0x80004002
	activateTimeoutMs            = 5000
)

// ---- interfaces we call: the object's first word points at its vtable, IUnknown methods first ----

type comUnknownVtbl struct{ QueryInterface, AddRef, Release uintptr }

type comObject struct{ vtbl *comUnknownVtbl }

// comRelease releases any COM interface pointer (nil is fine).
func comRelease[T any](p *T) {
	if p == nil {
		return
	}
	obj := (*comObject)(unsafe.Pointer(p))
	syscall.SyscallN(obj.vtbl.Release, uintptr(unsafe.Pointer(p)))
}

type audioClient struct{ vtbl *audioClientVtbl }

type audioClientVtbl struct {
	comUnknownVtbl
	Initialize       uintptr
	_                uintptr // GetBufferSize
	GetStreamLatency uintptr
	_                [2]uintptr // GetCurrentPadding, IsFormatSupported
	GetMixFormat     uintptr
	GetDevicePeriod  uintptr
	Start            uintptr
	Stop             uintptr
	_                uintptr // Reset
	SetEventHandle   uintptr
	GetService       uintptr
}

func (c *audioClient) initialize(flags uint32, bufferDuration int64, format *wasapiWaveFormat) error {
	r, _, _ := syscall.SyscallN(c.vtbl.Initialize, uintptr(unsafe.Pointer(c)),
		0, // AUDCLNT_SHAREMODE_SHARED
		uintptr(flags), uintptr(bufferDuration), 0, uintptr(unsafe.Pointer(format)), 0)
	return wasapiError("IAudioClient.Initialize", uint32(r))
}

func (c *audioClient) setEventHandle(h windows.Handle) error {
	r, _, _ := syscall.SyscallN(c.vtbl.SetEventHandle, uintptr(unsafe.Pointer(c)), uintptr(h))
	return wasapiError("IAudioClient.SetEventHandle", uint32(r))
}

func (c *audioClient) captureClient() (*audioCaptureClient, error) {
	var cc *audioCaptureClient
	r, _, _ := syscall.SyscallN(c.vtbl.GetService, uintptr(unsafe.Pointer(c)),
		uintptr(unsafe.Pointer(&iidIAudioCaptureClient)), uintptr(unsafe.Pointer(&cc)))
	if err := wasapiError("IAudioClient.GetService", uint32(r)); err != nil {
		return nil, err
	}
	return cc, nil
}

func (c *audioClient) start() error {
	r, _, _ := syscall.SyscallN(c.vtbl.Start, uintptr(unsafe.Pointer(c)))
	return wasapiError("IAudioClient.Start", uint32(r))
}

func (c *audioClient) stop() {
	syscall.SyscallN(c.vtbl.Stop, uintptr(unsafe.Pointer(c)))
}

type audioCaptureClient struct{ vtbl *audioCaptureClientVtbl }

type audioCaptureClientVtbl struct {
	comUnknownVtbl
	GetBuffer, ReleaseBuffer, GetNextPacketSize uintptr
}

func (cc *audioCaptureClient) nextPacketSize() (uint32, error) {
	var n uint32
	r, _, _ := syscall.SyscallN(cc.vtbl.GetNextPacketSize, uintptr(unsafe.Pointer(cc)), uintptr(unsafe.Pointer(&n)))
	return n, wasapiError("IAudioCaptureClient.GetNextPacketSize", uint32(r))
}

func (cc *audioCaptureClient) buffer() (data *byte, frames, flags uint32, err error) {
	r, _, _ := syscall.SyscallN(cc.vtbl.GetBuffer, uintptr(unsafe.Pointer(cc)),
		uintptr(unsafe.Pointer(&data)), uintptr(unsafe.Pointer(&frames)), uintptr(unsafe.Pointer(&flags)), 0, 0)
	return data, frames, flags, wasapiError("IAudioCaptureClient.GetBuffer", uint32(r))
}

func (cc *audioCaptureClient) releaseBuffer(frames uint32) error {
	r, _, _ := syscall.SyscallN(cc.vtbl.ReleaseBuffer, uintptr(unsafe.Pointer(cc)), uintptr(frames))
	return wasapiError("IAudioCaptureClient.ReleaseBuffer", uint32(r))
}

type activateOperation struct{ vtbl *activateOperationVtbl }

type activateOperationVtbl struct {
	comUnknownVtbl
	GetActivateResult uintptr
}

type deviceEnumerator struct{ vtbl *deviceEnumeratorVtbl }

type deviceEnumeratorVtbl struct {
	comUnknownVtbl
	_                       uintptr // EnumAudioEndpoints
	GetDefaultAudioEndpoint uintptr // later methods unused
}

type mmDevice struct{ vtbl *mmDeviceVtbl }

type mmDeviceVtbl struct {
	comUnknownVtbl
	Activate uintptr // later methods unused
}

// ---- the completion handler we implement ----

type completionHandler struct {
	vtbl *completionHandlerVtbl
	refs atomic.Int32
	done windows.Handle // signalled by ActivateCompleted
}

type completionHandlerVtbl struct {
	comUnknownVtbl
	ActivateCompleted uintptr
}

var (
	handlerVtblOnce sync.Once
	handlerVtbl     *completionHandlerVtbl
	// liveHandlers keeps handlers reachable while COM holds pointers the GC can't see; Release removes them.
	liveHandlers sync.Map
)

func newCompletionHandler() (*completionHandler, error) {
	handlerVtblOnce.Do(func() {
		handlerVtbl = &completionHandlerVtbl{
			comUnknownVtbl: comUnknownVtbl{
				QueryInterface: syscall.NewCallback(handlerQueryInterface),
				AddRef:         syscall.NewCallback(handlerAddRef),
				Release:        syscall.NewCallback(handlerRelease),
			},
			ActivateCompleted: syscall.NewCallback(handlerActivateCompleted),
		}
	})
	done, err := windows.CreateEvent(nil, 1, 0, nil)
	if err != nil {
		return nil, fmt.Errorf("create activation event: %w", err)
	}
	h := &completionHandler{vtbl: handlerVtbl, done: done}
	h.refs.Store(1)
	liveHandlers.Store(h, struct{}{})
	return h, nil
}

// handlerQueryInterface also answers IAgileObject: the call then arrives on a worker thread without marshalling.
func handlerQueryInterface(this *completionHandler, riid *windows.GUID, ppv *uintptr) uintptr {
	if *riid == iidIUnknown || *riid == iidIAgileObject || *riid == iidCompletionHandler {
		this.refs.Add(1)
		*ppv = uintptr(unsafe.Pointer(this))
		return 0
	}
	*ppv = 0
	return hrENoInterface
}

func handlerAddRef(this *completionHandler) uintptr { return uintptr(this.refs.Add(1)) }

func handlerRelease(this *completionHandler) uintptr {
	n := this.refs.Add(-1)
	if n == 0 {
		liveHandlers.Delete(this)
		_ = windows.CloseHandle(this.done)
	}
	return uintptr(n)
}

func handlerActivateCompleted(this *completionHandler, _ uintptr) uintptr {
	_ = windows.SetEvent(this.done)
	return 0
}

// activateProcessLoopback returns an (uninitialised) IAudioClient that captures pid and its child processes.
func activateProcessLoopback(pid uint32) (*audioClient, error) {
	if err := procActivateAudioInterfaceAsync.Find(); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrUnsupported, err)
	}
	path, err := windows.UTF16PtrFromString(virtualProcessLoopbackDevice)
	if err != nil {
		return nil, err
	}
	params, pv := wasapiActivationBlob(pid)
	h, err := newCompletionHandler()
	if err != nil {
		return nil, err
	}
	defer handlerRelease(h)

	var op *activateOperation
	r, _, _ := syscall.SyscallN(procActivateAudioInterfaceAsync.Addr(), uintptr(unsafe.Pointer(path)),
		uintptr(unsafe.Pointer(&iidIAudioClient)), uintptr(unsafe.Pointer(pv)), uintptr(unsafe.Pointer(h)),
		uintptr(unsafe.Pointer(&op)))
	if err := wasapiError("ActivateAudioInterfaceAsync", uint32(r)); err != nil {
		return nil, err
	}
	defer comRelease(op)

	ev, err := windows.WaitForSingleObject(h.done, activateTimeoutMs)
	runtime.KeepAlive(params) // read asynchronously until activation completes
	runtime.KeepAlive(path)
	if err != nil {
		return nil, fmt.Errorf("wait for audio activation: %w", err)
	}
	if ev != windows.WAIT_OBJECT_0 {
		return nil, errors.New("audio activation timed out")
	}

	var activateHR uint32
	var client *audioClient
	r, _, _ = syscall.SyscallN(op.vtbl.GetActivateResult, uintptr(unsafe.Pointer(op)),
		uintptr(unsafe.Pointer(&activateHR)), uintptr(unsafe.Pointer(&client)))
	if err := wasapiError("GetActivateResult", uint32(r)); err != nil {
		return nil, err
	}
	if err := wasapiError("activate process loopback", activateHR); err != nil {
		comRelease(client)
		return nil, err
	}
	if client == nil {
		return nil, errors.New("activate process loopback: no audio client returned")
	}
	return client, nil
}

// renderLatencyMs is the default output device's shared-mode stream latency plus one device period, or 0.
// GetStreamLatency only answers after Initialize, so a render client is initialised (never started) and dropped.
func renderLatencyMs() int {
	var enum *deviceEnumerator
	r, _, _ := syscall.SyscallN(procCoCreateInstance.Addr(), uintptr(unsafe.Pointer(&clsidMMDeviceEnumerator)), 0,
		clsctxAll, uintptr(unsafe.Pointer(&iidIMMDeviceEnumerator)), uintptr(unsafe.Pointer(&enum)))
	if int32(r) < 0 || enum == nil {
		return 0
	}
	defer comRelease(enum)

	var dev *mmDevice
	r, _, _ = syscall.SyscallN(enum.vtbl.GetDefaultAudioEndpoint, uintptr(unsafe.Pointer(enum)), eRender, eConsole,
		uintptr(unsafe.Pointer(&dev)))
	if int32(r) < 0 || dev == nil {
		return 0
	}
	defer comRelease(dev)

	var client *audioClient
	r, _, _ = syscall.SyscallN(dev.vtbl.Activate, uintptr(unsafe.Pointer(dev)), uintptr(unsafe.Pointer(&iidIAudioClient)),
		clsctxAll, 0, uintptr(unsafe.Pointer(&client)))
	if int32(r) < 0 || client == nil {
		return 0
	}
	defer comRelease(client)

	var mix *wasapiWaveFormat
	r, _, _ = syscall.SyscallN(client.vtbl.GetMixFormat, uintptr(unsafe.Pointer(client)), uintptr(unsafe.Pointer(&mix)))
	if int32(r) < 0 || mix == nil {
		return 0
	}
	defer windows.CoTaskMemFree(unsafe.Pointer(mix))
	if client.initialize(0, 0, mix) != nil {
		return 0
	}

	var latency, period, minPeriod int64 // 100 ns units
	r, _, _ = syscall.SyscallN(client.vtbl.GetStreamLatency, uintptr(unsafe.Pointer(client)), uintptr(unsafe.Pointer(&latency)))
	if int32(r) < 0 {
		return 0
	}
	r, _, _ = syscall.SyscallN(client.vtbl.GetDevicePeriod, uintptr(unsafe.Pointer(client)),
		uintptr(unsafe.Pointer(&period)), uintptr(unsafe.Pointer(&minPeriod)))
	if int32(r) < 0 {
		period = 0
	}
	return int((latency + period) / 10_000)
}
