//go:build windows

package shortcut

import (
	"os"
	"path/filepath"
	"syscall"
	"testing"
	"unsafe"

	"golang.org/x/sys/windows"
)

// createLink writes a new shortcut at path opening target (what Spotify's installer leaves behind).
func createLink(t *testing.T, path, target string) {
	t.Helper()
	err := withCOM(func() error {
		var link *shellLink
		r, _, _ := procCoCreateInstance.Call(uintptr(unsafe.Pointer(&clsidShellLink)), 0, clsctxInprocServer,
			uintptr(unsafe.Pointer(&iidIShellLinkW)), uintptr(unsafe.Pointer(&link)))
		if err := hresult("create", r); err != nil {
			return err
		}
		defer release(unsafe.Pointer(link))
		var file *persistFile
		r, _, _ = syscall.SyscallN(link.vtbl.QueryInterface, uintptr(unsafe.Pointer(link)),
			uintptr(unsafe.Pointer(&iidIPersistFile)), uintptr(unsafe.Pointer(&file)))
		if err := hresult("IPersistFile", r); err != nil {
			return err
		}
		defer release(unsafe.Pointer(file))
		tp, _ := windows.UTF16PtrFromString(target)
		if err := hresult("set target", must(syscall.SyscallN(link.vtbl.SetPath, uintptr(unsafe.Pointer(link)), uintptr(unsafe.Pointer(tp))))); err != nil {
			return err
		}
		pp, _ := windows.UTF16PtrFromString(path)
		return hresult("save", must(syscall.SyscallN(file.vtbl.Save, uintptr(unsafe.Pointer(file)), uintptr(unsafe.Pointer(pp)), 1)))
	})
	if err != nil {
		t.Fatal(err)
	}
}

func must(r, _ uintptr, _ syscall.Errno) uintptr { return r }

func readLink(t *testing.T, path string) (target, args string) {
	t.Helper()
	err := withCOM(func() error {
		link, file, err := openLink(path, stgmRead)
		if err != nil {
			return err
		}
		defer release(unsafe.Pointer(link))
		defer release(unsafe.Pointer(file))
		target, args, err = link.read()
		return err
	})
	if err != nil {
		t.Fatal(err)
	}
	return target, args
}

// A real .lnk round trip: point it at another program with the marker, read it back, restore it.
func TestRetargetRealShortcut(t *testing.T) {
	dir := t.TempDir()
	spotify := filepath.Join(dir, "Spotify.exe")
	self := filepath.Join(dir, "SpotifyCustom.exe")
	for _, exe := range []string{spotify, self} {
		if err := os.WriteFile(exe, nil, 0o755); err != nil {
			t.Fatal(err)
		}
	}
	lnk := filepath.Join(dir, "Spotify.lnk")
	createLink(t, lnk, spotify)

	if err := (windowsLinks{}).Retarget(lnk, self, Marker, spotify); err != nil {
		t.Fatal(err)
	}
	if target, args := readLink(t, lnk); !samePath(target, self) || args != Marker {
		t.Fatalf("after retarget: %q %q", target, args)
	}
	if err := (windowsLinks{}).Retarget(lnk, spotify, "", spotify); err != nil {
		t.Fatal(err)
	}
	if target, args := readLink(t, lnk); !samePath(target, spotify) || args != "" {
		t.Fatalf("after restore: %q %q", target, args)
	}
}
