// Package autostart registers the helper to start at login (LaunchAgent on macOS, the per-user Run
// key on Windows). The registered command passes --login so the helper knows why it started.
package autostart

// LoginFlag is appended to the registered command line.
const LoginFlag = "--login"

// label identifies our registration (LaunchAgent label / Run value name).
const label = "com.spotifycustom.helper"
