// Package app is the helper's control loop: observe Spotify, decide (spotify.Decide), act
// (launch / restart / ask / connect), keep the payload injected while connected, and react to
// commands from the tray, the bridge and second launches.
package app

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"time"

	"spotifycustom/internal/cdp"
	"spotifycustom/internal/inject"
	"spotifycustom/internal/spotify"
	"spotifycustom/internal/store"
)

// Status is shown in the tray so non-technical users can tell what is going on.
type Status int

const (
	StatusWaiting   Status = iota // Spotify isn't running
	StatusUntouched               // Spotify runs without our theme (user said "Not now")
	StatusStarting                // launching or restarting Spotify
	StatusActive                  // payload injected
	StatusFailed                  // Spotify didn't come up with customisation enabled
)

func (s Status) String() string {
	return [...]string{
		"Waiting for Spotify",
		"Spotify is open without your theme",
		"Starting Spotify…",
		"Theme active",
		"Couldn't apply your theme",
	}[s]
}

// SpotifyControl is the part of spotify.Controller the loop uses.
type SpotifyControl interface {
	Status() (spotify.Process, bool, error)
	Launch(port int) error
	Restart(ctx context.Context, port int) error
	Focus() error
}

// Desktop is the user-facing OS surface the loop uses.
type Desktop interface {
	Notify(title, message string) error
	Confirm(title, message, confirm, cancel string) (bool, error)
}

// Runtime persists the debug port.
type Runtime interface {
	Runtime() store.Runtime
	SaveRuntime(store.Runtime) error
}

// ServeFunc connects to Spotify's DevTools on port and keeps the payload injected until the
// connection ends or ctx is cancelled.
type ServeFunc func(ctx context.Context, port int) error

// DiscoverFunc checks that a Spotify DevTools endpoint answers on port.
type DiscoverFunc func(ctx context.Context, port int) (cdp.Endpoint, error)

// Config tunes the loop.
type Config struct {
	Title string // dialog/notification title
	Port  int    // fixed debug port (dev); 0 = runtime.json, picking a free one on first run
	Login bool   // started at login

	PollInterval   time.Duration // idle re-check interval (default 2s)
	LoginWindow    time.Duration // how long after a login start Spotify counts as "starting with the system" (default 2m)
	StartupTimeout time.Duration // how long a launched Spotify may take to open its debug port (default 30s)
}

// Deps are the loop's collaborators.
type Deps struct {
	Log      *slog.Logger
	Spotify  SpotifyControl
	Desktop  Desktop
	Runtime  Runtime
	Discover DiscoverFunc
	Serve    ServeFunc
	// OnStatus is called whenever the status changes (optional).
	OnStatus func(Status)
}

type command int

const (
	cmdOpen command = iota
	cmdRestart
)

// App is the control loop.
type App struct {
	cfg  Config
	deps Deps
	cmds chan command

	status Status
	asked  map[int]bool // Spotify PIDs we already asked about, so we ask once per Spotify session
}

// New creates the loop with defaults applied.
func New(cfg Config, deps Deps) *App {
	if cfg.PollInterval == 0 {
		cfg.PollInterval = 2 * time.Second
	}
	if cfg.LoginWindow == 0 {
		cfg.LoginWindow = 2 * time.Minute
	}
	if cfg.StartupTimeout == 0 {
		cfg.StartupTimeout = 30 * time.Second
	}
	if cfg.Title == "" {
		cfg.Title = "Spotify Custom"
	}
	return &App{cfg: cfg, deps: deps, cmds: make(chan command, 8), status: -1, asked: map[int]bool{}}
}

// OpenSpotify asks the loop to open (or focus) Spotify with the theme. Never blocks.
func (a *App) OpenSpotify() { a.send(cmdOpen) }

// RestartThemed asks the loop to restart Spotify with the theme. Never blocks.
func (a *App) RestartThemed() { a.send(cmdRestart) }

func (a *App) send(c command) {
	select {
	case a.cmds <- c:
	default: // the queue is full of equivalent requests already
	}
}

// Run drives Spotify until ctx is cancelled.
func (a *App) Run(ctx context.Context) error {
	port, err := a.resolvePort()
	if err != nil {
		return err
	}
	started := time.Now()
	trigger := spotify.TriggerUser
	if a.cfg.Login {
		trigger = spotify.TriggerLogin
	}

	for {
		if trigger == spotify.TriggerWatch && a.cfg.Login && time.Since(started) < a.cfg.LoginWindow {
			trigger = spotify.TriggerLogin
		}
		next, again := a.step(ctx, trigger, &port)
		if ctx.Err() != nil {
			return nil
		}
		if again {
			trigger = next
			continue
		}
		select {
		case <-ctx.Done():
			return nil
		case c := <-a.cmds:
			trigger = triggerFor(c)
		case <-time.After(a.cfg.PollInterval):
			trigger = spotify.TriggerWatch
		}
	}
}

// step observes, decides and acts once. again=true means re-evaluate immediately with next.
func (a *App) step(ctx context.Context, trigger spotify.Trigger, port *int) (next spotify.Trigger, again bool) {
	proc, running, err := a.deps.Spotify.Status()
	if err != nil {
		a.deps.Log.Warn("checking Spotify failed", "err", err)
		return spotify.TriggerWatch, false
	}
	_, derr := a.deps.Discover(ctx, *port)
	sit := spotify.Situation{Trigger: trigger, Running: running, Reachable: derr == nil, Uptime: proc.Uptime}
	action := spotify.Decide(sit)
	if action != spotify.ActionWait {
		a.deps.Log.Info("spotify", "trigger", trigger, "running", running, "reachable", sit.Reachable, "action", action)
	}

	switch action {
	case spotify.ActionConnect:
		if trigger == spotify.TriggerUser {
			a.focus()
		}
		return a.serve(ctx, *port)

	case spotify.ActionLaunch:
		a.setStatus(StatusStarting)
		if err := a.deps.Spotify.Launch(*port); err != nil {
			a.fail("launch", err)
			return spotify.TriggerWatch, false
		}
		return spotify.TriggerWatch, a.awaitDebugPort(ctx, port)

	case spotify.ActionRestart:
		a.setStatus(StatusStarting)
		a.notify("Restarting Spotify to apply your theme…")
		return spotify.TriggerWatch, a.restart(ctx, port)

	case spotify.ActionAskRestart:
		if a.asked[proc.PID] {
			a.setStatus(StatusUntouched)
			return spotify.TriggerWatch, false
		}
		a.asked[proc.PID] = true
		ok, err := a.deps.Desktop.Confirm(a.cfg.Title,
			"Spotify is open without your theme. Restart it now to apply your theme? Music stops for a few seconds.",
			"Restart Spotify", "Not now")
		if err != nil {
			a.deps.Log.Warn("asking to restart failed", "err", err)
		}
		if !ok {
			a.setStatus(StatusUntouched)
			return spotify.TriggerWatch, false
		}
		a.setStatus(StatusStarting)
		return spotify.TriggerWatch, a.restart(ctx, port)
	}

	a.setStatus(StatusWaiting)
	return spotify.TriggerWatch, false
}

func (a *App) restart(ctx context.Context, port *int) bool {
	if err := a.deps.Spotify.Restart(ctx, *port); err != nil {
		a.fail("restart", err)
		return false
	}
	return a.awaitDebugPort(ctx, port)
}

// awaitDebugPort waits for the freshly started Spotify to open our port. If something else owns the
// port, a new one is picked for next time so we never get stuck on it.
func (a *App) awaitDebugPort(ctx context.Context, port *int) bool {
	deadline := time.Now().Add(a.cfg.StartupTimeout)
	var last error
	for time.Now().Before(deadline) {
		_, last = a.deps.Discover(ctx, *port)
		if last == nil {
			return true
		}
		select {
		case <-ctx.Done():
			return false
		case <-time.After(300 * time.Millisecond):
		}
	}
	if errors.Is(last, cdp.ErrNotSpotify) && a.cfg.Port == 0 {
		if p, err := a.repickPort(); err == nil {
			a.deps.Log.Warn("debug port is used by another app; picked a new one", "old", *port, "new", p)
			*port = p
		}
	}
	a.fail("waiting for Spotify's debug port", last)
	return false
}

// serve keeps the payload injected while commands keep flowing. It returns when the connection ends
// (Spotify quit) or a restart was requested.
func (a *App) serve(ctx context.Context, port int) (spotify.Trigger, bool) {
	a.setStatus(StatusActive)
	sctx, cancel := context.WithCancel(ctx)
	defer cancel()
	done := make(chan error, 1)
	go func() { done <- a.deps.Serve(sctx, port) }()

	for {
		select {
		case err := <-done:
			if err != nil && !errors.Is(err, cdp.ErrClosed) && ctx.Err() == nil {
				a.deps.Log.Warn("connection to Spotify ended", "err", err)
			}
			a.setStatus(StatusWaiting)
			return spotify.TriggerWatch, true
		case c := <-a.cmds:
			if c == cmdOpen {
				a.focus()
				continue
			}
			cancel()
			<-done // let the injector clean up before Spotify is restarted
			return spotify.TriggerRestart, true
		case <-ctx.Done():
			<-done
			return spotify.TriggerWatch, false
		}
	}
}

func (a *App) focus() {
	if err := a.deps.Spotify.Focus(); err != nil {
		a.deps.Log.Warn("focusing Spotify failed", "err", err)
	}
}

func (a *App) fail(what string, err error) {
	a.deps.Log.Error("could not apply theme", "step", what, "err", err)
	a.setStatus(StatusFailed)
	a.notify("Couldn't apply your theme. Try “Restart Spotify with theme” from the Spotify Custom menu.")
}

func (a *App) notify(msg string) {
	if err := a.deps.Desktop.Notify(a.cfg.Title, msg); err != nil {
		a.deps.Log.Warn("notification failed", "err", err)
	}
}

func (a *App) setStatus(s Status) {
	if s == a.status {
		return
	}
	a.status = s
	if a.deps.OnStatus != nil {
		a.deps.OnStatus(s)
	}
}

func (a *App) resolvePort() (int, error) {
	if a.cfg.Port > 0 {
		return a.cfg.Port, nil
	}
	if p := a.deps.Runtime.Runtime().Port; p > 0 {
		return p, nil
	}
	return a.repickPort()
}

func (a *App) repickPort() (int, error) {
	p, err := freePort()
	if err != nil {
		return 0, err
	}
	rt := a.deps.Runtime.Runtime()
	rt.Port = p
	if err := a.deps.Runtime.SaveRuntime(rt); err != nil {
		return 0, err
	}
	return p, nil
}

func freePort() (int, error) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, fmt.Errorf("pick debug port: %w", err)
	}
	defer ln.Close()
	return ln.Addr().(*net.TCPAddr).Port, nil
}

func triggerFor(c command) spotify.Trigger {
	if c == cmdRestart {
		return spotify.TriggerRestart
	}
	return spotify.TriggerUser
}

// ServeCDP is the production ServeFunc: discover → dial → keep the payload injected.
func ServeCDP(in *inject.Injector) ServeFunc {
	return func(ctx context.Context, port int) error {
		ep, err := cdp.Discover(ctx, port)
		if err != nil {
			return err
		}
		conn, err := cdp.Dial(ctx, ep.BrowserURL)
		if err != nil {
			return err
		}
		defer conn.Close()
		return in.Run(ctx, conn)
	}
}
