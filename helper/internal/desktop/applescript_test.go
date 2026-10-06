package desktop

import "testing"

func TestAppleScriptString(t *testing.T) {
	tests := map[string]string{
		`plain`:            `"plain"`,
		`say "hi"`:         `"say \"hi\""`,
		`C:\path`:          `"C:\\path"`,
		`"); do shell sc`:  `"\"); do shell sc"`,
		"multi\nline text": "\"multi\nline text\"",
	}
	for in, want := range tests {
		if got := appleScriptString(in); got != want {
			t.Errorf("appleScriptString(%q) = %s, want %s", in, got, want)
		}
	}
}
