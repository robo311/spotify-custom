package update

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// BundleOf returns the .app bundle containing a macOS executable (…/X.app/Contents/MacOS/X), or "".
func BundleOf(exe string) string {
	macos := filepath.Dir(exe)
	contents := filepath.Dir(macos)
	bundle := filepath.Dir(contents)
	if filepath.Base(macos) != "MacOS" || filepath.Base(contents) != "Contents" || !strings.HasSuffix(bundle, ".app") {
		return ""
	}
	return bundle
}

// SwapBundle replaces the bundle at current with fresh, which must be on the same volume (renames only).
// The running process keeps working: macOS has its executable mapped already. If the swap fails half
// way, the original bundle is put back.
func SwapBundle(current, fresh string) error {
	if _, err := os.Stat(filepath.Join(fresh, "Contents")); err != nil {
		return fmt.Errorf("new app: %w", err)
	}
	backup := current + ".old"
	_ = os.RemoveAll(backup) // left over from an interrupted update
	if err := os.Rename(current, backup); err != nil {
		return fmt.Errorf("move old app aside: %w", err)
	}
	if err := os.Rename(fresh, current); err != nil {
		return errors.Join(fmt.Errorf("put new app in place: %w", err), os.Rename(backup, current))
	}
	_ = os.RemoveAll(backup) // the update is in place either way; a leftover goes with the next one
	return nil
}
