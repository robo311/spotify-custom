package store

import (
	"fmt"
	"os"
	"path/filepath"
)

// AppName names the data folder and is shown to users.
const AppName = "SpotifyCustom"

// DefaultDir is ~/Library/Application Support/SpotifyCustom on macOS and %APPDATA%\SpotifyCustom on Windows.
func DefaultDir() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("locate data folder: %w", err)
	}
	return filepath.Join(base, AppName), nil
}
