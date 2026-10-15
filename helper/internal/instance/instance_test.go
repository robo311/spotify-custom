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

// holder plays the running instance: it holds the lock and releases it when told to quit (or never, if stubborn).
func holder(t *testing.T, path string, stubborn bool) int {
	t.Helper()
	lock, err := Acquire(path)
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	port, cmds, err := Listen(ctx)
	if err != nil {
		t.Fatal(err)
	}
	go func() {
		defer lock.Release()
		for cmd := range cmds {
			if cmd == CommandQuit && !stubborn {
				time.Sleep(150 * time.Millisecond) // shutting down takes a moment
				return
			}
		}
	}()
	return port
}

func TestTakeOverQuitsTheRunningInstance(t *testing.T) {
	path := filepath.Join(t.TempDir(), "helper.lock")
	port := holder(t, path, false)
	lock, err := TakeOver(path, port, 2*time.Second)
	if err != nil {
		t.Fatalf("TakeOver: %v", err)
	}
	_ = lock.Release()
}

func TestTakeOverGivesUpWhenTheInstanceStays(t *testing.T) {
	path := filepath.Join(t.TempDir(), "helper.lock")
	port := holder(t, path, true)
	if _, err := TakeOver(path, port, 300*time.Millisecond); !errors.Is(err, ErrAlreadyRunning) {
		t.Fatalf("err = %v, want ErrAlreadyRunning", err)
	}
}
