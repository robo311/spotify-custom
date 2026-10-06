//go:build live

// Live smoke test against a running Spotify: go test -tags live ./internal/cdp -run Live
// Requires Spotify started with --remote-debugging-port (SC_PORT, default 9222).
package cdp

import (
	"context"
	"os"
	"strconv"
	"testing"
	"time"
)

func TestLiveConnect(t *testing.T) {
	port := 9222
	if p, err := strconv.Atoi(os.Getenv("SC_PORT")); err == nil {
		port = p
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	ep, err := Discover(ctx, port)
	if err != nil {
		t.Fatalf("discover: %v", err)
	}
	conn, err := Dial(ctx, ep.BrowserURL)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	defer conn.Close()

	var res struct {
		TargetInfos []TargetInfo `json:"targetInfos"`
	}
	if err := conn.Call(ctx, "", "Target.getTargets", nil, &res); err != nil {
		t.Fatalf("getTargets: %v", err)
	}
	found := false
	for _, ti := range res.TargetInfos {
		t.Logf("target %s %s", ti.Type, ti.URL)
		if IsSpotifyUI(ti) {
			found = true
		}
	}
	if !found {
		t.Fatal("xpui page target not found")
	}
}
