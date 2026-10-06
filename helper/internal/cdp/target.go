package cdp

import "strings"

// TargetInfo mirrors the protocol's Target.TargetInfo (fields we use).
type TargetInfo struct {
	TargetID string `json:"targetId"`
	Type     string `json:"type"`
	URL      string `json:"url"`
	Attached bool   `json:"attached"`
}

// spotifyUIHost is where the desktop app serves its main web UI from.
const spotifyUIHost = "https://xpui.app.spotify.com/"

// IsSpotifyUI reports whether a target is Spotify's main UI page (the one we inject into).
func IsSpotifyUI(t TargetInfo) bool {
	return t.Type == "page" && strings.HasPrefix(t.URL, spotifyUIHost)
}
