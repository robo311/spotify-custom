package update

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"path/filepath"
)

// ErrChecksum means the downloaded package doesn't match the manifest.
var ErrChecksum = errors.New("downloaded update is damaged (checksum mismatch)")

// maxPackage bounds a download; real packages are ~15 MB.
const maxPackage = 200 << 20

// Download fetches a into dir under the asset's own file name (Windows needs the .exe name to run it) and
// verifies its SHA-256. A package that fails verification is removed.
func Download(ctx context.Context, client *http.Client, a Asset, dir string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, a.URL, nil)
	if err != nil {
		return "", fmt.Errorf("download update: %w", err)
	}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("download update: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("download update: %s", resp.Status)
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("download update: %w", err)
	}
	dst := filepath.Join(dir, path.Base(req.URL.Path))
	f, err := os.Create(dst)
	if err != nil {
		return "", fmt.Errorf("download update: %w", err)
	}
	h := sha256.New()
	_, err = io.Copy(io.MultiWriter(f, h), io.LimitReader(resp.Body, maxPackage))
	if cerr := f.Close(); err == nil {
		err = cerr
	}
	if err == nil && hex.EncodeToString(h.Sum(nil)) != a.SHA256 {
		err = ErrChecksum
	}
	if err != nil {
		_ = os.Remove(dst)
		return "", fmt.Errorf("download update: %w", err)
	}
	return dst, nil
}
