//go:build windows

package shortcut

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

// Shortcut files are edited through the shell's own ShellLink object (IShellLinkW + IPersistFile), loaded and saved
// in place, so everything else in them (Spotify's app id for notifications and taskbar grouping, hotkey, window
// state) is kept. COM is called through vtables with syscall.SyscallN, like the audio capture code.

var (
	modOle32              = windows.NewLazySystemDLL("ole32.dll")
	procCoCreateInstance  = modOle32.NewProc("CoCreateInstance")
	modShell32            = windows.NewLazySystemDLL("shell32.dll")
	procILCreateFromPathW = modShell32.NewProc("ILCreateFromPathW")
	procILFree            = modShell32.NewProc("ILFree")

	clsidShellLink  = windows.GUID{Data1: 0x00021401, Data4: [8]byte{0xC0, 0, 0, 0, 0, 0, 0, 0x46}}
	iidIShellLinkW  = windows.GUID{Data1: 0x000214F9, Data4: [8]byte{0xC0, 0, 0, 0, 0, 0, 0, 0x46}}
	iidIPersistFile = windows.GUID{Data1: 0x0000010B, Data4: [8]byte{0xC0, 0, 0, 0, 0, 0, 0, 0x46}}
)

const (
	clsctxInprocServer = 0x1
	stgmRead           = 0x0
	stgmReadWrite      = 0x2
	maxPath            = 1024 // generous: GetPath/GetArguments truncate to the buffer
)

type unknownVtbl struct{ QueryInterface, AddRef, Release uintptr }

type shellLink struct{ vtbl *shellLinkVtbl }

type shellLinkVtbl struct {
	unknownVtbl
	GetPath         uintptr
	_               uintptr // GetIDList
	SetIDList       uintptr
	_               [4]uintptr // Get/SetDescription, Get/SetWorkingDirectory
	GetArguments    uintptr
	SetArguments    uintptr
	_               [4]uintptr // Get/SetHotkey, Get/SetShowCmd
	_               uintptr    // GetIconLocation
	SetIconLocation uintptr
	_               [2]uintptr // SetRelativePath, Resolve
	SetPath         uintptr
}

type persistFile struct{ vtbl *persistFileVtbl }

type persistFileVtbl struct {
	unknownVtbl
	_    [2]uintptr // GetClassID, IsDirty
	Load uintptr
	Save uintptr
}

func release(p unsafe.Pointer) {
	if p != nil {
		syscall.SyscallN((*(**unknownVtbl)(p)).Release, uintptr(p))
	}
}

func hresult(what string, r uintptr) error {
	if int32(r) < 0 {
		return fmt.Errorf("%s: %w", what, syscall.Errno(r))
	}
	return nil
}

// withCOM runs fn on one OS thread with COM initialised for it (ShellLink is apartment-threaded).
func withCOM(fn func() error) error {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	// S_FALSE (already initialised on this thread) still needs the matching CoUninitialize.
	if err := windows.CoInitializeEx(0, windows.COINIT_APARTMENTTHREADED); err != nil && err != syscall.Errno(1) {
		return fmt.Errorf("init COM: %w", err)
	}
	defer windows.CoUninitialize()
	return fn()
}

// openLink loads path into a new ShellLink; the caller releases both interfaces.
func openLink(path string, mode uint32) (*shellLink, *persistFile, error) {
	var link *shellLink
	r, _, _ := procCoCreateInstance.Call(uintptr(unsafe.Pointer(&clsidShellLink)), 0, clsctxInprocServer,
		uintptr(unsafe.Pointer(&iidIShellLinkW)), uintptr(unsafe.Pointer(&link)))
	if err := hresult("create ShellLink", r); err != nil {
		return nil, nil, err
	}
	var file *persistFile
	r, _, _ = syscall.SyscallN(link.vtbl.QueryInterface, uintptr(unsafe.Pointer(link)),
		uintptr(unsafe.Pointer(&iidIPersistFile)), uintptr(unsafe.Pointer(&file)))
	if err := hresult("IPersistFile", r); err != nil {
		release(unsafe.Pointer(link))
		return nil, nil, err
	}
	p, err := windows.UTF16PtrFromString(path)
	if err == nil {
		r, _, _ = syscall.SyscallN(file.vtbl.Load, uintptr(unsafe.Pointer(file)), uintptr(unsafe.Pointer(p)), uintptr(mode))
		err = hresult("load", r)
	}
	if err != nil {
		release(unsafe.Pointer(file))
		release(unsafe.Pointer(link))
		return nil, nil, err
	}
	return link, file, nil
}

// read returns the link's target and arguments.
func (l *shellLink) read() (target, args string, err error) {
	buf := make([]uint16, maxPath)
	r, _, _ := syscall.SyscallN(l.vtbl.GetPath, uintptr(unsafe.Pointer(l)), uintptr(unsafe.Pointer(&buf[0])), uintptr(len(buf)), 0, 0)
	if err := hresult("get target", r); err != nil {
		return "", "", err
	}
	target = windows.UTF16ToString(buf)
	clear(buf)
	r, _, _ = syscall.SyscallN(l.vtbl.GetArguments, uintptr(unsafe.Pointer(l)), uintptr(unsafe.Pointer(&buf[0])), uintptr(len(buf)))
	if err := hresult("get arguments", r); err != nil {
		return "", "", err
	}
	return target, windows.UTF16ToString(buf), nil
}

// Supported: only Windows shortcuts can be re-pointed.
const Supported = true

// setTarget points the link at path through a freshly built item ID list. SetPath isn't enough: a link keeps its
// original target in a second record too, and SetPath back to that target is taken as "no change", so restoring
// Spotify after pointing the link at us left it opening us (caught by TestRetargetRealShortcut on Windows).
func (l *shellLink) setTarget(path string) error {
	p, err := windows.UTF16PtrFromString(path)
	if err != nil {
		return err
	}
	pidl, _, _ := procILCreateFromPathW.Call(uintptr(unsafe.Pointer(p)))
	if pidl == 0 {
		return fmt.Errorf("set target: can't resolve %s", path)
	}
	defer procILFree.Call(pidl)
	r, _, _ := syscall.SyscallN(l.vtbl.SetIDList, uintptr(unsafe.Pointer(l)), pidl)
	return hresult("set target", r)
}

type windowsLinks struct{}

// NewLinks finds Spotify's shortcuts in the current user's Start menu, desktop and pinned taskbar.
func NewLinks() Links { return windowsLinks{} }

func folders() []string {
	var dirs []string
	if p, err := windows.KnownFolderPath(windows.FOLDERID_Programs, 0); err == nil {
		dirs = append(dirs, p, filepath.Join(p, "*"))
	}
	if p, err := windows.KnownFolderPath(windows.FOLDERID_Desktop, 0); err == nil {
		dirs = append(dirs, p)
	}
	if p, err := windows.KnownFolderPath(windows.FOLDERID_RoamingAppData, 0); err == nil {
		dirs = append(dirs, filepath.Join(p, `Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar`))
	}
	return dirs
}

func (windowsLinks) Find() ([]Link, error) {
	var paths []string
	for _, dir := range folders() {
		matches, _ := filepath.Glob(filepath.Join(dir, "*.lnk")) // only fails on a bad pattern
		for _, m := range matches {
			if strings.Contains(strings.ToLower(filepath.Base(m)), "spotify") {
				paths = append(paths, m)
			}
		}
	}
	var links []Link
	err := withCOM(func() error {
		for _, p := range paths {
			link, file, err := openLink(p, stgmRead)
			if err != nil {
				continue // unreadable or not a file link: not ours to change
			}
			target, args, err := link.read()
			release(unsafe.Pointer(file))
			release(unsafe.Pointer(link))
			if err == nil && target != "" {
				links = append(links, Link{Path: p, Target: target, Args: args})
			}
		}
		return nil
	})
	return links, err
}

func (windowsLinks) Retarget(path, target, args, icon string) error {
	return withCOM(func() error {
		link, file, err := openLink(path, stgmReadWrite)
		if err != nil {
			return err
		}
		defer release(unsafe.Pointer(link))
		defer release(unsafe.Pointer(file))
		set := func(what string, method uintptr, value string, extra ...uintptr) error {
			p, err := windows.UTF16PtrFromString(value)
			if err != nil {
				return err
			}
			r, _, _ := syscall.SyscallN(method, append([]uintptr{uintptr(unsafe.Pointer(link)), uintptr(unsafe.Pointer(p))}, extra...)...)
			return hresult(what, r)
		}
		if err := link.setTarget(target); err != nil {
			return err
		}
		if err := set("set arguments", link.vtbl.SetArguments, args); err != nil {
			return err
		}
		if err := set("set icon", link.vtbl.SetIconLocation, icon, 0); err != nil {
			return err
		}
		r, _, _ := syscall.SyscallN(file.vtbl.Save, uintptr(unsafe.Pointer(file)), 0, 1) // in place, remember
		if err := hresult("save", r); err != nil {
			return err
		}
		return verify(path, target)
	})
}

// verify reads the saved shortcut back: a link that keeps an environment-variable copy of its old target could
// still open the old program, and that must show up as an error rather than a silent no-op.
func verify(path, target string) error {
	link, file, err := openLink(path, stgmRead)
	if err != nil {
		return err
	}
	defer release(unsafe.Pointer(link))
	defer release(unsafe.Pointer(file))
	got, _, err := link.read()
	if err != nil {
		return err
	}
	if !sameFile(got, target) {
		return fmt.Errorf("saved, but it still opens %s", got)
	}
	return nil
}

// sameFile reports whether a and b are the same file, so a short 8.3 name (C:\Users\RUNNER~1\…) matches its long
// form, which is what a link reports back. Paths that can't be looked up are compared as text.
func sameFile(a, b string) bool {
	fa, errA := os.Stat(a)
	fb, errB := os.Stat(b)
	if errA != nil || errB != nil {
		return samePath(a, b)
	}
	return os.SameFile(fa, fb)
}
