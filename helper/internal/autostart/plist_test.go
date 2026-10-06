package autostart

import (
	"encoding/xml"
	"strings"
	"testing"
)

func TestLaunchAgentPlistIsValidXMLAndEscapesPath(t *testing.T) {
	exe := `/Applications/Spotify & Me <dev>.app/Contents/MacOS/SpotifyCustom`
	out := launchAgentPlist(exe)
	if err := xml.Unmarshal(out, new(struct{})); err != nil {
		t.Fatalf("invalid XML: %v\n%s", err, out)
	}
	s := string(out)
	for _, want := range []string{"Spotify &amp; Me &lt;dev&gt;.app", "<string>--login</string>", "<key>RunAtLoad</key><true/>", label} {
		if !strings.Contains(s, want) {
			t.Errorf("plist missing %q", want)
		}
	}
}
