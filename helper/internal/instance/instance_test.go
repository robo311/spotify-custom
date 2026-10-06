package instance

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
	"time"
)

func TestSecondAcquireFailsUntilReleased(t *testing.T) {
	path := filepath.Join(t.TempDir(), "helper.lock")
	first, err := Acquire(path)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := Acquire(path); !errors.Is(err, ErrAlreadyRunning) {
		t.Fatalf("second Acquire err = %v, want ErrAlreadyRunning", err)
	}
	if err := first.Release(); err != nil {
		t.Fatal(err)
	}
	again, err := Acquire(path)
	if err != nil {
		t.Fatalf("Acquire after release: %v", err)
	}
	_ = again.Release()
}

func TestSignalDeliversOpen(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	port, cmds, err := Listen(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if err := Signal(port, "bogus"); err != nil {
		t.Fatal(err)
	}
	if err := Signal(port, CommandOpen); err != nil {
		t.Fatal(err)
	}
	select {
	case cmd := <-cmds:
		if cmd != CommandOpen {
			t.Fatalf("got %q", cmd)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("no command received")
	}
}
