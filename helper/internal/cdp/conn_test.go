package cdp_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"spotifycustom/internal/cdp"
	"spotifycustom/internal/cdp/cdptest"
)

func dial(t *testing.T, s *cdptest.Server) *cdp.Conn {
	t.Helper()
	c, err := cdp.Dial(context.Background(), s.BrowserURL())
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	t.Cleanup(func() { _ = c.Close() })
	return c
}

func TestCallDecodesResultAndScopesSession(t *testing.T) {
	s := cdptest.New(t)
	s.Handle("Runtime.evaluate", func(c cdptest.Call) (any, error) {
		return map[string]any{"result": map[string]any{"value": 42}}, nil
	})
	c := dial(t, s)

	var out struct {
		Result struct {
			Value int `json:"value"`
		} `json:"result"`
	}
	if err := c.Call(context.Background(), "S1", "Runtime.evaluate", map[string]string{"expression": "6*7"}, &out); err != nil {
		t.Fatal(err)
	}
	if out.Result.Value != 42 {
		t.Fatalf("value = %d, want 42", out.Result.Value)
	}
	if got := s.WaitFor("Runtime.evaluate", 1)[0].SessionID; got != "S1" {
		t.Fatalf("sessionId = %q, want S1", got)
	}
}

func TestCallReturnsRemoteError(t *testing.T) {
	s := cdptest.New(t)
	s.Handle("Page.enable", func(cdptest.Call) (any, error) { return nil, errors.New("boom") })
	c := dial(t, s)

	err := c.Call(context.Background(), "", "Page.enable", nil, nil)
	var remote *cdp.RemoteError
	if !errors.As(err, &remote) || remote.Message != "boom" || remote.Method != "Page.enable" {
		t.Fatalf("err = %v, want RemoteError boom from Page.enable", err)
	}
}

func TestEventsAreDelivered(t *testing.T) {
	s := cdptest.New(t)
	c := dial(t, s)
	// A round-trip guarantees the server has registered the connection before we emit.
	if err := c.Call(context.Background(), "", "Browser.getVersion", nil, nil); err != nil {
		t.Fatal(err)
	}
	s.Emit("S9", "Runtime.bindingCalled", map[string]string{"name": "__scHelper"})

	select {
	case ev := <-c.Events():
		if ev.Method != "Runtime.bindingCalled" || ev.SessionID != "S9" {
			t.Fatalf("event = %+v", ev)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("no event")
	}
}

func TestConnectionLossFailsCallsAndClosesDone(t *testing.T) {
	s := cdptest.New(t)
	c := dial(t, s)
	if err := c.Call(context.Background(), "", "Browser.getVersion", nil, nil); err != nil {
		t.Fatal(err)
	}
	s.DropConnections()

	select {
	case <-c.Done():
	case <-time.After(2 * time.Second):
		t.Fatal("Done not closed after connection loss")
	}
	if err := c.Call(context.Background(), "", "Browser.getVersion", nil, nil); !errors.Is(err, cdp.ErrClosed) {
		t.Fatalf("err = %v, want ErrClosed", err)
	}
}

func TestDiscoverTrustsOnlySpotify(t *testing.T) {
	s := cdptest.New(t)
	ep, err := cdp.Discover(context.Background(), s.Port())
	if err != nil || ep.BrowserURL != s.BrowserURL() {
		t.Fatalf("Discover = %+v, %v", ep, err)
	}

	s.SetUserAgent("Mozilla/5.0 Chrome/151.0 Safari/537.36")
	if _, err := cdp.Discover(context.Background(), s.Port()); !errors.Is(err, cdp.ErrNotSpotify) {
		t.Fatalf("err = %v, want ErrNotSpotify", err)
	}
}

func TestIsSpotifyUI(t *testing.T) {
	tests := []struct {
		info cdp.TargetInfo
		want bool
	}{
		{cdp.TargetInfo{Type: "page", URL: "https://xpui.app.spotify.com/index.html"}, true},
		{cdp.TargetInfo{Type: "browser_ui", URL: "https://xpui.app.spotify.com/index.html"}, false},
		{cdp.TargetInfo{Type: "page", URL: "chrome://omnibox-popup.top-chrome/"}, false},
		{cdp.TargetInfo{Type: "page", URL: "https://evil.example/xpui.app.spotify.com/"}, false},
	}
	for _, tt := range tests {
		if got := cdp.IsSpotifyUI(tt.info); got != tt.want {
			t.Errorf("IsSpotifyUI(%+v) = %v, want %v", tt.info, got, tt.want)
		}
	}
}
