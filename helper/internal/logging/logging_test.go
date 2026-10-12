package logging

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestRotatesAtLimitKeepingOnePreviousFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "helper.log")
	w, err := OpenRotating(path, 100)
	if err != nil {
		t.Fatal(err)
	}
	defer w.Close()

	line := strings.Repeat("a", 39) + "\n" // 40 bytes
	for range 3 {                          // 120 bytes → third write rotates
		if _, err := w.Write([]byte(line)); err != nil {
			t.Fatal(err)
		}
	}
	cur, _ := os.ReadFile(path)
	prev, _ := os.ReadFile(path + ".1")
	if len(cur) != 40 || len(prev) != 80 {
		t.Fatalf("current=%d bytes previous=%d bytes, want 40 and 80", len(cur), len(prev))
	}
}

func TestReopenContinuesCountingExistingSize(t *testing.T) {
	path := filepath.Join(t.TempDir(), "helper.log")
	if err := os.WriteFile(path, []byte(strings.Repeat("x", 90)), 0o644); err != nil {
		t.Fatal(err)
	}
	w, err := OpenRotating(path, 100)
	if err != nil {
		t.Fatal(err)
	}
	defer w.Close()
	if _, err := w.Write([]byte(strings.Repeat("y", 20))); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(path + ".1"); err != nil {
		t.Fatal("expected rotation because existing content counts towards the limit")
	}
}

// If the old file can't be moved aside (on Windows another process may hold it open), logging carries on in the
// current file rather than stopping for the rest of the session.
func TestFailedRotationKeepsLogging(t *testing.T) {
	path := filepath.Join(t.TempDir(), "helper.log")
	if err := os.MkdirAll(filepath.Join(path+".1", "blocker"), 0o755); err != nil { // rename onto it fails
		t.Fatal(err)
	}
	r, err := OpenRotating(path, 10)
	if err != nil {
		t.Fatal(err)
	}
	defer r.Close()
	for _, line := range []string{"first line\n", "second line\n", "third line\n"} {
		if _, err := r.Write([]byte(line)); err != nil {
			t.Fatalf("write %q: %v", line, err)
		}
	}
	data, _ := os.ReadFile(path)
	if !strings.Contains(string(data), "third line") {
		t.Fatalf("log = %q, want the later lines kept", data)
	}
}
