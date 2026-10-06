package update

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

// The real unpack (ditto) and swap of a running bundle, from an update zip built the way release-mac builds it.
func TestMacInstallerSwapsRunningBundle(t *testing.T) {
	dir := t.TempDir()
	current := filepath.Join(dir, "Applications", "SpotifyCustom.app")
	writeBundle(t, current, "old")

	src := filepath.Join(dir, "build", "SpotifyCustom.app")
	writeBundle(t, src, "new")
	zip := filepath.Join(dir, "SpotifyCustom-mac.zip")
	if out, err := exec.Command("ditto", "-c", "-k", "--keepParent", src, zip).CombinedOutput(); err != nil {
		t.Fatalf("ditto: %v %s", err, out)
	}

	var relaunched string
	m := macInstaller{
		executable: func() (string, error) { return filepath.Join(current, "Contents", "MacOS", "SpotifyCustom"), nil },
		relaunch:   func(b string) error { relaunched = b; return nil },
	}
	if err := m.Check(); err != nil {
		t.Fatalf("Check: %v", err)
	}
	if err := m.Install(context.Background(), zip); err != nil {
		t.Fatal(err)
	}
	if got := readMarker(t, current); got != "new" {
		t.Errorf("bundle = %q, want new", got)
	}
	if want, _ := filepath.EvalSymlinks(current); relaunched != want {
		t.Errorf("relaunched %q, want %q", relaunched, want)
	}
	entries, _ := os.ReadDir(filepath.Dir(current))
	if len(entries) != 1 {
		t.Errorf("leftovers next to the app: %v", entries)
	}
}

func TestMacInstallerCheck(t *testing.T) {
	dir := t.TempDir()
	tests := []struct {
		name   string
		bundle string // created; "" = a bare executable
		want   error
	}{
		{"not in a bundle", "", ErrManual},
		{"translocated", filepath.Join(dir, "AppTranslocation", "ABC", "d", "SpotifyCustom.app"), ErrManual},
		{"writable folder", filepath.Join(dir, "SpotifyCustom.app"), nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			exe := filepath.Join(dir, "spotifycustom")
			if tt.bundle == "" {
				if err := os.WriteFile(exe, nil, 0o755); err != nil {
					t.Fatal(err)
				}
			} else {
				writeBundle(t, tt.bundle, "x")
				exe = filepath.Join(tt.bundle, "Contents", "MacOS", "SpotifyCustom")
			}
			m := macInstaller{executable: func() (string, error) { return exe, nil }}
			if err := m.Check(); err != tt.want {
				t.Errorf("Check = %v, want %v", err, tt.want)
			}
		})
	}
}
