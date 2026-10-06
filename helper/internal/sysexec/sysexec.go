// Package sysexec runs short-lived system tools (ps, osascript, taskkill, …) without flashing a
// console window on Windows, where the helper is a GUI-subsystem app.
package sysexec

import (
	"context"
	"os/exec"
)

// Command builds a command for a system tool; see hide for the per-OS window handling.
func Command(ctx context.Context, name string, args ...string) *exec.Cmd {
	cmd := exec.CommandContext(ctx, name, args...)
	hide(cmd)
	return cmd
}
