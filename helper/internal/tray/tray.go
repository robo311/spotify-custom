// Package tray shows the menu bar (macOS) / notification area (Windows) icon and menu. It is a thin
// adapter: every item calls into Actions, and the first line shows the app's live status.
package tray

import (
	_ "embed"
	"runtime"

	"fyne.io/systray"
)

//go:embed assets/tray-template.png
var templateIcon []byte

//go:embed assets/tray.ico
var windowsIcon []byte

// Actions are what the menu can do.
type Actions interface {
	OpenSpotify()
	RestartThemed()
	OpenDataFolder()
	StartAtLogin() bool
	SetStartAtLogin(on bool) error
	InstallUpdate()
}

// Menu is a running tray icon.
type Menu struct {
	status *systray.MenuItem
	update *systray.MenuItem
}

// Run shows the tray and blocks until Quit is called or the user picks "Quit". It must be called
// from the main goroutine (a macOS requirement). onReady receives the menu once it exists.
// Do shutdown work after Run returns: systray does not reliably call an exit hook on every OS.
func Run(title string, a Actions, onReady func(*Menu)) {
	systray.Run(func() { onReady(build(title, a)) }, nil)
}

// Quit closes the tray, making Run return.
func Quit() { systray.Quit() }

// SetStatus updates the status line at the top of the menu.
func (m *Menu) SetStatus(text string) { m.status.SetTitle(text) }

// SetUpdate shows the update item with this label ("" hides it); disabled while an install runs.
func (m *Menu) SetUpdate(label string, enabled bool) {
	if label == "" {
		m.update.Hide()
		return
	}
	m.update.SetTitle(label)
	if enabled {
		m.update.Enable()
	} else {
		m.update.Disable()
	}
	m.update.Show()
}

func build(title string, a Actions) *Menu {
	if runtime.GOOS == "windows" {
		systray.SetIcon(windowsIcon)
	} else {
		systray.SetTemplateIcon(templateIcon, templateIcon)
	}
	systray.SetTooltip(title)

	status := systray.AddMenuItem("Starting…", "")
	status.Disable()
	update := systray.AddMenuItem("", "Install the new version of "+title)
	update.Hide()
	systray.AddSeparator()
	open := systray.AddMenuItem("Open Spotify", "Open Spotify with your theme")
	restart := systray.AddMenuItem("Restart Spotify with theme", "Restart Spotify so your theme is applied")
	folder := systray.AddMenuItem("Open my customisations folder", "Your themes, icon packs and extensions")
	systray.AddSeparator()
	login := systray.AddMenuItemCheckbox("Start at login", "Start "+title+" when you log in", a.StartAtLogin())
	systray.AddSeparator()
	quit := systray.AddMenuItem("Quit "+title, "")

	go func() {
		for {
			select {
			case <-open.ClickedCh:
				a.OpenSpotify()
			case <-restart.ClickedCh:
				a.RestartThemed()
			case <-update.ClickedCh:
				a.InstallUpdate()
			case <-folder.ClickedCh:
				a.OpenDataFolder()
			case <-login.ClickedCh:
				want := !login.Checked()
				if a.SetStartAtLogin(want) == nil {
					if want {
						login.Check()
					} else {
						login.Uncheck()
					}
				}
			case <-quit.ClickedCh:
				systray.Quit()
				return
			}
		}
	}()
	return &Menu{status: status, update: update}
}
