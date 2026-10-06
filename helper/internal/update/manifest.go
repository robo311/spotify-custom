// Package update keeps the helper current. Every GitHub release publishes latest.json (a Manifest); the
// helper reads it on start and every few hours, and on request downloads its platform's package, verifies
// the SHA-256 and hands it to the per-OS Installer, which arranges for the new version to start.
package update

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

// Asset is one platform's package in a release.
type Asset struct {
	URL    string `json:"url"`
	SHA256 string `json:"sha256"`
}

// Manifest is latest.json, written by the release workflow (packaging/manifest.sh).
type Manifest struct {
	Version string           `json:"version"`
	Page    string           `json:"page"` // release page, for manual installs
	Assets  map[string]Asset `json:"assets"`
}

// ParseManifest decodes and validates latest.json.
func ParseManifest(data []byte) (Manifest, error) {
	var m Manifest
	if err := json.Unmarshal(data, &m); err != nil {
		return Manifest{}, fmt.Errorf("read update manifest: %w", err)
	}
	if _, ok := parseVersion(m.Version); !ok {
		return Manifest{}, fmt.Errorf("update manifest: bad version %q", m.Version)
	}
	for key, a := range m.Assets {
		if !strings.HasPrefix(a.URL, "https://") {
			return Manifest{}, fmt.Errorf("update manifest: %s asset is not https", key)
		}
		if b, err := hex.DecodeString(a.SHA256); err != nil || len(b) != 32 {
			return Manifest{}, fmt.Errorf("update manifest: %s asset has a bad sha256", key)
		}
	}
	return m, nil
}

// Asset returns the package for an OS ("darwin", "windows").
func (m Manifest) Asset(goos string) (Asset, bool) {
	a, ok := m.Assets[goos]
	return a, ok
}

// Newer reports whether latest is a newer release than current. Anything that isn't a plain X.Y.Z
// (optionally with a leading v) never counts, so local "dev" builds don't update themselves.
func Newer(latest, current string) bool {
	l, ok1 := parseVersion(latest)
	c, ok2 := parseVersion(current)
	if !ok1 || !ok2 {
		return false
	}
	for i := range l {
		if l[i] != c[i] {
			return l[i] > c[i]
		}
	}
	return false
}

func parseVersion(v string) ([3]int, bool) {
	var out [3]int
	parts := strings.Split(strings.TrimPrefix(v, "v"), ".")
	if len(parts) != 3 {
		return out, false
	}
	for i, p := range parts {
		n, err := strconv.Atoi(p)
		if err != nil || n < 0 {
			return out, false
		}
		out[i] = n
	}
	return out, true
}
