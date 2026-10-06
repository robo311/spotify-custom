// Package desktop wraps the OS user-facing primitives the helper needs: notifications, simple
// dialogs, and opening folders/URLs. Implementations are per OS; text is passed through unchanged.
package desktop

// Desktop is implemented per OS (see New).
type Desktop interface {
	// Notify shows a passive notification.
	Notify(title, message string) error
	// Confirm asks a yes/no question; true means the user chose confirm.
	Confirm(title, message, confirm, cancel string) (bool, error)
	// Alert shows a blocking message with a single OK button.
	Alert(title, message string) error
	// Open opens a folder in Finder/Explorer, or a URL in the default browser.
	Open(target string) error
}
