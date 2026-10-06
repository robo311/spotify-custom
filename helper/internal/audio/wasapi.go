// WASAPI process-loopback pieces that don't need Windows to run, so they're tested on any OS: the capture
// format, the activation parameter layouts, downmixing, the OS version gate and HRESULT → error mapping.
// capture_windows.go and wasapi_com_windows.go do the COM work.
package audio

import (
	"fmt"
	"unsafe"
)

const (
	// wasapiMinBuild is the first Windows build with process loopback (Windows Server 2022 / Windows 11).
	wasapiMinBuild = 20348

	wasapiFormatIEEEFloat = 3 // WAVE_FORMAT_IEEE_FLOAT
	wasapiVTBlob          = 65

	wasapiActivationProcessLoopback = 1 // AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK
	wasapiLoopbackIncludeTree       = 0 // PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE

	hrEAccessDenied = 0x80070005
	hrENotImpl      = 0x80004001
)

// wasapiWaveFormat is WAVEFORMATEX. Go pads it to 20 bytes; Windows reads 18 (cbSize = 0 means no extra bytes).
type wasapiWaveFormat struct {
	FormatTag      uint16
	Channels       uint16
	SamplesPerSec  uint32
	AvgBytesPerSec uint32
	BlockAlign     uint16
	BitsPerSample  uint16
	CbSize         uint16
}

// wasapiFloatFormat is interleaved 32-bit float PCM. Process loopback has no mix format to ask for, so we
// name one and let AUTOCONVERTPCM convert to it.
func wasapiFloatFormat(rate, channels int) wasapiWaveFormat {
	block := channels * 4
	return wasapiWaveFormat{
		FormatTag:      wasapiFormatIEEEFloat,
		Channels:       uint16(channels),
		SamplesPerSec:  uint32(rate),
		AvgBytesPerSec: uint32(rate * block),
		BlockAlign:     uint16(block),
		BitsPerSample:  32,
	}
}

// wasapiActivationParams is AUDIOCLIENT_ACTIVATION_PARAMS with its union holding
// AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS (12 bytes).
type wasapiActivationParams struct {
	ActivationType  uint32
	TargetProcessID uint32
	LoopbackMode    uint32
}

// wasapiPropVariant is a PROPVARIANT holding a BLOB. Natural alignment gives the Windows layout on both
// 64-bit (cbSize at 8, pointer at 16, 24 bytes) and 32-bit (pointer at 12, 16 bytes).
type wasapiPropVariant struct {
	vt       uint16
	_        [3]uint16
	blobSize uint32
	blobData *byte
}

// wasapiActivationBlob builds the activation parameters for capturing pid and its child processes. Both
// are heap-allocated: activation is asynchronous, so they must not live on a goroutine stack that can move.
func wasapiActivationBlob(pid uint32) (*wasapiActivationParams, *wasapiPropVariant) {
	params := &wasapiActivationParams{
		ActivationType:  wasapiActivationProcessLoopback,
		TargetProcessID: pid,
		LoopbackMode:    wasapiLoopbackIncludeTree,
	}
	pv := &wasapiPropVariant{
		vt:       wasapiVTBlob,
		blobSize: uint32(unsafe.Sizeof(*params)),
		blobData: (*byte)(unsafe.Pointer(params)),
	}
	return params, pv
}

// wasapiDownmix averages interleaved frames into a new mono slice (callers may keep it).
func wasapiDownmix(interleaved []float32, channels int) []float32 {
	frames := len(interleaved) / channels
	mono := make([]float32, frames)
	scale := 1 / float32(channels)
	for i := range mono {
		var sum float32
		for _, s := range interleaved[i*channels : (i+1)*channels] {
			sum += s
		}
		mono[i] = sum * scale
	}
	return mono
}

// wasapiSupported reports whether a Windows build has process loopback.
func wasapiSupported(build uint32) bool { return build >= wasapiMinBuild }

// wasapiError maps a failed HRESULT to an error (nil for success codes, which include S_FALSE and
// AUDCLNT_S_BUFFER_EMPTY). Errors the service understands wrap the package's sentinels.
func wasapiError(op string, hr uint32) error {
	if int32(hr) >= 0 {
		return nil
	}
	switch hr {
	case hrEAccessDenied:
		return fmt.Errorf("%s: %w (HRESULT 0x%08X)", op, ErrPermission, hr)
	case hrENotImpl:
		return fmt.Errorf("%s: %w (HRESULT 0x%08X)", op, ErrUnsupported, hr)
	}
	return fmt.Errorf("%s: HRESULT 0x%08X", op, hr)
}
