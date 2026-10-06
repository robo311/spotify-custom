package update

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestNewer(t *testing.T) {
	tests := []struct {
		latest, current string
		want            bool
	}{
		{"0.2.0", "0.1.0", true},
		{"v0.2.0", "0.1.0", true},
		{"0.1.0", "v0.1.0", false},
		{"0.1.10", "0.1.9", true},
		{"1.0.0", "0.9.9", true},
		{"0.1.0", "0.2.0", false},
		{"0.2.0", "dev", false}, // local builds never update
		{"garbage", "0.1.0", false},
		{"0.2", "0.1.0", false},
		{"0.2.0-beta", "0.1.0", false},
	}
	for _, tt := range tests {
		if got := Newer(tt.latest, tt.current); got != tt.want {
			t.Errorf("Newer(%q, %q) = %v, want %v", tt.latest, tt.current, got, tt.want)
		}
	}
}

const sha = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

func TestParseManifest(t *testing.T) {
	tests := []struct {
		name    string
		json    string
		wantErr bool
	}{
		{"ok", `{"version":"0.2.0","page":"https://x/r","assets":{"darwin":{"url":"https://x/a.zip","sha256":"` + sha + `"}}}`, false},
		{"bad version", `{"version":"dev","assets":{}}`, true},
		{"http asset", `{"version":"0.2.0","assets":{"darwin":{"url":"http://x/a.zip","sha256":"` + sha + `"}}}`, true},
		{"short sha", `{"version":"0.2.0","assets":{"darwin":{"url":"https://x/a.zip","sha256":"abc"}}}`, true},
		{"not json", `<html>`, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := ParseManifest([]byte(tt.json))
			if (err != nil) != tt.wantErr {
				t.Fatalf("err = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestManifestAsset(t *testing.T) {
	m, err := ParseManifest([]byte(`{"version":"0.2.0","assets":{"windows":{"url":"https://x/s.exe","sha256":"` + sha + `"}}}`))
	if err != nil {
		t.Fatal(err)
	}
	if a, ok := m.Asset("windows"); !ok || a.URL != "https://x/s.exe" {
		t.Errorf("windows asset = %+v, %v", a, ok)
	}
	if _, ok := m.Asset("darwin"); ok {
		t.Error("darwin asset should be missing")
	}
}

func sum(b []byte) string {
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}

func TestDownloadVerifiesChecksum(t *testing.T) {
	body := []byte("package bytes")
	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write(body) }))
	defer srv.Close()

	dir := t.TempDir()
	path, err := Download(context.Background(), srv.Client(), Asset{URL: srv.URL + "/SpotifyCustom-Setup.exe", SHA256: sum(body)}, dir)
	if err != nil {
		t.Fatal(err)
	}
	if filepath.Base(path) != "SpotifyCustom-Setup.exe" {
		t.Errorf("file name = %q, want the asset's name (Windows runs it)", filepath.Base(path))
	}
	if got, _ := os.ReadFile(path); string(got) != string(body) {
		t.Errorf("content = %q", got)
	}

	_, err = Download(context.Background(), srv.Client(), Asset{URL: srv.URL + "/a.zip", SHA256: sha}, dir)
	if !errors.Is(err, ErrChecksum) {
		t.Fatalf("err = %v, want ErrChecksum", err)
	}
	if _, statErr := os.Stat(filepath.Join(dir, "a.zip")); !os.IsNotExist(statErr) {
		t.Error("a package that fails verification must not be left behind")
	}
}

func TestDownloadHTTPError(t *testing.T) {
	srv := httptest.NewTLSServer(http.NotFoundHandler())
	defer srv.Close()
	if _, err := Download(context.Background(), srv.Client(), Asset{URL: srv.URL + "/a.zip", SHA256: sha}, t.TempDir()); err == nil {
		t.Fatal("want error for 404")
	}
}

func TestBundleOf(t *testing.T) {
	tests := []struct{ exe, want string }{
		{"/Applications/SpotifyCustom.app/Contents/MacOS/SpotifyCustom", "/Applications/SpotifyCustom.app"},
		{"/Users/a/Spotify Custom.app/Contents/MacOS/SpotifyCustom", "/Users/a/Spotify Custom.app"},
		{"/usr/local/bin/spotifycustom", ""},
		{"/tmp/x/Contents/MacOS/SpotifyCustom", ""},
	}
	for _, tt := range tests {
		if got := BundleOf(tt.exe); got != tt.want {
			t.Errorf("BundleOf(%q) = %q, want %q", tt.exe, got, tt.want)
		}
	}
}

func writeBundle(t *testing.T, path, marker string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Join(path, "Contents", "MacOS"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(path, "Contents", "MacOS", "SpotifyCustom"), []byte(marker), 0o755); err != nil {
		t.Fatal(err)
	}
}

func readMarker(t *testing.T, bundle string) string {
	t.Helper()
	b, err := os.ReadFile(filepath.Join(bundle, "Contents", "MacOS", "SpotifyCustom"))
	if err != nil {
		t.Fatal(err)
	}
	return string(b)
}

func TestSwapBundle(t *testing.T) {
	dir := t.TempDir()
	current := filepath.Join(dir, "SpotifyCustom.app")
	fresh := filepath.Join(dir, ".update", "SpotifyCustom.app")
	writeBundle(t, current, "old")
	writeBundle(t, fresh, "new")

	if err := SwapBundle(current, fresh); err != nil {
		t.Fatal(err)
	}
	if got := readMarker(t, current); got != "new" {
		t.Errorf("current bundle = %q, want new", got)
	}
	entries, _ := os.ReadDir(dir)
	for _, e := range entries {
		if strings.HasSuffix(e.Name(), ".old") {
			t.Errorf("backup %q left behind", e.Name())
		}
	}
}

func TestSwapBundleRestoresOnFailure(t *testing.T) {
	dir := t.TempDir()
	current := filepath.Join(dir, "SpotifyCustom.app")
	writeBundle(t, current, "old")

	if err := SwapBundle(current, filepath.Join(dir, "missing.app")); err == nil {
		t.Fatal("want error when the new bundle is missing")
	}
	if got := readMarker(t, current); got != "old" {
		t.Errorf("current bundle = %q, want the original back", got)
	}
}

// fakeInstaller records installs; manual makes Check report ErrManual.
type fakeInstaller struct {
	mu       sync.Mutex
	manual   bool
	fail     error
	packages []string
}

func (f *fakeInstaller) Check() error {
	if f.manual {
		return ErrManual
	}
	return nil
}

func (f *fakeInstaller) Install(_ context.Context, pkg string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.packages = append(f.packages, pkg)
	return f.fail
}

type harness struct {
	svc      *Service
	inst     *fakeInstaller
	opened   chan string
	quit     chan struct{}
	statuses chan Status
}

func newHarness(t *testing.T, version string, inst *fakeInstaller) *harness {
	t.Helper()
	pkg := []byte("new helper")
	var srv *httptest.Server
	srv = httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/latest.json":
			_, _ = io.WriteString(w, `{"version":"`+version+`","page":"https://example.com/release","assets":{"`+platformKey+`":{"url":"`+
				srv.URL+`/pkg.zip","sha256":"`+sum(pkg)+`"}}}`)
		case "/pkg.zip":
			_, _ = w.Write(pkg)
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	h := &harness{inst: inst, opened: make(chan string, 1), quit: make(chan struct{}, 1), statuses: make(chan Status, 16)}
	h.svc = &Service{
		Current:   "0.1.0",
		URL:       srv.URL + "/latest.json",
		Client:    srv.Client(),
		Installer: inst,
		Dir:       t.TempDir(),
		Open:      func(u string) error { h.opened <- u; return nil },
		Quit:      func() { h.quit <- struct{}{} },
		OnChange:  func(s Status) { h.statuses <- s },
		Log:       slog.New(slog.DiscardHandler),
	}
	return h
}

func (h *harness) waitState(t *testing.T, want string) Status {
	t.Helper()
	timeout := time.After(5 * time.Second)
	for {
		select {
		case s := <-h.statuses:
			if s.State == want {
				return s
			}
		case <-timeout:
			t.Fatalf("no %q status (now %+v)", want, h.svc.Status())
		}
	}
}

func TestServiceCheck(t *testing.T) {
	h := newHarness(t, "0.2.0", &fakeInstaller{})
	if err := h.svc.Check(context.Background()); err != nil {
		t.Fatal(err)
	}
	s := h.svc.Status()
	if s.State != StateAvailable || s.Latest != "0.2.0" || s.Current != "0.1.0" {
		t.Errorf("status = %+v", s)
	}
}

func TestServiceCheckUpToDate(t *testing.T) {
	h := newHarness(t, "0.1.0", &fakeInstaller{})
	if err := h.svc.Check(context.Background()); err != nil {
		t.Fatal(err)
	}
	if s := h.svc.Status(); s.State != StateNone {
		t.Errorf("status = %+v, want none", s)
	}
}

func TestServiceInstall(t *testing.T) {
	inst := &fakeInstaller{}
	h := newHarness(t, "0.2.0", inst)
	if err := h.svc.Check(context.Background()); err != nil {
		t.Fatal(err)
	}
	h.svc.Install()
	h.waitState(t, StateInstalling)
	select {
	case <-h.quit:
	case <-time.After(5 * time.Second):
		t.Fatal("helper not asked to quit after installing")
	}
	inst.mu.Lock()
	defer inst.mu.Unlock()
	if len(inst.packages) != 1 || filepath.Base(inst.packages[0]) != "pkg.zip" {
		t.Errorf("installed %v", inst.packages)
	}
}

func TestServiceInstallFailure(t *testing.T) {
	h := newHarness(t, "0.2.0", &fakeInstaller{fail: errors.New("disk full")})
	if err := h.svc.Check(context.Background()); err != nil {
		t.Fatal(err)
	}
	h.svc.Install()
	s := h.waitState(t, StateFailed)
	if !strings.Contains(s.Message, "disk full") || s.Latest != "0.2.0" {
		t.Errorf("status = %+v", s)
	}
	select {
	case <-h.quit:
		t.Error("must not quit after a failed install")
	default:
	}
}

func TestServiceManualInstallOpensReleasePage(t *testing.T) {
	inst := &fakeInstaller{manual: true}
	h := newHarness(t, "0.2.0", inst)
	if err := h.svc.Check(context.Background()); err != nil {
		t.Fatal(err)
	}
	h.svc.Install()
	select {
	case u := <-h.opened:
		if u != "https://example.com/release" {
			t.Errorf("opened %q", u)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("release page not opened")
	}
	if s := h.svc.Status(); s.State != StateAvailable {
		t.Errorf("status = %+v, want still available", s)
	}
	if len(inst.packages) != 0 {
		t.Error("nothing should be installed")
	}
}

func TestServiceInstallWithoutUpdateIsNoop(t *testing.T) {
	inst := &fakeInstaller{}
	h := newHarness(t, "0.1.0", inst)
	h.svc.Install()
	time.Sleep(50 * time.Millisecond)
	if len(inst.packages) != 0 {
		t.Error("installed without an available update")
	}
}

func TestServiceDevBuildNeverChecks(t *testing.T) {
	var hits int
	srv := httptest.NewTLSServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { hits++ }))
	defer srv.Close()
	svc := &Service{Current: "dev", URL: srv.URL, Client: srv.Client(), Log: slog.New(slog.DiscardHandler)}
	if err := svc.Check(context.Background()); err != nil {
		t.Fatal(err)
	}
	if hits != 0 {
		t.Errorf("dev build fetched the manifest %d times", hits)
	}
}
