package desktop

import (
	"context"
	"fmt"
	"strings"
	"time"

	"golang.org/x/sys/windows"

	"spotifycustom/internal/sysexec"
)

// idYes is MessageBox's return value for the Yes button (not exported by x/sys/windows).
const idYes = 6

type win struct{ appName string }

// New returns the Windows implementation; appName titles dialogs and toasts.
func New(appName string) Desktop { return win{appName: appName} }

// Notify shows a Windows toast through PowerShell's WinRT access (no extra dependencies).
func (d win) Notify(title, message string) error {
	script := `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
$xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$t = $xml.GetElementsByTagName('text')
$t.Item(0).AppendChild($xml.CreateTextNode(` + psString(title) + `)) > $null
$t.Item(1).AppendChild($xml.CreateTextNode(` + psString(message) + `)) > $null
$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe').Show($toast)
`
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := sysexec.Command(ctx, "powershell", "-NoProfile", "-NonInteractive", "-Command", script).Run(); err != nil {
		return fmt.Errorf("toast: %w", err)
	}
	return nil
}

// Confirm uses a native Yes/No message box; confirm/cancel labels are folded into the text because
// MessageBox buttons can't be relabelled.
func (d win) Confirm(title, message, confirm, cancel string) (bool, error) {
	text := fmt.Sprintf("%s\n\nYes = %s\nNo = %s", message, confirm, cancel)
	ret, err := messageBox(title, text, windows.MB_YESNO|windows.MB_ICONQUESTION)
	return ret == idYes, err
}

func (d win) Alert(title, message string) error {
	_, err := messageBox(title, message, windows.MB_OK|windows.MB_ICONINFORMATION)
	return err
}

func (d win) Open(target string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if strings.HasPrefix(target, "http://") || strings.HasPrefix(target, "https://") {
		return sysexec.Command(ctx, "rundll32", "url.dll,FileProtocolHandler", target).Run()
	}
	// explorer.exe exits with status 1 even on success, so its error is meaningless.
	_ = sysexec.Command(ctx, "explorer", target).Run()
	return nil
}

func messageBox(title, text string, flags uint32) (int32, error) {
	t, err := windows.UTF16PtrFromString(title)
	if err != nil {
		return 0, err
	}
	m, err := windows.UTF16PtrFromString(text)
	if err != nil {
		return 0, err
	}
	return windows.MessageBox(0, m, t, flags|windows.MB_SETFOREGROUND|windows.MB_TOPMOST)
}

// psString quotes s as a PowerShell single-quoted string literal.
func psString(s string) string {
	return "'" + strings.ReplaceAll(s, "'", "''") + "'"
}
