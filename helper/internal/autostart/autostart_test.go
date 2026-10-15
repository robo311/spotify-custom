package autostart

import "testing"

func TestTemporary(t *testing.T) {
	for _, tc := range []struct {
		exe  string
		want bool
	}{
		{"/Applications/SpotifyCustom.app/Contents/MacOS/spotifycustom", false},
		{"/Users/me/Applications/SpotifyCustom.app/Contents/MacOS/spotifycustom", false},
		{"/Volumes/Spotify Custom/SpotifyCustom.app/Contents/MacOS/spotifycustom", true},
		{"/private/var/folders/x/T/AppTranslocation/ABC/d/SpotifyCustom.app/Contents/MacOS/spotifycustom", true},
		{`C:\Users\me\AppData\Local\Programs\SpotifyCustom\SpotifyCustom.exe`, false},
	} {
		if got := Temporary(tc.exe); got != tc.want {
			t.Errorf("Temporary(%q) = %v, want %v", tc.exe, got, tc.want)
		}
	}
}

func TestLocalBuild(t *testing.T) {
	for _, tc := range []struct {
		exe  string
		want bool
	}{
		{"/Users/me/code/spotify-custom/dist/SpotifyCustom.app/Contents/MacOS/SpotifyCustom", true},
		{`C:\code\spotify-custom\dist\SpotifyCustom.exe`, true},
		{"/Applications/SpotifyCustom.app/Contents/MacOS/SpotifyCustom", false},
		{`C:\Users\me\AppData\Local\Programs\SpotifyCustom\SpotifyCustom.exe`, false},
	} {
		if got := LocalBuild(tc.exe); got != tc.want {
			t.Errorf("LocalBuild(%q) = %v, want %v", tc.exe, got, tc.want)
		}
	}
}
