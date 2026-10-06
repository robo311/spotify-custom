package sysexec

import (
	"os/exec"
	"syscall"
)

// createNoWindow stops console tools from opening a visible console for a GUI parent.
const createNoWindow = 0x08000000

func hide(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: createNoWindow}
}
