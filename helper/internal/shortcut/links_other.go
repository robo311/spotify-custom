//go:build !windows

package shortcut

// Supported: only Windows shortcuts can be re-pointed.
const Supported = false

type noLinks struct{}

// NewLinks finds nothing outside Windows.
func NewLinks() Links { return noLinks{} }

func (noLinks) Find() ([]Link, error)            { return nil, nil }
func (noLinks) Retarget(_, _, _, _ string) error { return nil }
