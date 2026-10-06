// Package store owns the user's data folder: settings, user themes, icon packs, user extensions and
// runtime state. The payload owns the theme/settings schema; the helper stores those documents as
// opaque JSON objects and only looks at the fields it needs (a theme's id), so the two never drift.
package store

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log/slog"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
)

// Size limits for files read from the user's folder; anything larger is skipped as not ours.
const (
	maxDocumentBytes  = 4 << 20
	maxIconBytes      = 256 << 10
	maxExtensionBytes = 2 << 20
)

// Subfolders the user can open from the UI.
const (
	DirThemes     = "themes"
	DirIcons      = "icons"
	DirExtensions = "extensions"
)

var (
	// ErrInvalidID rejects ids that are not a single safe path segment.
	ErrInvalidID = errors.New("invalid id")
	// ErrInvalidDocument rejects JSON that is not an object.
	ErrInvalidDocument = errors.New("document must be a JSON object")

	safeID = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$`)
)

// ValidID reports whether id can be used as a folder name inside the data dir without escaping it.
func ValidID(id string) bool {
	return safeID.MatchString(id) && !strings.Contains(id, "..")
}

// IconPack mirrors the payload's IconPack.
type IconPack struct {
	ID    string            `json:"id"`
	Name  string            `json:"name"`
	Icons map[string]string `json:"icons"`
}

// ExtensionFile mirrors the payload's UserExtensionFile.
type ExtensionFile struct {
	File   string `json:"file"`
	Source string `json:"source"`
}

// Runtime is helper-private state that survives restarts.
type Runtime struct {
	Port        int `json:"port"`
	ControlPort int `json:"controlPort,omitempty"`
}

// Store reads and writes the data folder.
type Store struct {
	dir string
	log *slog.Logger
}

// New returns a Store rooted at dir, creating the folder layout if needed.
func New(dir string, log *slog.Logger) (*Store, error) {
	for _, sub := range []string{"", DirThemes, DirIcons, DirExtensions} {
		if err := os.MkdirAll(filepath.Join(dir, sub), 0o755); err != nil {
			return nil, fmt.Errorf("create data folder: %w", err)
		}
	}
	return &Store{dir: dir, log: log}, nil
}

// Dir is the data folder root.
func (s *Store) Dir() string { return s.dir }

// SubDir resolves one of the user-facing subfolders ("" = root).
func (s *Store) SubDir(sub string) (string, error) {
	switch sub {
	case "", DirThemes, DirIcons, DirExtensions:
		return filepath.Join(s.dir, sub), nil
	}
	return "", fmt.Errorf("unknown folder %q: %w", sub, ErrInvalidID)
}

// Settings returns settings.json, or nil if it does not exist yet (first run).
func (s *Store) Settings() (json.RawMessage, error) {
	data, err := readLimited(filepath.Join(s.dir, "settings.json"), maxDocumentBytes)
	if errors.Is(err, fs.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("read settings: %w", err)
	}
	if _, err := asObject(data); err != nil {
		s.log.Warn("settings.json is not valid; starting fresh", "err", err)
		return nil, nil
	}
	return data, nil
}

// SaveSettings replaces settings.json.
func (s *Store) SaveSettings(doc json.RawMessage) error {
	obj, err := asObject(doc)
	if err != nil {
		return fmt.Errorf("save settings: %w", err)
	}
	return writeJSON(filepath.Join(s.dir, "settings.json"), obj)
}

// Themes returns every user theme. The folder name is the theme's identity, so it overrides any id
// inside the file (a copied-and-renamed folder becomes a separate theme). theme.css becomes fileCss.
func (s *Store) Themes() ([]json.RawMessage, error) {
	root := filepath.Join(s.dir, DirThemes)
	entries, err := os.ReadDir(root)
	if err != nil {
		return nil, fmt.Errorf("list themes: %w", err)
	}
	themes := []json.RawMessage{}
	for _, e := range entries {
		if !e.IsDir() || !ValidID(e.Name()) {
			continue
		}
		theme, err := s.readTheme(filepath.Join(root, e.Name()), e.Name())
		if err != nil {
			s.log.Warn("skipping theme", "id", e.Name(), "err", err)
			continue
		}
		themes = append(themes, theme)
	}
	return themes, nil
}

func (s *Store) readTheme(dir, id string) (json.RawMessage, error) {
	data, err := readLimited(filepath.Join(dir, "theme.json"), maxDocumentBytes)
	if err != nil {
		return nil, err
	}
	obj, err := asObject(data)
	if err != nil {
		return nil, err
	}
	obj["id"] = mustJSON(id)
	css, err := readLimited(filepath.Join(dir, "theme.css"), maxDocumentBytes)
	switch {
	case err == nil:
		obj["fileCss"] = mustJSON(string(css))
	case !errors.Is(err, fs.ErrNotExist):
		return nil, err
	}
	return json.Marshal(obj)
}

// SaveTheme writes themes/<id>/theme.json. fileCss is never written back: theme.css is the user's file.
func (s *Store) SaveTheme(doc json.RawMessage) error {
	obj, err := asObject(doc)
	if err != nil {
		return fmt.Errorf("save theme: %w", err)
	}
	var id string
	if err := json.Unmarshal(obj["id"], &id); err != nil || !ValidID(id) {
		return fmt.Errorf("save theme %q: %w", id, ErrInvalidID)
	}
	delete(obj, "fileCss")
	dir := filepath.Join(s.dir, DirThemes, id)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("save theme %q: %w", id, err)
	}
	return writeJSON(filepath.Join(dir, "theme.json"), obj)
}

// DeleteTheme removes a user theme folder (including a hand-written theme.css).
func (s *Store) DeleteTheme(id string) error {
	if !ValidID(id) {
		return fmt.Errorf("delete theme %q: %w", id, ErrInvalidID)
	}
	if err := os.RemoveAll(filepath.Join(s.dir, DirThemes, id)); err != nil {
		return fmt.Errorf("delete theme %q: %w", id, err)
	}
	return nil
}

// IconPacks returns user icon packs: icons/<pack>/<icon-name>.svg.
func (s *Store) IconPacks() ([]IconPack, error) {
	root := filepath.Join(s.dir, DirIcons)
	entries, err := os.ReadDir(root)
	if err != nil {
		return nil, fmt.Errorf("list icon packs: %w", err)
	}
	packs := []IconPack{}
	for _, e := range entries {
		if !e.IsDir() || !ValidID(e.Name()) {
			continue
		}
		icons := map[string]string{}
		files, err := os.ReadDir(filepath.Join(root, e.Name()))
		if err != nil {
			s.log.Warn("skipping icon pack", "pack", e.Name(), "err", err)
			continue
		}
		for _, f := range files {
			name, ok := strings.CutSuffix(f.Name(), ".svg")
			if f.IsDir() || !ok || name == "" {
				continue
			}
			svg, err := readLimited(filepath.Join(root, e.Name(), f.Name()), maxIconBytes)
			if err != nil {
				s.log.Warn("skipping icon", "pack", e.Name(), "file", f.Name(), "err", err)
				continue
			}
			icons[name] = string(svg)
		}
		packs = append(packs, IconPack{ID: e.Name(), Name: e.Name(), Icons: icons})
	}
	return packs, nil
}

// Extensions returns user extension sources: extensions/*.js, sorted by file name.
func (s *Store) Extensions() ([]ExtensionFile, error) {
	root := filepath.Join(s.dir, DirExtensions)
	entries, err := os.ReadDir(root)
	if err != nil {
		return nil, fmt.Errorf("list extensions: %w", err)
	}
	exts := []ExtensionFile{}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".js") {
			continue
		}
		src, err := readLimited(filepath.Join(root, e.Name()), maxExtensionBytes)
		if err != nil {
			s.log.Warn("skipping extension", "file", e.Name(), "err", err)
			continue
		}
		exts = append(exts, ExtensionFile{File: e.Name(), Source: string(src)})
	}
	slices.SortFunc(exts, func(a, b ExtensionFile) int { return strings.Compare(a.File, b.File) })
	return exts, nil
}

// Runtime returns runtime.json (zero value if missing or unreadable).
func (s *Store) Runtime() Runtime {
	var rt Runtime
	data, err := readLimited(filepath.Join(s.dir, "runtime.json"), maxDocumentBytes)
	if err == nil {
		if err := json.Unmarshal(data, &rt); err != nil {
			s.log.Warn("runtime.json unreadable; ignoring", "err", err)
			return Runtime{}
		}
	}
	return rt
}

// SaveRuntime replaces runtime.json.
func (s *Store) SaveRuntime(rt Runtime) error {
	return writeJSON(filepath.Join(s.dir, "runtime.json"), rt)
}

func asObject(data []byte) (map[string]json.RawMessage, error) {
	var obj map[string]json.RawMessage
	if err := json.Unmarshal(data, &obj); err != nil || obj == nil {
		return nil, ErrInvalidDocument
	}
	return obj, nil
}

func mustJSON(v string) json.RawMessage {
	data, _ := json.Marshal(v) // marshalling a string cannot fail
	return data
}

func readLimited(path string, limit int64) ([]byte, error) {
	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}
	if info.Size() > limit {
		return nil, fmt.Errorf("%s is larger than %d bytes", filepath.Base(path), limit)
	}
	return os.ReadFile(path)
}

func writeJSON(path string, v any) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return fmt.Errorf("encode %s: %w", filepath.Base(path), err)
	}
	return WriteFileAtomic(path, append(data, '\n'))
}

// WriteFileAtomic writes via a temp file + rename so a crash never leaves a half-written file.
func WriteFileAtomic(path string, data []byte) error {
	tmp, err := os.CreateTemp(filepath.Dir(path), "."+filepath.Base(path)+".*.tmp")
	if err != nil {
		return fmt.Errorf("write %s: %w", filepath.Base(path), err)
	}
	defer os.Remove(tmp.Name()) // no-op after a successful rename

	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return fmt.Errorf("write %s: %w", filepath.Base(path), err)
	}
	if err := tmp.Sync(); err != nil {
		tmp.Close()
		return fmt.Errorf("write %s: %w", filepath.Base(path), err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("write %s: %w", filepath.Base(path), err)
	}
	if err := os.Rename(tmp.Name(), path); err != nil {
		return fmt.Errorf("write %s: %w", filepath.Base(path), err)
	}
	return nil
}
