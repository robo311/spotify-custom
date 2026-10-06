package spotify

import (
	"testing"
	"time"
)

func TestFindMacMain(t *testing.T) {
	out := `  101    01:02:03 /usr/libexec/something
  202       29:09 /Applications/Spotify.app/Contents/MacOS/Spotify
  203       29:08 /Applications/Spotify.app/Contents/Frameworks/Spotify Helper (Renderer).app/Contents/MacOS/Spotify Helper (Renderer)
`
	p, ok, err := findMacMain(out)
	if err != nil || !ok || p.PID != 202 || p.Uptime != 29*time.Minute+9*time.Second {
		t.Fatalf("findMacMain = %+v, %v, %v", p, ok, err)
	}
	if _, ok, _ := findMacMain("  1 00:01 /sbin/launchd\n"); ok {
		t.Fatal("found Spotify where there is none")
	}
	if _, ok, _ := findMacMain("  7 00:05 /Users/Jane Doe/Applications/Spotify.app/Contents/MacOS/Spotify\n"); !ok {
		t.Fatal("missed Spotify installed under a path with spaces")
	}
}

func TestParseEtime(t *testing.T) {
	tests := map[string]time.Duration{
		"00:07":       7 * time.Second,
		"29:09":       29*time.Minute + 9*time.Second,
		"01:02:03":    time.Hour + 2*time.Minute + 3*time.Second,
		"2-03:04:05":  51*time.Hour + 4*time.Minute + 5*time.Second,
		"12-00:00:00": 288 * time.Hour,
	}
	for in, want := range tests {
		if got, err := parseEtime(in); err != nil || got != want {
			t.Errorf("parseEtime(%q) = %v, %v; want %v", in, got, err, want)
		}
	}
	for _, bad := range []string{"", "5", "a:b", "1:2:3:4", "x-01:02"} {
		if _, err := parseEtime(bad); err == nil {
			t.Errorf("parseEtime(%q) succeeded, want error", bad)
		}
	}
}
