package spotify

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

// macMainBinary is the suffix of Spotify's main executable path (helpers live in Frameworks/).
const macMainBinary = "/Spotify.app/Contents/MacOS/Spotify"

// findMacMain parses `ps -axo pid=,etime=,comm=` output and returns Spotify's main process.
func findMacMain(psOutput string) (Process, bool, error) {
	for line := range strings.Lines(psOutput) {
		fields := strings.Fields(line)
		if len(fields) < 3 {
			continue
		}
		comm := strings.Join(fields[2:], " ") // paths may contain spaces
		if !strings.HasSuffix(comm, macMainBinary) {
			continue
		}
		pid, err := strconv.Atoi(fields[0])
		if err != nil {
			return Process{}, false, fmt.Errorf("parse ps pid %q: %w", fields[0], err)
		}
		uptime, err := parseEtime(fields[1])
		if err != nil {
			return Process{}, false, err
		}
		return Process{PID: pid, Uptime: uptime}, true, nil
	}
	return Process{}, false, nil
}

// parseEtime parses ps elapsed time: [[dd-]hh:]mm:ss.
func parseEtime(s string) (time.Duration, error) {
	var days int
	if d, rest, ok := strings.Cut(s, "-"); ok {
		n, err := strconv.Atoi(d)
		if err != nil {
			return 0, fmt.Errorf("parse etime %q: %w", s, err)
		}
		days, s = n, rest
	}
	parts := strings.Split(s, ":")
	if len(parts) < 2 || len(parts) > 3 {
		return 0, fmt.Errorf("parse etime %q: unexpected format", s)
	}
	var total int
	for _, p := range parts {
		n, err := strconv.Atoi(p)
		if err != nil {
			return 0, fmt.Errorf("parse etime %q: %w", s, err)
		}
		total = total*60 + n
	}
	return time.Duration(days)*24*time.Hour + time.Duration(total)*time.Second, nil
}
