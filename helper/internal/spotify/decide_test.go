package spotify

import (
	"testing"
	"time"
)

func TestDecide(t *testing.T) {
	const fresh, old = 10 * time.Second, 10 * time.Minute
	tests := []struct {
		name string
		s    Situation
		want Action
	}{
		{"user, not running → launch", Situation{Trigger: TriggerUser}, ActionLaunch},
		{"user, running with our port → connect", Situation{Trigger: TriggerUser, Running: true, Reachable: true}, ActionConnect},
		{"user, running untouched → restart", Situation{Trigger: TriggerUser, Running: true, Uptime: old}, ActionRestart},

		{"login, not running → wait", Situation{Trigger: TriggerLogin}, ActionWait},
		{"login, fresh untouched → restart silently", Situation{Trigger: TriggerLogin, Running: true, Uptime: fresh}, ActionRestart},
		{"login, old untouched → ask", Situation{Trigger: TriggerLogin, Running: true, Uptime: old}, ActionAskRestart},
		{"login, boundary uptime → ask", Situation{Trigger: TriggerLogin, Running: true, Uptime: FreshStart}, ActionAskRestart},
		{"login, reachable → connect", Situation{Trigger: TriggerLogin, Running: true, Reachable: true}, ActionConnect},

		{"watch, not running → wait", Situation{Trigger: TriggerWatch}, ActionWait},
		{"watch, untouched even if fresh → ask", Situation{Trigger: TriggerWatch, Running: true, Uptime: fresh}, ActionAskRestart},
		{"watch, reachable → connect", Situation{Trigger: TriggerWatch, Running: true, Reachable: true}, ActionConnect},
		{"reachable without detected process → connect", Situation{Trigger: TriggerWatch, Reachable: true}, ActionConnect},

		{"restart, not running → launch", Situation{Trigger: TriggerRestart}, ActionLaunch},
		{"restart, untouched → restart", Situation{Trigger: TriggerRestart, Running: true}, ActionRestart},
		{"restart, already themed → restart anyway", Situation{Trigger: TriggerRestart, Running: true, Reachable: true}, ActionRestart},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Decide(tt.s); got != tt.want {
				t.Fatalf("Decide(%+v) = %v, want %v", tt.s, got, tt.want)
			}
		})
	}
}
