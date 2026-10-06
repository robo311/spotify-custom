package desktop

import (
	"context"
	"errors"
	"fmt"
	"os/exec"
	"strings"
	"time"

	"spotifycustom/internal/sysexec"
)

type darwin struct{ appName string }

// New returns the macOS implementation; appName titles dialogs.
func New(appName string) Desktop { return darwin{appName: appName} }

func (d darwin) Notify(title, message string) error {
	_, err := osascript(fmt.Sprintf("display notification %s with title %s",
		appleScriptString(message), appleScriptString(title)))
	return err
}

func (d darwin) Confirm(title, message, confirm, cancel string) (bool, error) {
	script := fmt.Sprintf(
		"display dialog %s with title %s buttons {%s, %s} default button %s cancel button %s with icon note",
		appleScriptString(message), appleScriptString(title),
		appleScriptString(cancel), appleScriptString(confirm),
		appleScriptString(confirm), appleScriptString(cancel))
	out, err := osascript(script)
	var exit *exec.ExitError
	if errors.As(err, &exit) {
		return false, nil // "cancel button" makes osascript exit non-zero (user cancelled)
	}
	if err != nil {
		return false, err
	}
	return strings.Contains(out, "button returned:"+confirm), nil
}

func (d darwin) Alert(title, message string) error {
	_, err := osascript(fmt.Sprintf("display alert %s message %s",
		appleScriptString(title), appleScriptString(message)))
	return err
}

func (d darwin) Open(target string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := sysexec.Command(ctx, "open", target).Run(); err != nil {
		return fmt.Errorf("open %s: %w", target, err)
	}
	return nil
}

// osascript runs AppleScript. Dialogs wait for the user, so there is no short timeout.
func osascript(script string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()
	out, err := sysexec.Command(ctx, "osascript", "-e", script).Output()
	return string(out), err
}
