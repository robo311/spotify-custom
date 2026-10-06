package bridge

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"path/filepath"
	"testing"

	"spotifycustom/internal/audio"
	"spotifycustom/internal/store"
	"spotifycustom/internal/update"
)

type fakeActions struct {
	opened    []string
	restarted int
}

func (f *fakeActions) OpenFolder(p string) error { f.opened = append(f.opened, p); return nil }
func (f *fakeActions) RestartSpotify()           { f.restarted++ }

func newHandler(t *testing.T) (*Handler, *fakeActions) {
	t.Helper()
	s, err := store.New(t.TempDir(), slog.New(slog.NewTextHandler(io.Discard, nil)))
	if err != nil {
		t.Fatal(err)
	}
	a := &fakeActions{}
	return &Handler{Store: s, Actions: a, Updates: &fakeUpdates{}, Version: "1.2.3", Platform: "darwin"}, a
}

func call(t *testing.T, h *Handler, op, args string) (map[string]any, error) {
	t.Helper()
	res, err := h.Handle(context.Background(), op, json.RawMessage(args))
	if err != nil {
		return nil, err
	}
	data, err := json.Marshal(res)
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	_ = json.Unmarshal(data, &m)
	return m, nil
}

func TestGetStateFirstRunMatchesContract(t *testing.T) {
	h, _ := newHandler(t)
	st, err := call(t, h, "getState", "null")
	if err != nil {
		t.Fatal(err)
	}
	if st["settings"] != nil || st["version"] != "1.2.3" || st["platform"] != "darwin" || st["dataDir"] == "" {
		t.Fatalf("state = %v", st)
	}
	for _, k := range []string{"userThemes", "iconPacks", "extensions"} {
		if list, ok := st[k].([]any); !ok || len(list) != 0 {
			t.Errorf("%s = %#v, want []", k, st[k])
		}
	}
}

func TestSaveThenGetState(t *testing.T) {
	h, _ := newHandler(t)
	if _, err := call(t, h, "saveSettings", `{"schema":1,"activeTheme":"mine"}`); err != nil {
		t.Fatal(err)
	}
	if _, err := call(t, h, "saveTheme", `{"schema":1,"id":"mine","name":"Mine"}`); err != nil {
		t.Fatal(err)
	}
	st, _ := call(t, h, "getState", "null")
	if st["settings"].(map[string]any)["activeTheme"] != "mine" {
		t.Fatalf("settings = %v", st["settings"])
	}
	if themes := st["userThemes"].([]any); len(themes) != 1 || themes[0].(map[string]any)["name"] != "Mine" {
		t.Fatalf("userThemes = %v", themes)
	}

	if _, err := call(t, h, "deleteTheme", `{"id":"mine"}`); err != nil {
		t.Fatal(err)
	}
	st, _ = call(t, h, "getState", "null")
	if themes := st["userThemes"].([]any); len(themes) != 0 {
		t.Fatalf("theme not deleted: %v", themes)
	}
}

func TestOpenFolderAndRestart(t *testing.T) {
	h, a := newHandler(t)
	if _, err := call(t, h, "openFolder", `{"sub":"themes"}`); err != nil {
		t.Fatal(err)
	}
	if len(a.opened) != 1 || filepath.Base(a.opened[0]) != "themes" {
		t.Fatalf("opened = %v", a.opened)
	}
	if _, err := call(t, h, "openFolder", `{"sub":"../../etc"}`); !errors.Is(err, store.ErrInvalidID) {
		t.Fatalf("openFolder traversal err = %v", err)
	}
	if _, err := call(t, h, "restartSpotify", "null"); err != nil || a.restarted != 1 {
		t.Fatalf("restart err = %v, restarted = %d", err, a.restarted)
	}
}

func TestRejectsBadInput(t *testing.T) {
	h, _ := newHandler(t)
	if _, err := call(t, h, "nope", "null"); !errors.Is(err, ErrUnknownOp) {
		t.Fatalf("unknown op err = %v", err)
	}
	if _, err := call(t, h, "saveTheme", `{"id":"../x"}`); !errors.Is(err, store.ErrInvalidID) {
		t.Fatalf("saveTheme traversal err = %v", err)
	}
	if _, err := call(t, h, "deleteTheme", `"x"`); err == nil {
		t.Fatal("deleteTheme with bad args succeeded")
	}
}

type fakeAudio struct{ wants []bool }

func (f *fakeAudio) Want(on bool) audio.Status {
	f.wants = append(f.wants, on)
	if on {
		return audio.Status{State: audio.StateListening, LatencyMs: 40}
	}
	return audio.Status{State: audio.StateOff}
}

func TestAudioOpFollowsTheContract(t *testing.T) {
	h, _ := newHandler(t)
	fa := &fakeAudio{}
	h.Audio = fa
	got, err := call(t, h, "audio", `{"on":true}`)
	if err != nil || got["state"] != "listening" || got["latencyMs"] != float64(40) {
		t.Fatalf("audio on → %v, %v", got, err)
	}
	if _, has := got["message"]; has {
		t.Error("empty message should be omitted (AudioStatus.message is optional)")
	}
	if got, _ := call(t, h, "audio", `{"on":false}`); got["state"] != "off" {
		t.Fatalf("audio off → %v", got)
	}
	if len(fa.wants) != 2 || !fa.wants[0] || fa.wants[1] {
		t.Errorf("wants = %v", fa.wants)
	}
	if _, err := call(t, h, "audio", `"on"`); err == nil {
		t.Error("audio with bad args succeeded")
	}
}

type fakeUpdates struct{ installs int }

func (f *fakeUpdates) Status() update.Status {
	return update.Status{State: update.StateAvailable, Current: "1.2.3", Latest: "1.3.0"}
}
func (f *fakeUpdates) Install() { f.installs++ }

func TestUpdateFollowsTheContract(t *testing.T) {
	h, _ := newHandler(t)
	st, err := call(t, h, "getState", "null")
	if err != nil {
		t.Fatal(err)
	}
	u, ok := st["update"].(map[string]any)
	if !ok || u["state"] != "available" || u["current"] != "1.2.3" || u["latest"] != "1.3.0" {
		t.Fatalf("update = %v", st["update"])
	}
	if _, has := u["message"]; has {
		t.Error("empty message should be omitted (UpdateStatus.message is optional)")
	}
	if _, err := call(t, h, "installUpdate", "null"); err != nil {
		t.Fatal(err)
	}
	if n := h.Updates.(*fakeUpdates).installs; n != 1 {
		t.Errorf("installs = %d", n)
	}
}
