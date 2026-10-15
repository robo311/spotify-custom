package main

import (
	"errors"
	"testing"

	"spotifycustom/internal/store"
)

type fakeRuntime struct{ rt store.Runtime }

func (f *fakeRuntime) Runtime() store.Runtime             { return f.rt }
func (f *fakeRuntime) SaveRuntime(rt store.Runtime) error { f.rt = rt; return nil }

func TestLoginDefault(t *testing.T) {
	const installed = `C:\Users\me\AppData\Local\Programs\Spotify Custom\SpotifyCustom.exe`
	tests := []struct {
		name        string
		rt          store.Runtime
		exe         string
		release     bool
		wantEnabled bool
		wantMarked  bool
	}{
		{"first run of an installed release → on, once", store.Runtime{}, installed, true, true, true},
		{"already defaulted → the user's choice stands", store.Runtime{LoginDefaulted: true}, installed, true, false, true},
		{"dev build → never", store.Runtime{}, installed, false, false, false},
		{"copy on a disk image → not yet (the installed copy will)", store.Runtime{}, "/Volumes/Spotify Custom/Spotify Custom.app/Contents/MacOS/spotifycustom", true, false, false},
		{"make release build in the repo → never", store.Runtime{}, "/Users/me/spotify-custom/dist/SpotifyCustom.app/Contents/MacOS/SpotifyCustom", true, false, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rt := &fakeRuntime{rt: tt.rt}
			var enabled []string
			err := applyLoginDefault(rt, tt.exe, tt.release, func(exe string) error { enabled = append(enabled, exe); return nil })
			if err != nil {
				t.Fatal(err)
			}
			if got := len(enabled) == 1; got != tt.wantEnabled {
				t.Errorf("enabled = %v, want %v", enabled, tt.wantEnabled)
			}
			if rt.rt.LoginDefaulted != tt.wantMarked {
				t.Errorf("LoginDefaulted = %v, want %v", rt.rt.LoginDefaulted, tt.wantMarked)
			}
		})
	}
}

// Healing the login item re-points it at the running copy; only an installed release may own it. A `go run`
// dev helper used to claim it with a binary in Go's build cache.
func TestOwnsLoginItem(t *testing.T) {
	for _, tt := range []struct {
		exe     string
		release bool
		want    bool
	}{
		{"/Applications/SpotifyCustom.app/Contents/MacOS/SpotifyCustom", true, true},
		{"/Users/me/Library/Caches/go-build/ff/ff55-d/spotifycustom", false, false},
		{"/Users/me/spotify-custom/dist/SpotifyCustom.app/Contents/MacOS/SpotifyCustom", true, false},
		{"/Volumes/Spotify Custom/SpotifyCustom.app/Contents/MacOS/SpotifyCustom", true, false},
	} {
		if got := ownsLoginItem(tt.exe, tt.release); got != tt.want {
			t.Errorf("ownsLoginItem(%q, %v) = %v, want %v", tt.exe, tt.release, got, tt.want)
		}
	}
}

// A failed registration is retried on the next start instead of being marked as done.
func TestLoginDefaultRetriesAfterFailure(t *testing.T) {
	rt := &fakeRuntime{}
	err := applyLoginDefault(rt, `C:\x\SpotifyCustom.exe`, true, func(string) error { return errors.New("registry busy") })
	if err == nil || rt.rt.LoginDefaulted {
		t.Fatalf("err = %v, LoginDefaulted = %v; want error and not marked", err, rt.rt.LoginDefaulted)
	}
}
