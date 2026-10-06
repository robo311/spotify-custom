package update

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"

	"spotifycustom/internal/sysexec"
)

// NewInstaller returns the macOS installer: it swaps the running .app bundle for the one in the update zip
// and reopens the app once this process has exited.
func NewInstaller() Installer {
	return macInstaller{executable: os.Executable, relaunch: relaunchAfterExit}
}

type macInstaller struct {
	executable func() (string, error)
	relaunch   func(bundle string) error
}

func (m macInstaller) bundle() (string, error) {
	exe, err := m.executable()
	if err != nil {
		return "", err
	}
	if exe, err = filepath.EvalSymlinks(exe); err != nil {
		return "", err
	}
	return BundleOf(exe), nil
}

func (m macInstaller) Check() error {
	bundle, err := m.bundle()
	if err != nil || bundle == "" {
		return ErrManual
	}
	// Gatekeeper runs quarantined apps opened straight from Downloads from a read-only copy.
	if strings.Contains(bundle, "/AppTranslocation/") {
		return ErrManual
	}
	probe, err := os.CreateTemp(filepath.Dir(bundle), ".spotifycustom-write-test-")
	if err != nil {
		return ErrManual
	}
	probe.Close()
	_ = os.Remove(probe.Name())
	return nil
}

func (m macInstaller) Install(ctx context.Context, pkg string) error {
	bundle, err := m.bundle()
	if err != nil || bundle == "" {
		return fmt.Errorf("find running app: %w", ErrManual)
	}
	// Unpack next to the running app so the swap is a rename on one volume.
	staging, err := os.MkdirTemp(filepath.Dir(bundle), ".SpotifyCustom-update-")
	if err != nil {
		return fmt.Errorf("prepare update: %w", err)
	}
	defer os.RemoveAll(staging)
	// ditto keeps the bundle's symlinks, permissions and code signature intact.
	if out, err := sysexec.Command(ctx, "ditto", "-x", "-k", pkg, staging).CombinedOutput(); err != nil {
		return fmt.Errorf("unpack update: %w: %s", err, out)
	}
	apps, _ := filepath.Glob(filepath.Join(staging, "*.app"))
	if len(apps) != 1 {
		return fmt.Errorf("unpack update: expected one app in the package, found %d", len(apps))
	}
	if err := SwapBundle(bundle, apps[0]); err != nil {
		return err
	}
	_ = os.Remove(pkg)
	return m.relaunch(bundle)
}

// relaunchAfterExit starts a detached shell that waits for this process to end, then opens the app again
// (the single-instance lock would turn a second copy away while we're still running).
func relaunchAfterExit(bundle string) error {
	script := `while kill -0 "$1" 2>/dev/null; do sleep 0.2; done; exec /usr/bin/open "$2"`
	cmd := sysexec.Command(context.Background(), "/bin/sh", "-c", script, "sh", strconv.Itoa(os.Getpid()), bundle)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("schedule restart: %w", err)
	}
	return cmd.Process.Release()
}
