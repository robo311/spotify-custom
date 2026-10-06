//go:build !darwin && !windows

package update

import "context"

// NewInstaller: other systems install updates by hand.
func NewInstaller() Installer { return manualInstaller{} }

type manualInstaller struct{}

func (manualInstaller) Check() error                          { return ErrManual }
func (manualInstaller) Install(context.Context, string) error { return ErrManual }
