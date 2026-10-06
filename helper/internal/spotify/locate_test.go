package spotify

import (
	"errors"
	"testing"
)

func existsIn(paths ...string) func(string) bool {
	set := map[string]bool{}
	for _, p := range paths {
		set[p] = true
	}
	return func(p string) bool { return set[p] }
}

func TestLocateMac(t *testing.T) {
	tests := []struct {
		name    string
		exists  func(string) bool
		want    string
		wantErr error
	}{
		{"system Applications", existsIn("/Applications/Spotify.app/Contents/MacOS/Spotify"), "/Applications/Spotify.app", nil},
		{"user Applications", existsIn("/Users/me/Applications/Spotify.app/Contents/MacOS/Spotify"), "/Users/me/Applications/Spotify.app", nil},
		{"system wins over user", existsIn("/Applications/Spotify.app/Contents/MacOS/Spotify", "/Users/me/Applications/Spotify.app/Contents/MacOS/Spotify"), "/Applications/Spotify.app", nil},
		{"bundle without binary is ignored", existsIn("/Applications/Spotify.app"), "", ErrNotInstalled},
		{"nothing", existsIn(), "", ErrNotInstalled},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := locateMac("/Users/me", tt.exists)
			if !errors.Is(err, tt.wantErr) || got.Path != tt.want {
				t.Fatalf("locateMac = %+v, %v; want %q, %v", got, err, tt.want, tt.wantErr)
			}
		})
	}
}

func TestLocateWindows(t *testing.T) {
	const appData, local = `C:\Users\me\AppData\Roaming`, `C:\Users\me\AppData\Local`
	desktop := `C:\Users\me\AppData\Roaming\Spotify\Spotify.exe`
	store := `C:\Users\me\AppData\Local\Microsoft\WindowsApps\Spotify.exe`
	tests := []struct {
		name    string
		exists  func(string) bool
		want    string
		wantErr error
	}{
		{"desktop install", existsIn(desktop), desktop, nil},
		{"desktop wins over store", existsIn(desktop, store), desktop, nil},
		{"store only", existsIn(store), "", ErrStoreVersion},
		{"nothing", existsIn(), "", ErrNotInstalled},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := locateWindows(appData, local, tt.exists)
			if !errors.Is(err, tt.wantErr) || got.Path != tt.want {
				t.Fatalf("locateWindows = %+v, %v; want %q, %v", got, err, tt.want, tt.wantErr)
			}
		})
	}
}
