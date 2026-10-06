//go:build live

// Read-only live checks against the installed Spotify: go test -tags live ./internal/spotify
package spotify

import "testing"

func TestLiveLocateAndStatus(t *testing.T) {
	c, err := NewController(NewPlatform())
	if err != nil {
		t.Fatalf("locate: %v", err)
	}
	p, running, err := c.Status()
	if err != nil {
		t.Fatalf("status: %v", err)
	}
	t.Logf("install=%s running=%v pid=%d uptime=%s", c.Install().Path, running, p.PID, p.Uptime)
}
