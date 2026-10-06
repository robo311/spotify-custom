// Package spotify finds, launches, observes and restarts the Spotify desktop app. The policy for
// what to do in a given situation is the pure Decide function; OS specifics live behind Platform.
package spotify

import "time"

// Trigger is why the helper is evaluating Spotify's state right now.
type Trigger int

const (
	// TriggerUser: the user opened the helper or clicked "Open Spotify".
	TriggerUser Trigger = iota
	// TriggerLogin: the helper started at login and is still inside the login grace window.
	TriggerLogin
	// TriggerWatch: a periodic check while nothing else is happening.
	TriggerWatch
	// TriggerRestart: the user explicitly asked to restart Spotify with the theme.
	TriggerRestart
)

func (t Trigger) String() string {
	return [...]string{"user", "login", "watch", "restart"}[t]
}

// Action is what the helper should do next.
type Action int

const (
	// ActionWait: nothing to do; check again later.
	ActionWait Action = iota
	// ActionConnect: Spotify is reachable on our debug port; attach and inject.
	ActionConnect
	// ActionLaunch: start Spotify with our debug port.
	ActionLaunch
	// ActionRestart: restart Spotify without asking (the user just asked for Spotify, or it only just started).
	ActionRestart
	// ActionAskRestart: Spotify runs untouched and may be playing; ask before interrupting it.
	ActionAskRestart
)

func (a Action) String() string {
	return [...]string{"wait", "connect", "launch", "restart", "ask-restart"}[a]
}

// FreshStart is how recently Spotify must have started for a login-time restart to go unannounced:
// nothing is playing yet, so a quick restart beats asking.
const FreshStart = 60 * time.Second

// Situation is everything Decide needs to know.
type Situation struct {
	Trigger   Trigger
	Running   bool          // a Spotify main process exists
	Reachable bool          // our debug port answers and identifies as Spotify
	Uptime    time.Duration // age of the Spotify main process (when Running)
}

// Decide implements the launch/restart rules from the spec (§5.1). It never interrupts possible
// playback without asking unless the user just asked for Spotify themselves.
func Decide(s Situation) Action {
	if s.Trigger == TriggerRestart {
		if s.Running || s.Reachable {
			return ActionRestart
		}
		return ActionLaunch
	}
	if s.Reachable {
		return ActionConnect
	}
	if !s.Running {
		if s.Trigger == TriggerUser {
			return ActionLaunch
		}
		return ActionWait // respect the user's choice not to have Spotify open
	}
	switch s.Trigger {
	case TriggerUser:
		return ActionRestart
	case TriggerLogin:
		if s.Uptime < FreshStart {
			return ActionRestart
		}
		return ActionAskRestart
	default:
		return ActionAskRestart
	}
}
