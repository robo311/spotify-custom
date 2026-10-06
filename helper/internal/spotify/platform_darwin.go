package spotify

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"syscall"
	"time"

	"spotifycustom/internal/sysexec"
)

// bundleID identifies the Spotify app to AppleScript independent of its install path.
const bundleID = "com.spotify.client"

type darwinPlatform struct{}

// NewPlatform returns the macOS implementation.
func NewPlatform() Platform { return darwinPlatform{} }

func (darwinPlatform) Locate() (Install, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return Install{}, fmt.Errorf("locate spotify: %w", err)
	}
	return locateMac(home, fileExists)
}

func (darwinPlatform) MainProcess() (Process, bool, error) {
	out, err := run("ps", "-axo", "pid=,etime=,comm=")
	if err != nil {
		return Process{}, false, err
	}
	return findMacMain(out)
}

func (darwinPlatform) Launch(inst Install, port int) error {
	// `open` detaches Spotify from us, so it outlives the helper like a normally opened app.
	_, err := run("open", "-a", inst.Path, "--args", "--remote-debugging-port="+strconv.Itoa(port))
	return err
}

func (darwinPlatform) RequestQuit(Install, Process) error {
	_, err := run("osascript", "-e", `tell application id "`+bundleID+`" to quit`)
	return err
}

func (darwinPlatform) Kill(p Process) error {
	if err := syscall.Kill(p.PID, syscall.SIGKILL); err != nil {
		return fmt.Errorf("kill %d: %w", p.PID, err)
	}
	return nil
}

func (darwinPlatform) Focus(inst Install) error {
	_, err := run("open", "-a", inst.Path)
	return err
}

func run(name string, args ...string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	out, err := sysexec.Command(ctx, name, args...).Output()
	if err != nil {
		return "", fmt.Errorf("%s: %w", name, err)
	}
	return string(out), nil
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
