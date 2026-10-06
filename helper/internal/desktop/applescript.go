package desktop

import "strings"

// appleScriptString quotes s as an AppleScript string literal.
func appleScriptString(s string) string {
	r := strings.NewReplacer(`\`, `\\`, `"`, `\"`)
	return `"` + r.Replace(s) + `"`
}
