package cdp

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// ErrNotSpotify means something answers on the port, but it is not Spotify's DevTools endpoint.
var ErrNotSpotify = errors.New("cdp: endpoint is not Spotify")

// Endpoint describes a verified Spotify DevTools endpoint.
type Endpoint struct {
	BrowserURL string // ws://127.0.0.1:<port>/devtools/browser/<id>
	UserAgent  string
}

type versionInfo struct {
	UserAgent  string `json:"User-Agent"`
	BrowserURL string `json:"webSocketDebuggerUrl"`
}

// Discover asks 127.0.0.1:<port>/json/version for the browser WebSocket URL and only trusts it when
// the User-Agent identifies Spotify, so we never inject into some other Chromium on that port.
func Discover(ctx context.Context, port int) (Endpoint, error) {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	url := fmt.Sprintf("http://127.0.0.1:%d/json/version", port)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return Endpoint{}, fmt.Errorf("discover: %w", err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return Endpoint{}, fmt.Errorf("discover: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return Endpoint{}, fmt.Errorf("discover: %s: %w", resp.Status, ErrNotSpotify)
	}

	var info versionInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return Endpoint{}, fmt.Errorf("discover: decode: %w", ErrNotSpotify)
	}
	if !IsSpotify(info.UserAgent) || info.BrowserURL == "" {
		return Endpoint{}, ErrNotSpotify
	}
	return Endpoint{BrowserURL: info.BrowserURL, UserAgent: info.UserAgent}, nil
}

// IsSpotify reports whether a DevTools User-Agent belongs to the Spotify desktop app.
func IsSpotify(userAgent string) bool {
	return strings.Contains(userAgent, " Spotify/")
}
