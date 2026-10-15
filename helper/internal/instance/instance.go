// Package instance keeps a single helper running per user. The first instance holds a lock file and
// listens on a loopback control port; a second launch asks it to open Spotify, then exits (a dev launch
// asks it to quit and takes over instead).
package instance

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"
	"time"
)

// ErrAlreadyRunning means another helper holds the lock.
var ErrAlreadyRunning = errors.New("helper is already running")

// CommandOpen asks the running instance to open (or focus) Spotify.
const CommandOpen = "open"

// CommandQuit asks the running instance to shut down (a dev helper taking over).
const CommandQuit = "quit"

// Lock is the held single-instance lock.
type Lock struct{ f *os.File }

// Acquire takes the lock at path or returns ErrAlreadyRunning.
func Acquire(path string) (*Lock, error) {
	f, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR, 0o644)
	if err != nil {
		return nil, fmt.Errorf("instance lock: %w", err)
	}
	if err := lockFile(f); err != nil {
		f.Close()
		return nil, ErrAlreadyRunning
	}
	return &Lock{f: f}, nil
}

// Release frees the lock.
func (l *Lock) Release() error { return l.f.Close() }

// Listen accepts commands from later launches on a random loopback port and reports them on the
// returned channel until ctx ends. The port must be published (runtime.json) for Signal to find it.
func Listen(ctx context.Context) (port int, commands <-chan string, err error) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, nil, fmt.Errorf("control listener: %w", err)
	}
	out := make(chan string, 4)
	go func() {
		<-ctx.Done()
		ln.Close()
	}()
	go func() {
		defer close(out)
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			_ = conn.SetReadDeadline(time.Now().Add(2 * time.Second))
			line, _ := bufio.NewReader(conn).ReadString('\n')
			conn.Close()
			if cmd := strings.TrimSpace(line); cmd == CommandOpen || cmd == CommandQuit {
				select {
				case out <- cmd:
				default: // a pending command already covers this one
				}
			}
		}
	}()
	return ln.Addr().(*net.TCPAddr).Port, out, nil
}

// TakeOver asks the instance listening on port to quit and takes the lock once it has let go. It returns
// ErrAlreadyRunning if the lock is still held after timeout.
func TakeOver(path string, port int, timeout time.Duration) (*Lock, error) {
	if err := Signal(port, CommandQuit); err != nil {
		return nil, err
	}
	deadline := time.Now().Add(timeout)
	for {
		lock, err := Acquire(path)
		if !errors.Is(err, ErrAlreadyRunning) || time.Now().After(deadline) {
			return lock, err
		}
		time.Sleep(100 * time.Millisecond)
	}
}

// Signal sends a command to the running instance's control port.
func Signal(port int, cmd string) error {
	conn, err := net.DialTimeout("tcp", net.JoinHostPort("127.0.0.1", strconv.Itoa(port)), 2*time.Second)
	if err != nil {
		return fmt.Errorf("signal running helper: %w", err)
	}
	defer conn.Close()
	_, err = conn.Write([]byte(cmd + "\n"))
	return err
}
