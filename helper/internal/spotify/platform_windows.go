package spotify

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"syscall"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"

	"spotifycustom/internal/sysexec"
)

type windowsPlatform struct{}

// NewPlatform returns the Windows implementation.
func NewPlatform() Platform { return windowsPlatform{} }

func (windowsPlatform) Locate() (Install, error) {
	return locateWindows(os.Getenv("APPDATA"), os.Getenv("LOCALAPPDATA"), fileExists)
}

type winProc struct {
	pid, parent uint32
}

// MainProcess finds Spotify.exe processes and picks the one whose parent is not Spotify itself
// (renderer/GPU helpers are children of the main process and share its executable name).
func (windowsPlatform) MainProcess() (Process, bool, error) {
	procs, err := spotifyProcesses()
	if err != nil {
		return Process{}, false, err
	}
	isSpotify := map[uint32]bool{}
	for _, p := range procs {
		isSpotify[p.pid] = true
	}
	for _, p := range procs {
		if isSpotify[p.parent] {
			continue
		}
		uptime, err := processUptime(p.pid)
		if err != nil {
			return Process{}, false, err
		}
		return Process{PID: int(p.pid), Uptime: uptime}, true, nil
	}
	return Process{}, false, nil
}

func spotifyProcesses() ([]winProc, error) {
	snap, err := windows.CreateToolhelp32Snapshot(windows.TH32CS_SNAPPROCESS, 0)
	if err != nil {
		return nil, fmt.Errorf("list processes: %w", err)
	}
	defer windows.CloseHandle(snap)

	var procs []winProc
	entry := windows.ProcessEntry32{Size: uint32(unsafe.Sizeof(windows.ProcessEntry32{}))}
	for err = windows.Process32First(snap, &entry); err == nil; err = windows.Process32Next(snap, &entry) {
		if strings.EqualFold(windows.UTF16ToString(entry.ExeFile[:]), "Spotify.exe") {
			procs = append(procs, winProc{pid: entry.ProcessID, parent: entry.ParentProcessID})
		}
	}
	if !errors.Is(err, windows.ERROR_NO_MORE_FILES) {
		return nil, fmt.Errorf("list processes: %w", err)
	}
	return procs, nil
}

func processUptime(pid uint32) (time.Duration, error) {
	h, err := windows.OpenProcess(windows.PROCESS_QUERY_LIMITED_INFORMATION, false, pid)
	if err != nil {
		return 0, fmt.Errorf("open process %d: %w", pid, err)
	}
	defer windows.CloseHandle(h)
	var created, exited, kernel, user windows.Filetime
	if err := windows.GetProcessTimes(h, &created, &exited, &kernel, &user); err != nil {
		return 0, fmt.Errorf("process times %d: %w", pid, err)
	}
	return time.Since(time.Unix(0, created.Nanoseconds())), nil
}

func (windowsPlatform) Launch(inst Install, port int) error {
	return startDetached(inst.Path, "--remote-debugging-port="+strconv.Itoa(port))
}

// RequestQuit sends WM_CLOSE. Spotify may only hide to the tray; the controller then force-kills.
func (windowsPlatform) RequestQuit(_ Install, p Process) error {
	_, err := run("taskkill", "/PID", strconv.Itoa(p.PID))
	return err
}

func (windowsPlatform) Kill(p Process) error {
	_, err := run("taskkill", "/F", "/T", "/PID", strconv.Itoa(p.PID))
	return err
}

// Focus re-runs Spotify.exe: the running single instance brings its window to the front.
func (windowsPlatform) Focus(inst Install) error {
	return startDetached(inst.Path)
}

func startDetached(path string, args ...string) error {
	cmd := exec.Command(path, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{
		CreationFlags: windows.DETACHED_PROCESS | windows.CREATE_NEW_PROCESS_GROUP,
	}
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start %s: %w", path, err)
	}
	return cmd.Process.Release()
}

func run(name string, args ...string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	out, err := sysexec.Command(ctx, name, args...).Output()
	if err != nil {
		return "", fmt.Errorf("%s: %w", name, err)
	}
	return string(out), nil
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
