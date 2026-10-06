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
