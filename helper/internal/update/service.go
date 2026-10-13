package update

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"runtime"
	"sync"
	"time"
)

// ManifestURL is latest.json of the newest published (non-draft, non-prerelease) GitHub release.
const ManifestURL = "https://github.com/robo311/spotify-custom/releases/latest/download/latest.json"

// States mirror UpdateStatus.state in payload/src/types.ts.
const (
	StateNone       = "none"
	StateAvailable  = "available"
	StateInstalling = "installing"
	StateFailed     = "failed"
)

// Status mirrors UpdateStatus in payload/src/types.ts.
type Status struct {
	State   string `json:"state"`
	Current string `json:"current"`
	Latest  string `json:"latest,omitempty"`
	Message string `json:"message,omitempty"`
}

// ErrManual means this copy can't replace itself (e.g. a Mac app running from Downloads or a read-only
// folder); the user installs the new version by hand from the release page.
var ErrManual = errors.New("update must be installed by hand")

// Installer is the per-OS install step (see NewInstaller).
type Installer interface {
	// Check returns ErrManual when this copy can't replace itself.
	Check() error
	// Install installs the verified package and arranges for the new version to start once this process exits.
	Install(ctx context.Context, pkg string) error
}

// platformKey selects this OS's asset in the manifest.
const platformKey = runtime.GOOS

const (
	firstCheck    = 20 * time.Second // let Spotify start first
	checkInterval = time.Hour        // a new release shows up within the hour, without a restart
	soonGap       = 5 * time.Minute  // CheckSoon skips a check this close after the last one
	installBudget = 10 * time.Minute
)

// Service checks for updates and installs them on request.
type Service struct {
	Current   string // running version
	URL       string // manifest URL (ManifestURL)
	Client    *http.Client
	Installer Installer
	Dir       string             // download folder
	Open      func(string) error // opens the release page for manual installs
	Quit      func()             // ends the helper after a successful install
	OnChange  func(Status)
	Log       *slog.Logger

	mu        sync.Mutex
	status    Status
	manifest  *Manifest
	lastCheck time.Time

	soonOnce sync.Once
	soonCh   chan struct{}
}

func (s *Service) soon() chan struct{} {
	s.soonOnce.Do(func() { s.soonCh = make(chan struct{}, 1) })
	return s.soonCh
}

// CheckSoon asks Run to check now rather than at its next scheduled check (Spotify just started, so the user is
// about to look), unless it checked within the last few minutes.
func (s *Service) CheckSoon() {
	select {
	case s.soon() <- struct{}{}:
	default: // one is already pending
	}
}

// Run checks shortly after start and then periodically until ctx ends.
func (s *Service) Run(ctx context.Context) {
	if _, ok := parseVersion(s.Current); !ok {
		return
	}
	timer := time.NewTimer(firstCheck)
	defer timer.Stop()
	first := true
	for {
		select {
		case <-ctx.Done():
			return
		case <-timer.C:
		case <-s.soon():
			s.mu.Lock()
			recent := !s.lastCheck.IsZero() && time.Since(s.lastCheck) < soonGap
			s.mu.Unlock()
			if recent {
				continue
			}
		}
		if first {
			// The previous update's package (Windows setup may still have been running when we started).
			_ = os.RemoveAll(s.Dir)
			first = false
		}
		s.mu.Lock()
		s.lastCheck = time.Now()
		s.mu.Unlock()
		if err := s.Check(ctx); err != nil {
			s.Log.Info("update check failed", "err", err) // offline is normal
		}
		timer.Reset(checkInterval)
	}
}

// Status is the current update status.
func (s *Service) Status() Status {
	s.mu.Lock()
	defer s.mu.Unlock()
	st := s.status
	st.Current = s.Current
	if st.State == "" {
		st.State = StateNone
	}
	return st
}

// Check fetches the manifest and records whether a newer version exists. Development builds never check.
func (s *Service) Check(ctx context.Context) error {
	if _, ok := parseVersion(s.Current); !ok {
		return nil
	}
	m, err := s.fetchManifest(ctx)
	if err != nil {
		return err
	}
	s.mu.Lock()
	if s.status.State == StateInstalling {
		s.mu.Unlock()
		return nil
	}
	_, hasAsset := m.Asset(platformKey)
	if !Newer(m.Version, s.Current) || !hasAsset {
		s.manifest = nil
		s.mu.Unlock()
		s.set(Status{State: StateNone})
		return nil
	}
	s.manifest = &m
	keepFailure := s.status.State == StateFailed && s.status.Latest == m.Version
	s.mu.Unlock()
	if !keepFailure {
		s.Log.Info("update available", "version", m.Version)
		s.set(Status{State: StateAvailable, Latest: m.Version})
	}
	return nil
}

func (s *Service) fetchManifest(ctx context.Context) (Manifest, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.URL, nil)
	if err != nil {
		return Manifest{}, fmt.Errorf("check for update: %w", err)
	}
	resp, err := s.Client.Do(req)
	if err != nil {
		return Manifest{}, fmt.Errorf("check for update: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return Manifest{}, fmt.Errorf("check for update: %s", resp.Status)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return Manifest{}, fmt.Errorf("check for update: %w", err)
	}
	return ParseManifest(data)
}

// Install starts installing the available update in the background; progress goes to OnChange. On success
// the helper quits and the new version starts. When nothing is installed (no update, one already running, or a
// manual install) the current status is still reported, because the page shows "installing" as soon as asked.
func (s *Service) Install() {
	s.mu.Lock()
	m := s.manifest
	if m == nil || s.status.State == StateInstalling {
		s.mu.Unlock()
		s.notify()
		return
	}
	if err := s.Installer.Check(); errors.Is(err, ErrManual) {
		s.mu.Unlock()
		s.Log.Info("update needs a manual install; opening the release page")
		if err := s.Open(m.Page); err != nil {
			s.Log.Warn("opening release page failed", "err", err)
		}
		s.notify()
		return
	}
	// Claimed under the same lock as the check above, so two quick requests (tray and studio) start one install.
	s.status = Status{State: StateInstalling, Latest: m.Version}
	s.mu.Unlock()
	s.notify()
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), installBudget)
		defer cancel()
		// The cached manifest can be hours old; a release pulled since then must not be installed.
		fresh, err := s.fetchManifest(ctx)
		if err == nil {
			if _, ok := fresh.Asset(platformKey); !ok || !Newer(fresh.Version, s.Current) {
				s.Log.Info("update no longer offered", "version", m.Version)
				s.mu.Lock()
				s.manifest = nil
				s.mu.Unlock()
				s.set(Status{State: StateNone})
				return
			}
			m = &fresh
			err = s.install(ctx, fresh)
		}
		if err != nil {
			s.Log.Error("update failed", "version", m.Version, "err", err)
			s.set(Status{State: StateFailed, Latest: m.Version, Message: err.Error()})
			return
		}
		s.Log.Info("update installed; restarting", "version", m.Version)
		s.Quit()
	}()
}

func (s *Service) install(ctx context.Context, m Manifest) error {
	asset, _ := m.Asset(platformKey) // Check only offers manifests with this OS's asset
	pkg, err := Download(ctx, s.Client, asset, s.Dir)
	if err != nil {
		return err
	}
	return s.Installer.Install(ctx, pkg)
}

func (s *Service) set(st Status) {
	s.mu.Lock()
	changed := st != s.status
	s.status = st
	s.mu.Unlock()
	if changed {
		s.notify()
	}
}

// notify reports the current status, changed or not.
func (s *Service) notify() {
	if s.OnChange != nil {
		s.OnChange(s.Status())
	}
}
