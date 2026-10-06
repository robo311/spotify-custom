package store

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"testing"
)

func newStore(t *testing.T) *Store {
	t.Helper()
	s, err := New(t.TempDir(), slog.New(slog.NewTextHandler(io.Discard, nil)))
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func decode(t *testing.T, raw json.RawMessage) map[string]any {
	t.Helper()
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		t.Fatal(err)
	}
	return m
}

func TestSettingsRoundTrip(t *testing.T) {
	s := newStore(t)
	got, err := s.Settings()
	if err != nil || got != nil {
		t.Fatalf("first run Settings() = %s, %v; want nil, nil", got, err)
	}
	if err := s.SaveSettings(json.RawMessage(`{"schema":1,"activeTheme":"nord"}`)); err != nil {
		t.Fatal(err)
	}
	got, err = s.Settings()
	if err != nil || decode(t, got)["activeTheme"] != "nord" {
		t.Fatalf("Settings() = %s, %v", got, err)
	}
}

func TestSaveSettingsRejectsNonObjects(t *testing.T) {
	s := newStore(t)
	for _, doc := range []string{`[]`, `"x"`, `null`, `{`} {
		if err := s.SaveSettings(json.RawMessage(doc)); !errors.Is(err, ErrInvalidDocument) {
			t.Errorf("SaveSettings(%s) err = %v, want ErrInvalidDocument", doc, err)
		}
	}
}

func TestCorruptSettingsStartFresh(t *testing.T) {
	s := newStore(t)
	if err := os.WriteFile(filepath.Join(s.Dir(), "settings.json"), []byte("{oops"), 0o644); err != nil {
		t.Fatal(err)
	}
	if got, err := s.Settings(); err != nil || got != nil {
		t.Fatalf("Settings() = %s, %v; want nil, nil", got, err)
	}
}

func TestSaveThemeStripsFileCSSAndLoadsThemeCSS(t *testing.T) {
	s := newStore(t)
	if err := s.SaveTheme(json.RawMessage(`{"id":"darcula-mine","name":"Mine","fileCss":"x{}"}`)); err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile(filepath.Join(s.Dir(), "themes", "darcula-mine", "theme.json"))
	if err != nil {
		t.Fatal(err)
	}
	if _, has := decode(t, raw)["fileCss"]; has {
		t.Fatal("fileCss was written to theme.json")
	}

	css := "body { color: red }"
	if err := os.WriteFile(filepath.Join(s.Dir(), "themes", "darcula-mine", "theme.css"), []byte(css), 0o644); err != nil {
		t.Fatal(err)
	}
	themes, err := s.Themes()
	if err != nil || len(themes) != 1 {
		t.Fatalf("Themes() = %d themes, %v", len(themes), err)
	}
	if got := decode(t, themes[0]); got["fileCss"] != css || got["name"] != "Mine" {
		t.Fatalf("theme = %v", got)
	}
}

func TestFolderNameIsThemeIdentity(t *testing.T) {
	s := newStore(t)
	dir := filepath.Join(s.Dir(), "themes", "copy-of-nord")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "theme.json"), []byte(`{"id":"nord"}`), 0o644); err != nil {
		t.Fatal(err)
	}
	themes, _ := s.Themes()
	if len(themes) != 1 || decode(t, themes[0])["id"] != "copy-of-nord" {
		t.Fatalf("themes = %s", themes)
	}
}

func TestBrokenThemesAreSkipped(t *testing.T) {
	s := newStore(t)
	for name, body := range map[string]string{"broken": `{nope`, "array": `[1]`, "ok": `{"name":"fine"}`} {
		dir := filepath.Join(s.Dir(), "themes", name)
		if err := os.MkdirAll(dir, 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(dir, "theme.json"), []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	themes, err := s.Themes()
	if err != nil || len(themes) != 1 {
		t.Fatalf("Themes() = %s, %v; want only the valid one", themes, err)
	}
}

func TestThemeIDsCannotEscapeTheDataFolder(t *testing.T) {
	s := newStore(t)
	for _, id := range []string{"../evil", "..", "a/b", `a\b`, "", ".hidden", "x..y", "/abs"} {
		doc, _ := json.Marshal(map[string]string{"id": id})
		if err := s.SaveTheme(doc); !errors.Is(err, ErrInvalidID) {
			t.Errorf("SaveTheme(id=%q) err = %v, want ErrInvalidID", id, err)
		}
		if err := s.DeleteTheme(id); !errors.Is(err, ErrInvalidID) {
			t.Errorf("DeleteTheme(%q) err = %v, want ErrInvalidID", id, err)
		}
	}
	if err := s.SaveTheme(json.RawMessage(`{"name":"no id"}`)); !errors.Is(err, ErrInvalidID) {
		t.Errorf("SaveTheme without id err = %v, want ErrInvalidID", err)
	}
}

func TestDeleteTheme(t *testing.T) {
	s := newStore(t)
	if err := s.SaveTheme(json.RawMessage(`{"id":"gone"}`)); err != nil {
		t.Fatal(err)
	}
	if err := s.DeleteTheme("gone"); err != nil {
		t.Fatal(err)
	}
	if themes, _ := s.Themes(); len(themes) != 0 {
		t.Fatalf("theme still listed: %s", themes)
	}
}

func TestIconPacksAndExtensions(t *testing.T) {
	s := newStore(t)
	pack := filepath.Join(s.Dir(), "icons", "neon")
	if err := os.MkdirAll(pack, 0o755); err != nil {
		t.Fatal(err)
	}
	files := map[string]string{
		filepath.Join(pack, "play.svg"):                "<svg/>",
		filepath.Join(pack, "notes.txt"):               "ignored",
		filepath.Join(s.Dir(), "extensions", "b.js"):   "b()",
		filepath.Join(s.Dir(), "extensions", "a.js"):   "a()",
		filepath.Join(s.Dir(), "extensions", "x.json"): "{}",
	}
	for p, body := range files {
		if err := os.WriteFile(p, []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}

	packs, err := s.IconPacks()
	if err != nil || len(packs) != 1 || packs[0].ID != "neon" || len(packs[0].Icons) != 1 || packs[0].Icons["play"] != "<svg/>" {
		t.Fatalf("IconPacks() = %+v, %v", packs, err)
	}
	exts, err := s.Extensions()
	if err != nil || len(exts) != 2 || exts[0].File != "a.js" || exts[1].Source != "b()" {
		t.Fatalf("Extensions() = %+v, %v", exts, err)
	}
}

func TestRuntimeRoundTrip(t *testing.T) {
	s := newStore(t)
	if rt := s.Runtime(); rt.Port != 0 {
		t.Fatalf("fresh Runtime() = %+v", rt)
	}
	if err := s.SaveRuntime(Runtime{Port: 41234, ControlPort: 41235}); err != nil {
		t.Fatal(err)
	}
	if rt := s.Runtime(); rt.Port != 41234 || rt.ControlPort != 41235 {
		t.Fatalf("Runtime() = %+v", rt)
	}
}

func TestSubDir(t *testing.T) {
	s := newStore(t)
	if _, err := s.SubDir("themes"); err != nil {
		t.Fatal(err)
	}
	if _, err := s.SubDir("../.."); !errors.Is(err, ErrInvalidID) {
		t.Fatalf("SubDir(../..) err = %v", err)
	}
}

func TestEmptyListsEncodeAsArrays(t *testing.T) {
	s := newStore(t)
	themes, _ := s.Themes()
	packs, _ := s.IconPacks()
	exts, _ := s.Extensions()
	for name, v := range map[string]any{"themes": themes, "packs": packs, "exts": exts} {
		if b, _ := json.Marshal(v); string(b) != "[]" {
			t.Errorf("%s encodes as %s, want []", name, b)
		}
	}
}
