// Command spotifycustom is the Spotify Custom helper: a tray app that starts Spotify with DevTools
// enabled on localhost, keeps the customisation payload injected and stores the user's settings.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"runtime"
	"syscall"
	"time"

	"spotifycustom/internal/app"
	"spotifycustom/internal/audio"
	"spotifycustom/internal/autostart"
	"spotifycustom/internal/bridge"
	"spotifycustom/internal/cdp"
	"spotifycustom/internal/desktop"
	"spotifycustom/internal/inject"
	"spotifycustom/internal/instance"
	"spotifycustom/internal/logging"
	"spotifycustom/internal/spotify"
	"spotifycustom/internal/store"
	"spotifycustom/internal/tray"
	"spotifycustom/internal/update"
)

// version is set at build time: -ldflags "-X main.version=1.2.3".
var version = "dev"

// title is the user-facing app name.
const title = "Spotify Custom"

type options struct {
	dev     bool
	payload string
	port    int
	login   bool
}

func main() { os.Exit(run()) }

func parseFlags() options {
	var o options
	flag.BoolVar(&o.dev, "dev", false, "development mode: log to stderr too")
	flag.StringVar(&o.payload, "payload", "", "inject this payload file instead of the embedded one and re-inject when it changes")
	flag.IntVar(&o.port, "port", 0, "use this DevTools port instead of the remembered one")
	flag.BoolVar(&o.login, autostart.LoginFlag[2:], false, "started at login (set by the login item)")
	flag.Parse()
	return o
}

func run() int {
	opts := parseFlags()
	dir, err := store.DefaultDir()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return 1
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		fmt.Fprintln(os.Stderr, err)
		return 1
	}
	log, logFile, err := logging.New(dir, opts.dev)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return 1
	}
	defer logFile.Close()
	log.Info("starting", "version", version, "dev", opts.dev, "login", opts.login)

	lock, err := instance.Acquire(filepath.Join(dir, "helper.lock"))
	if errors.Is(err, instance.ErrAlreadyRunning) {
		signalRunningInstance(dir, log)
		return 0
	}
	if err != nil {
		log.Error("single-instance lock failed", "err", err)
		return 1
	}
	defer lock.Release()

	st, err := store.New(dir, log)
	if err != nil {
		log.Error("data folder unavailable", "err", err)
		return 1
	}
	desk := desktop.New(title)
	ctrl, err := spotify.NewController(spotify.NewPlatform())
	if err != nil {
		explainMissingSpotify(desk, log, err)
		return 1
	}

	sigCtx, stopSignals := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stopSignals()
	ctx, cancel := context.WithCancel(sigCtx)
	defer cancel()

	opens := listenForSecondLaunches(ctx, st, log)
	payload, reload := payloadSource(ctx, opts, log)
	status := &statusSink{}

	injector := &inject.Injector{Payload: payload, Log: log, Reload: reload}
	music := &audio.Service{Capturer: audio.NewCapturer(), Spotify: ctrl, Sink: injector.Broadcast, Log: log}
	updates := &updateSink{page: injector.Broadcast}
	updater := &update.Service{
		Current:   version,
		URL:       update.ManifestURL,
		Client:    http.DefaultClient,
		Installer: update.NewInstaller(),
		Dir:       filepath.Join(dir, "updates"),
		Open:      desk.Open,
		Quit:      tray.Quit,
		OnChange:  updates.set,
		Log:       log,
	}
	handler := &bridge.Handler{Store: st, Audio: music, Updates: updater, Version: version, Platform: runtime.GOOS}
	injector.Handler = handler
	loop := app.New(
		app.Config{Title: title, Port: opts.port, Login: opts.login},
		app.Deps{
			Log:      log,
			Spotify:  ctrl,
			Desktop:  desk,
			Runtime:  st,
			Discover: cdp.Discover,
			Serve:    serveStoppingAudio(app.ServeCDP(injector), music),
			OnStatus: status.set,
		},
	)
	sh := &shell{loop: loop, store: st, desk: desk, updates: updater, log: log}
	handler.Actions = sh
	healAutostart(log)

	loopDone := make(chan struct{})
	tray.Run(title, sh,
		func(menu *tray.Menu) {
			status.attach(menu)
			updates.attach(menu)
			go updater.Run(ctx)
			go func() {
				defer close(loopDone)
				if err := loop.Run(ctx); err != nil {
					log.Error("helper stopped", "err", err)
				}
				tray.Quit()
			}()
			go func() {
				for range opens {
					loop.OpenSpotify()
				}
			}()
			go func() {
				<-ctx.Done() // Ctrl+C in dev, or the loop ended
				tray.Quit()
			}()
		},
	)
	// Shut down after the tray is gone rather than in systray's onExit: on macOS Quit returns from
	// Run without calling onExit, and the injector needs time to remove its hooks from Spotify.
	cancel()
	select {
	case <-loopDone:
	case <-time.After(5 * time.Second):
		log.Warn("shutdown timed out")
	}
	log.Info("stopped")
	return 0
}

// serveStoppingAudio ends music capture whenever a Spotify connection ends: nobody is left to want it.
func serveStoppingAudio(serve app.ServeFunc, music *audio.Service) app.ServeFunc {
	return func(ctx context.Context, port int) error {
		defer music.Stop()
		return serve(ctx, port)
	}
}

// signalRunningInstance asks the already running helper to open Spotify, then this launch exits.
func signalRunningInstance(dir string, log *slog.Logger) {
	st, err := store.New(dir, log)
	if err == nil {
		err = instance.Signal(st.Runtime().ControlPort, instance.CommandOpen)
	}
	if err != nil {
		log.Warn("could not reach the running helper", "err", err)
	}
}

func listenForSecondLaunches(ctx context.Context, st *store.Store, log *slog.Logger) <-chan string {
	port, cmds, err := instance.Listen(ctx)
	if err != nil {
		log.Warn("second launches can't reach this instance", "err", err)
		return nil
	}
	rt := st.Runtime()
	rt.ControlPort = port
	if err := st.SaveRuntime(rt); err != nil {
		log.Warn("saving control port failed", "err", err)
	}
	return cmds
}

func payloadSource(ctx context.Context, opts options, log *slog.Logger) (inject.Payload, <-chan struct{}) {
	if opts.payload == "" {
		return inject.Embedded(), nil
	}
	w := inject.FileWatcher{Path: opts.payload, Every: 500 * time.Millisecond, Log: log}
	return inject.File{Path: opts.payload}, w.Watch(ctx)
}

func explainMissingSpotify(desk desktop.Desktop, log *slog.Logger, err error) {
	log.Error("spotify unusable", "err", err)
	msg := "Spotify isn't installed. Install it from spotify.com/download, then open " + title + " again."
	if errors.Is(err, spotify.ErrStoreVersion) {
		msg = "Spotify from the Microsoft Store can't be customised. Please install Spotify from spotify.com/download, then open " + title + " again."
	}
	if aerr := desk.Alert(title, msg); aerr != nil {
		log.Warn("alert failed", "err", aerr)
	}
	if oerr := desk.Open(spotify.DownloadURL); oerr != nil {
		log.Warn("opening download page failed", "err", oerr)
	}
}

// healAutostart re-registers the login item with the current executable path, so moving the app
// doesn't silently break "Start at login".
func healAutostart(log *slog.Logger) {
	if !autostart.Enabled() {
		return
	}
	exe, err := os.Executable()
	if err == nil {
		err = autostart.Enable(exe)
	}
	if err != nil {
		log.Warn("refreshing login item failed", "err", err)
	}
}
