//go:build !darwin && !windows

package audio

type otherCapturer struct{}

// NewCapturer returns a capturer that always reports ErrUnsupported.
func NewCapturer() Capturer { return otherCapturer{} }

func (otherCapturer) Start(Target, func([]float32)) (Stream, error) { return nil, ErrUnsupported }
