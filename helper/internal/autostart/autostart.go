// Package autostart registers the helper to start at login (LaunchAgent on macOS, the per-user Run
// key on Windows). The registered command passes --login so the helper knows why it started.
package autostart

import "strings"

// LoginFlag is appended to the registered command line.
const LoginFlag = "--login"

// label identifies our registration (LaunchAgent label / Run value name).
const label = "com.spotifycustom.helper"

// Temporary reports whether exe runs from a place that disappears (a mounted disk image, or a copy macOS
// translocated out of Downloads); registering it would break start-at-login at the next login.
func Temporary(exe string) bool {
	return strings.HasPrefix(exe, "/Volumes/") || strings.Contains(exe, "/AppTranslocation/")
}
