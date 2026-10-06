package spotify

import (
	"context"
	"errors"
	"fmt"
	"time"
)

// Process is the running Spotify main process.
type Process struct {
	PID    int
	Uptime time.Duration
}

// Platform is everything OS-specific about controlling Spotify.
type Platform interface {
	Locate() (Install, error)
	// MainProcess returns the Spotify main process, if one is running.
	MainProcess() (Process, bool, error)
	Launch(inst Install, port int) error
	// RequestQuit asks Spotify to quit the way a user would (it may save state, or ignore us).
	RequestQuit(inst Install, p Process) error
	Kill(p Process) error
	// Focus brings an already running Spotify to the front.
	Focus(inst Install) error
}

// ErrStillRunning means Spotify survived both a quit request and a forced kill.
var ErrStillRunning = errors.New("spotify did not quit")

// Controller drives one located Spotify install.
type Controller struct {
	platform Platform
	install  Install

	// QuitTimeout is how long a graceful quit may take before Spotify is force-killed.
	QuitTimeout time.Duration
	// KillTimeout is how long to wait for the process to disappear after a forced kill.
	KillTimeout time.Duration
	// PollInterval is how often process state is re-checked while waiting.
	PollInterval time.Duration
}

// NewController locates Spotify. It returns ErrNotInstalled or ErrStoreVersion when unusable.
func NewController(p Platform) (*Controller, error) {
	inst, err := p.Locate()
	if err != nil {
		return nil, err
	}
	return &Controller{platform: p, install: inst, QuitTimeout: 10 * time.Second, KillTimeout: 5 * time.Second, PollInterval: 250 * time.Millisecond}, nil
}

// Install is the located app.
func (c *Controller) Install() Install { return c.install }

// Status reports the main process, if running.
func (c *Controller) Status() (Process, bool, error) {
	p, ok, err := c.platform.MainProcess()
	if err != nil {
		return Process{}, false, fmt.Errorf("spotify status: %w", err)
	}
	return p, ok, nil
}

// Launch starts Spotify with DevTools enabled on 127.0.0.1:port.
func (c *Controller) Launch(port int) error {
	if err := c.platform.Launch(c.install, port); err != nil {
		return fmt.Errorf("launch spotify: %w", err)
	}
	return nil
}

// Focus brings Spotify to the front.
func (c *Controller) Focus() error {
	if err := c.platform.Focus(c.install); err != nil {
		return fmt.Errorf("focus spotify: %w", err)
	}
	return nil
}

// Restart quits Spotify (gracefully, then forcefully after QuitTimeout) and launches it with our port.
func (c *Controller) Restart(ctx context.Context, port int) error {
	p, running, err := c.Status()
	if err != nil {
		return err
	}
	if running {
		if err := c.quit(ctx, p); err != nil {
			return err
		}
	}
	return c.Launch(port)
}

func (c *Controller) quit(ctx context.Context, p Process) error {
	// A failed quit request is not fatal: the forced kill below still gets Spotify down.
	requestErr := c.platform.RequestQuit(c.install, p)
	gone, err := c.waitGone(ctx, c.QuitTimeout)
	if err != nil || gone {
		return err
	}
	if err := c.platform.Kill(p); err != nil {
		return fmt.Errorf("force quit spotify (quit request: %v): %w", requestErr, err)
	}
	gone, err = c.waitGone(ctx, c.KillTimeout)
	if err != nil {
		return err
	}
	if !gone {
		return ErrStillRunning
	}
	return nil
}

func (c *Controller) waitGone(ctx context.Context, timeout time.Duration) (bool, error) {
	deadline := time.Now().Add(timeout)
	for {
		if _, running, err := c.Status(); err != nil {
			return false, err
		} else if !running {
			return true, nil
		}
		if time.Now().After(deadline) {
			return false, nil
		}
		select {
		case <-ctx.Done():
			return false, ctx.Err()
		case <-time.After(c.PollInterval):
		}
	}
}
