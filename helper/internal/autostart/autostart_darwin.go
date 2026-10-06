package autostart

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"

	"spotifycustom/internal/store"
)

func plistPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("autostart: %w", err)
	}
	return filepath.Join(home, "Library", "LaunchAgents", label+".plist"), nil
}

// Enabled reports whether the LaunchAgent exists.
func Enabled() bool {
	p, err := plistPath()
	if err != nil {
		return false
	}
	_, err = os.Stat(p)
	return err == nil
}

// Enable writes the LaunchAgent for exe (takes effect at next login). Re-enabling refreshes the path,
// which heals the registration after the app was moved.
func Enable(exe string) error {
	p, err := plistPath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		return fmt.Errorf("autostart: %w", err)
	}
	return store.WriteFileAtomic(p, launchAgentPlist(exe))
}

// Disable removes the LaunchAgent.
func Disable() error {
	p, err := plistPath()
	if err != nil {
		return err
	}
	if err := os.Remove(p); err != nil && !errors.Is(err, fs.ErrNotExist) {
		return fmt.Errorf("autostart: %w", err)
	}
	return nil
}
