package autostart

import (
	"bytes"
	"encoding/xml"
)

// launchAgentPlist renders a LaunchAgent that runs exe once at login.
func launchAgentPlist(exe string) []byte {
	var b bytes.Buffer
	b.WriteString(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>` + label + `</string>
  <key>ProgramArguments</key>
  <array>
    <string>`)
	_ = xml.EscapeText(&b, []byte(exe)) // writing to a bytes.Buffer cannot fail
	b.WriteString(`</string>
    <string>` + LoginFlag + `</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>ProcessType</key><string>Interactive</string>
</dict>
</plist>
`)
	return b.Bytes()
}
