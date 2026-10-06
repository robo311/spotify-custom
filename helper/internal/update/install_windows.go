package update

import (
	"context"
	"fmt"
	"os/exec"
	"syscall"
)

// NewInstaller returns the Windows installer: it runs the downloaded setup silently. Setup closes this
// helper if it is still running, installs into the user's folder and starts the new version
// (packaging/windows/SpotifyCustom.iss).
func NewInstaller() Installer { return winInstaller{} }

type winInstaller struct{}

// Check: setup installs per user without admin rights, so any copy can update itself.
func (winInstaller) Check() error { return nil }

const (
	detachedProcess       = 0x00000008
	createNewProcessGroup = 0x00000200
)

func (winInstaller) Install(_ context.Context, pkg string) error {
	// Not tied to ctx: setup must outlive this process, which quits right after starting it.
	cmd := exec.Command(pkg, "/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART", "/CLOSEAPPLICATIONS")
	cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: detachedProcess | createNewProcessGroup}
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start setup: %w", err)
	}
	return cmd.Process.Release()
}
