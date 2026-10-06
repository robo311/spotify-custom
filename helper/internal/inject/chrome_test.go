//go:build chrome

// Regression test against a real Chromium (Spotify's UI runs in CEF/Chromium): after Page.reload the
// payload must run again at document start and reach the helper through the binding.
//
//	go test -tags chrome ./internal/inject -run Chrome      (CHROME=/path/to/chrome to override)
//	SC_PAYLOAD=../payload/dist/payload.js go test -tags chrome ./internal/inject -run Chrome
package inject_test

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"spotifycustom/internal/bridge"
	"spotifycustom/internal/cdp"
	"spotifycustom/internal/inject"
	"spotifycustom/internal/store"
)

// stubPayload mimics the real payload's contract: boot at document start, call getState over the
// binding, receive the reply on window.__sc.bridge.
const stubPayload = `
window.__boots = (window.__boots || 0) + 1;
window.__sc = { bridge: { reply(id, ok, result) { window.__reply = { id, ok, platform: result && result.platform } } } };
window.__scHelper(JSON.stringify({ id: 1, op: 'getState', args: null }));
`

const page = `<!doctype html><html><head><title>t</title></head><body><div data-testid="root"></div></body></html>`

func startChrome(t *testing.T) string {
	t.Helper()
	bin := os.Getenv("CHROME")
	if bin == "" {
		bin = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
	}
	if _, err := os.Stat(bin); err != nil {
		t.Skip("Chrome not found; set CHROME")
	}
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	port := ln.Addr().(*net.TCPAddr).Port
	ln.Close()

	cmd := exec.Command(bin, "--headless=new", "--no-first-run", "--remote-debugging-port="+strconv.Itoa(port),
		"--user-data-dir="+t.TempDir(), "about:blank")
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = cmd.Process.Kill(); _ = cmd.Wait() })

	deadline := time.Now().Add(15 * time.Second)
	for time.Now().Before(deadline) {
		resp, err := http.Get(fmt.Sprintf("http://127.0.0.1:%d/json/version", port))
		if err == nil {
			var v struct {
				URL string `json:"webSocketDebuggerUrl"`
			}
			err = json.NewDecoder(resp.Body).Decode(&v)
			resp.Body.Close()
			if err == nil && v.URL != "" {
				return v.URL
			}
		}
		time.Sleep(100 * time.Millisecond)
	}
	t.Fatal("Chrome DevTools did not come up")
	return ""
}

func TestChromeReloadReinjectsAndKeepsBridge(t *testing.T) {
	browserURL := startChrome(t)
	site := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		_, _ = io.WriteString(w, page)
	}))
	defer site.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Observer connection: owns the test page and checks state, independent of the injector's session.
	obs, err := cdp.Dial(ctx, browserURL)
	if err != nil {
		t.Fatal(err)
	}
	defer obs.Close()
	var created struct {
		TargetID string `json:"targetId"`
	}
	if err := obs.Call(ctx, "", "Target.createTarget", map[string]any{"url": site.URL}, &created); err != nil {
		t.Fatal(err)
	}
	var att struct {
		SessionID string `json:"sessionId"`
	}
	if err := obs.Call(ctx, "", "Target.attachToTarget", map[string]any{"targetId": created.TargetID, "flatten": true}, &att); err != nil {
		t.Fatal(err)
	}
	// Collect page exceptions so a failure says why the payload didn't boot.
	var exMu sync.Mutex
	var exceptions []string
	if err := obs.Call(ctx, att.SessionID, "Runtime.enable", nil, nil); err != nil {
		t.Fatal(err)
	}
	go func() {
		for ev := range obs.Events() {
			if ev.Method != "Runtime.exceptionThrown" {
				continue
			}
			var p struct {
				Details struct {
					Text      string `json:"text"`
					Exception struct {
						Description string `json:"description"`
					} `json:"exception"`
				} `json:"exceptionDetails"`
			}
			if json.Unmarshal(ev.Params, &p) == nil {
				exMu.Lock()
				exceptions = append(exceptions, p.Details.Text+" "+p.Details.Exception.Description)
				exMu.Unlock()
			}
		}
	}()
	eval := func(expr string) string {
		var r struct {
			Result struct {
				Value any `json:"value"`
			} `json:"result"`
		}
		if err := obs.Call(ctx, att.SessionID, "Runtime.evaluate", map[string]any{"expression": expr, "returnByValue": true}, &r); err != nil {
			t.Fatal(err)
		}
		if s, ok := r.Result.Value.(string); ok {
			return s
		}
		b, _ := json.Marshal(r.Result.Value)
		return string(b)
	}

	payloadSrc, check := inject.Payload(staticSource(stubPayload)), `JSON.stringify({boots: window.__boots, reply: window.__reply})`
	want := `{"boots":1,"reply":{"id":1,"ok":true,"platform":"test"}}`
	if p := os.Getenv("SC_PAYLOAD"); p != "" {
		payloadSrc = inject.File{Path: p}
		check = `JSON.stringify({sc: typeof window.__sc, connected: window.__sc?.store?.get().helper.connected})`
		want = `{"sc":"object","connected":true}`
	}

	st, err := store.New(t.TempDir(), slog.New(slog.NewTextHandler(io.Discard, nil)))
	if err != nil {
		t.Fatal(err)
	}
	conn, err := cdp.Dial(ctx, browserURL)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	in := &inject.Injector{
		Payload: payloadSrc,
		Handler: &bridge.Handler{Store: st, Platform: "test"},
		Log:     slog.New(slog.NewTextHandler(testLog{t}, nil)),
		Match:   func(ti cdp.TargetInfo) bool { return ti.Type == "page" && strings.HasPrefix(ti.URL, site.URL) },
	}
	runCtx, stop := context.WithCancel(ctx)
	defer stop()
	go func() { _ = in.Run(runCtx, conn) }()

	waitFor := func(what string) string {
		t.Helper()
		var got string
		for deadline := time.Now().Add(10 * time.Second); time.Now().Before(deadline); time.Sleep(100 * time.Millisecond) {
			if got = eval(check); got == want {
				return got
			}
		}
		exMu.Lock()
		defer exMu.Unlock()
		t.Fatalf("%s: got %s, want %s\npage exceptions: %q", what, got, want, exceptions)
		return got
	}

	waitFor("initial injection")
	for i := range 2 {
		if err := obs.Call(ctx, att.SessionID, "Page.reload", nil, nil); err != nil {
			t.Fatal(err)
		}
		time.Sleep(300 * time.Millisecond) // let the old document go away before polling
		waitFor(fmt.Sprintf("after reload %d", i+1))
	}
}

type staticSource string

func (s staticSource) Source() (string, error) { return string(s), nil }

// testLog sends the injector's log to the test output (shown on failure or with -v).
type testLog struct{ t *testing.T }

func (l testLog) Write(p []byte) (int, error) {
	l.t.Log(strings.TrimSpace(string(p)))
	return len(p), nil
}
