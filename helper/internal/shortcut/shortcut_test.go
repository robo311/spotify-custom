package shortcut

import (
	"errors"
	"reflect"
	"testing"
)

const (
	spotifyExe = `C:\Users\me\AppData\Roaming\Spotify\Spotify.exe`
	selfExe    = `C:\Users\me\AppData\Local\Programs\Spotify Custom\SpotifyCustom.exe`
)

type change struct{ Path, Target, Args, Icon string }

type fakeLinks struct {
	links   []Link
	changes []change
	fail    map[string]bool
}

func (f *fakeLinks) Find() ([]Link, error) { return f.links, nil }

func (f *fakeLinks) Retarget(path, target, args, icon string) error {
	if f.fail[path] {
		return errors.New("access denied")
	}
	f.changes = append(f.changes, change{path, target, args, icon})
	return nil
}

func TestSyncOnPointsSpotifyShortcutsAtUs(t *testing.T) {
	f := &fakeLinks{links: []Link{
		{Path: `start\Spotify.lnk`, Target: spotifyExe},
		{Path: `start\Spotify (2).lnk`, Target: `c:\users\ME\appdata\roaming\spotify\spotify.exe`}, // paths are case-insensitive
		{Path: `desktop\Spotify.lnk`, Target: spotifyExe, Args: "--uri=spotify:album:x"},           // not plain: left alone
		{Path: `start\Spotify Custom.lnk`, Target: selfExe},                                        // our own app shortcut
		{Path: `start\Other.lnk`, Target: `C:\Other\other.exe`},
	}}
	n, err := Sync(f, true, spotifyExe, selfExe)
	if err != nil {
		t.Fatal(err)
	}
	want := []change{
		{`start\Spotify.lnk`, selfExe, Marker, spotifyExe},
		{`start\Spotify (2).lnk`, selfExe, Marker, spotifyExe},
	}
	if n != 2 || !reflect.DeepEqual(f.changes, want) {
		t.Fatalf("n=%d changes=%+v\nwant %+v", n, f.changes, want)
	}
}

func TestSyncOnIsIdempotentAndFollowsAMovedApp(t *testing.T) {
	f := &fakeLinks{links: []Link{
		{Path: `start\Spotify.lnk`, Target: selfExe, Args: Marker},                            // already ours
		{Path: `desktop\Spotify.lnk`, Target: `D:\Old place\SpotifyCustom.exe`, Args: Marker}, // ours, app moved since
	}}
	n, err := Sync(f, true, spotifyExe, selfExe)
	if err != nil {
		t.Fatal(err)
	}
	want := []change{{`desktop\Spotify.lnk`, selfExe, Marker, spotifyExe}}
	if n != 1 || !reflect.DeepEqual(f.changes, want) {
		t.Fatalf("n=%d changes=%+v", n, f.changes)
	}
}

func TestSyncOffRestoresOnlyOurs(t *testing.T) {
	f := &fakeLinks{links: []Link{
		{Path: `start\Spotify.lnk`, Target: selfExe, Args: Marker},
		{Path: `desktop\Spotify.lnk`, Target: `D:\Old place\SpotifyCustom.exe`, Args: Marker},
		{Path: `desktop\Spotify (plain).lnk`, Target: spotifyExe},
		{Path: `start\Spotify Custom.lnk`, Target: selfExe},
	}}
	n, err := Sync(f, false, spotifyExe, selfExe)
	if err != nil {
		t.Fatal(err)
	}
	want := []change{
		{`start\Spotify.lnk`, spotifyExe, "", spotifyExe},
		{`desktop\Spotify.lnk`, spotifyExe, "", spotifyExe},
	}
	if n != 2 || !reflect.DeepEqual(f.changes, want) {
		t.Fatalf("n=%d changes=%+v", n, f.changes)
	}
}

// Windows groups a window with a taskbar pin by the program the pin opens: a pin pointed at us left Spotify's window
// with a second icon (and a broken pin after restarts), so pins are never pointed at us and ours are given back.
func TestSyncNeverPointsTaskbarPinsAtUs(t *testing.T) {
	f := &fakeLinks{links: []Link{
		{Path: `taskbar\Spotify.lnk`, Target: spotifyExe, Pinned: true},
		{Path: `taskbar\Spotify (2).lnk`, Target: selfExe, Args: Marker, Pinned: true}, // pointed at us by 0.2.2–0.4.1
		{Path: `start\Spotify.lnk`, Target: spotifyExe},
	}}
	n, err := Sync(f, true, spotifyExe, selfExe)
	if err != nil {
		t.Fatal(err)
	}
	want := []change{
		{`taskbar\Spotify (2).lnk`, spotifyExe, "", spotifyExe},
		{`start\Spotify.lnk`, selfExe, Marker, spotifyExe},
	}
	if n != 2 || !reflect.DeepEqual(f.changes, want) {
		t.Fatalf("n=%d changes=%+v\nwant %+v", n, f.changes, want)
	}
}

func TestSyncKeepsGoingPastAFailure(t *testing.T) {
	f := &fakeLinks{
		links: []Link{{Path: `a\Spotify.lnk`, Target: spotifyExe}, {Path: `b\Spotify.lnk`, Target: spotifyExe}},
		fail:  map[string]bool{`a\Spotify.lnk`: true},
	}
	n, err := Sync(f, true, spotifyExe, selfExe)
	if err == nil || n != 1 || len(f.changes) != 1 || f.changes[0].Path != `b\Spotify.lnk` {
		t.Fatalf("n=%d err=%v changes=%+v; want b changed and a's error reported", n, err, f.changes)
	}
}
