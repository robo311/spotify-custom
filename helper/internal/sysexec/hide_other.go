//go:build !windows

package sysexec

import "os/exec"

func hide(*exec.Cmd) {}
