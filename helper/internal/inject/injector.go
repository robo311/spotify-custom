// Package inject attaches to Spotify's UI page over CDP, injects the payload (now and on every
// reload) and serves the page→helper bridge.
//
// Bridge protocol (see payload/src/types.ts):
//
//	page → helper: window.__scHelper(JSON.stringify({id, op, args}))   (a CDP binding)
//	helper → page: window.__sc?.bridge.reply(id, ok, result)            (result = error text when !ok)
package inject

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"sync/atomic"
	"time"

	"spotifycustom/internal/cdp"
)

// BindingName is the page function the payload calls to reach the helper.
const BindingName = "__scHelper"

// Handler answers bridge calls from the page.
type Handler interface {
	Handle(ctx context.Context, op string, args json.RawMessage) (any, error)
}

// Injector keeps the payload injected into Spotify's UI for the lifetime of one browser connection.
type Injector struct {
	Payload Payload
	Handler Handler
	Log     *slog.Logger
	// Reload, if set, re-injects a fresh payload each time it fires (dev mode).
	Reload <-chan struct{}
	// HandlerTimeout bounds a single bridge call (default 30s).
	HandlerTimeout time.Duration
	// Match selects the pages to inject into (default cdp.IsSpotifyUI).
	Match func(cdp.TargetInfo) bool

	mu      sync.Mutex
	current *runner // the live connection, for Broadcast
}

// session is one attached Spotify UI page.
type session struct {
	id       string
	targetID string

	mu       sync.Mutex // serialises (re)injection into this page
	scriptID string     // identifier of the new-document script, for replacing/removing it

	busy atomic.Bool // a broadcast evaluate is in flight
}

type runner struct {
	in   *Injector
	conn *cdp.Conn
	ctx  context.Context

	mu       sync.Mutex
	sessions map[string]*session // by session id
	targets  map[string]bool     // target ids attached or being attached
	wg       sync.WaitGroup
}

// Run attaches to Spotify's UI (and to any UI page that appears later), injects the payload and
// serves the bridge. It returns cdp.ErrClosed when the browser goes away, or ctx.Err() after
// cleaning up (binding and new-document script removed) when ctx is cancelled.
func (in *Injector) Run(ctx context.Context, conn *cdp.Conn) error {
	r := &runner{in: in, conn: conn, ctx: ctx, sessions: map[string]*session{}, targets: map[string]bool{}}
	defer r.wg.Wait()
	in.setCurrent(r)
	defer in.setCurrent(nil) // runs before wg.Wait, so Broadcast can't add work to a finished runner

	// Discovery reports every existing target as Target.targetCreated, then keeps us posted.
	if err := conn.Call(ctx, "", "Target.setDiscoverTargets", map[string]any{"discover": true}, nil); err != nil {
		return fmt.Errorf("discover targets: %w", err)
	}
	for {
		select {
		case <-ctx.Done():
			r.cleanup()
			return ctx.Err()
		case <-conn.Done():
			return cdp.ErrClosed
		case <-in.Reload:
			r.reinjectAll(ctx)
		case ev, ok := <-conn.Events():
			if !ok {
				return cdp.ErrClosed
			}
			r.handleEvent(ctx, ev)
		}
	}
}

func (in *Injector) setCurrent(r *runner) {
	in.mu.Lock()
	in.current = r
	in.mu.Unlock()
}

// broadcastTimeout bounds one fire-and-forget evaluate.
const broadcastTimeout = 2 * time.Second

// Broadcast runs expr in every attached Spotify page without waiting for it. A page whose previous broadcast
// hasn't returned yet skips this one (frames are only useful while fresh). No-op while not connected.
func (in *Injector) Broadcast(expr string) {
	in.mu.Lock()
	defer in.mu.Unlock()
	r := in.current
	if r == nil {
		return
	}
	for _, s := range r.snapshot() {
		if !s.busy.CompareAndSwap(false, true) {
			continue
		}
		r.goAsync(func() {
			defer s.busy.Store(false)
			ctx, cancel := context.WithTimeout(r.ctx, broadcastTimeout)
			defer cancel()
			params := map[string]any{"expression": expr, "silent": true}
			if err := r.conn.Call(ctx, s.id, "Runtime.evaluate", params, nil); err != nil {
				r.in.Log.Debug("broadcast not delivered", "err", err)
			}
		})
	}
}

func (r *runner) handleEvent(ctx context.Context, ev cdp.Event) {
	switch ev.Method {
	case "Target.targetCreated", "Target.targetInfoChanged":
		var p struct {
			TargetInfo cdp.TargetInfo `json:"targetInfo"`
		}
		if json.Unmarshal(ev.Params, &p) == nil && r.matches(p.TargetInfo) && r.claim(p.TargetInfo.TargetID) {
			r.goAsync(func() { r.attach(ctx, p.TargetInfo.TargetID) })
		}
	case "Target.targetDestroyed":
		var p struct {
			TargetID string `json:"targetId"`
		}
		if json.Unmarshal(ev.Params, &p) == nil {
			r.forgetTarget(p.TargetID)
		}
	case "Target.detachedFromTarget":
		var p struct {
			SessionID string `json:"sessionId"`
			TargetID  string `json:"targetId"`
		}
		if json.Unmarshal(ev.Params, &p) == nil {
			r.in.Log.Info("detached from Spotify UI", "target", p.TargetID)
			r.forgetTarget(p.TargetID)
		}
	case "Runtime.bindingCalled":
		var p struct {
			Name      string `json:"name"`
			Payload   string `json:"payload"`
			ContextID int64  `json:"executionContextId"`
		}
		if json.Unmarshal(ev.Params, &p) == nil && p.Name == BindingName {
			r.goAsync(func() { r.serve(ctx, ev.SessionID, p.ContextID, p.Payload) })
		}
	}
}

func (r *runner) matches(t cdp.TargetInfo) bool {
	if r.in.Match != nil {
		return r.in.Match(t)
	}
	return cdp.IsSpotifyUI(t)
}

// goAsync runs work off the event loop so a slow call never stalls event delivery.
func (r *runner) goAsync(fn func()) {
	r.wg.Add(1)
	go func() {
		defer r.wg.Done()
		fn()
	}()
}

// claim marks a target as ours; false if it is already attached or being attached.
func (r *runner) claim(targetID string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.targets[targetID] {
		return false
	}
	r.targets[targetID] = true
	return true
}

func (r *runner) forgetTarget(targetID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.targets, targetID)
	for id, s := range r.sessions {
		if s.targetID == targetID {
			delete(r.sessions, id)
		}
	}
}

func (r *runner) attach(ctx context.Context, targetID string) {
	var res struct {
		SessionID string `json:"sessionId"`
	}
	if err := r.conn.Call(ctx, "", "Target.attachToTarget", map[string]any{"targetId": targetID, "flatten": true}, &res); err != nil {
		r.in.Log.Warn("attach to Spotify UI failed", "target", targetID, "err", err)
		r.forgetTarget(targetID)
		return
	}
	s := &session{id: res.SessionID, targetID: targetID}
	// Without these, Chromium neither runs new-document scripts on reload (Page) nor re-installs the
	// binding into the reloaded document (Runtime), so a reload would silently drop the payload.
	for _, method := range []string{"Page.enable", "Runtime.enable", "Runtime.addBinding"} {
		var params any
		if method == "Runtime.addBinding" {
			params = map[string]any{"name": BindingName}
		}
		if err := r.conn.Call(ctx, s.id, method, params, nil); err != nil {
			r.in.Log.Warn("preparing Spotify UI failed", "step", method, "err", err)
			r.forgetTarget(targetID) // let the next targetInfoChanged retry
			return
		}
	}
	// Registered before injecting so a payload that throws still gets dev reloads and cleanup.
	r.mu.Lock()
	r.sessions[s.id] = s
	r.mu.Unlock()
	if err := r.inject(ctx, s); err != nil {
		r.in.Log.Error("inject payload failed", "err", err)
		return
	}
	r.in.Log.Info("payload injected", "target", targetID)
}

// inject (re)installs the payload as a new-document script and evaluates it in the current document.
// The payload is idempotent: booting twice with the same build is a no-op, a new build replaces the old.
func (r *runner) inject(ctx context.Context, s *session) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	source, err := r.in.Payload.Source()
	if err != nil {
		return err
	}
	if s.scriptID != "" {
		if err := r.conn.Call(ctx, s.id, "Page.removeScriptToEvaluateOnNewDocument", map[string]any{"identifier": s.scriptID}, nil); err != nil {
			r.in.Log.Warn("remove previous payload script failed", "err", err)
		}
	}
	var added struct {
		Identifier string `json:"identifier"`
	}
	if err := r.conn.Call(ctx, s.id, "Page.addScriptToEvaluateOnNewDocument", map[string]any{"source": source}, &added); err != nil {
		return fmt.Errorf("register payload for reloads: %w", err)
	}
	s.scriptID = added.Identifier
	return r.evaluate(ctx, s.id, 0, source)
}

func (r *runner) reinjectAll(ctx context.Context) {
	for _, s := range r.snapshot() {
		if err := r.inject(ctx, s); err != nil {
			r.in.Log.Error("re-inject payload failed", "err", err)
			continue
		}
		r.in.Log.Info("payload re-injected (dev reload)")
	}
}

func (r *runner) snapshot() []*session {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]*session, 0, len(r.sessions))
	for _, s := range r.sessions {
		out = append(out, s)
	}
	return out
}

// bridgeCall is the JSON the payload passes to the binding.
type bridgeCall struct {
	ID   *int64          `json:"id"`
	Op   string          `json:"op"`
	Args json.RawMessage `json:"args"`
}

func (r *runner) serve(ctx context.Context, sessionID string, contextID int64, payload string) {
	var call bridgeCall
	if err := json.Unmarshal([]byte(payload), &call); err != nil || call.ID == nil {
		r.in.Log.Warn("ignoring malformed bridge call", "payload", truncate(payload, 200))
		return
	}
	timeout := r.in.HandlerTimeout
	if timeout == 0 {
		timeout = 30 * time.Second
	}
	callCtx, cancel := context.WithTimeout(ctx, timeout)
	result, err := r.in.Handler.Handle(callCtx, call.Op, call.Args)
	cancel()

	ok, value := true, any(result)
	if err != nil {
		r.in.Log.Warn("bridge call failed", "op", call.Op, "err", err)
		ok, value = false, err.Error()
	}
	encoded, err := json.Marshal(value)
	if err != nil {
		ok, encoded = false, []byte(`"helper could not encode the result"`)
	}
	expr := fmt.Sprintf("window.__sc?.bridge.reply(%d,%t,%s)", *call.ID, ok, encoded)
	if err := r.evaluate(ctx, sessionID, contextID, expr); err != nil {
		// The page may have reloaded mid-call; its new instance will ask again.
		r.in.Log.Debug("bridge reply not delivered", "op", call.Op, "err", err)
	}
}

// evaluate runs JS in the page (contextID 0 = the main world's current context) and surfaces exceptions.
func (r *runner) evaluate(ctx context.Context, sessionID string, contextID int64, expression string) error {
	params := map[string]any{"expression": expression}
	if contextID != 0 {
		params["contextId"] = contextID
	}
	var res struct {
		ExceptionDetails *struct {
			Text      string `json:"text"`
			Exception *struct {
				Description string `json:"description"`
			} `json:"exception"`
		} `json:"exceptionDetails"`
	}
	if err := r.conn.Call(ctx, sessionID, "Runtime.evaluate", params, &res); err != nil {
		return err
	}
	if d := res.ExceptionDetails; d != nil {
		msg := d.Text
		if d.Exception != nil && d.Exception.Description != "" {
			msg = d.Exception.Description
		}
		return errors.New("page exception: " + truncate(msg, 500))
	}
	return nil
}

// cleanup undoes our hooks so a reload after the helper quit shows plain Spotify and the page
// stops calling a binding nobody answers.
func (r *runner) cleanup() {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	for _, s := range r.snapshot() {
		s.mu.Lock()
		scriptID := s.scriptID
		s.mu.Unlock()
		errs := []error{r.conn.Call(ctx, s.id, "Runtime.removeBinding", map[string]any{"name": BindingName}, nil)}
		if scriptID != "" {
			errs = append(errs, r.conn.Call(ctx, s.id, "Page.removeScriptToEvaluateOnNewDocument", map[string]any{"identifier": scriptID}, nil))
		}
		errs = append(errs,
			r.evaluate(ctx, s.id, 0, "delete window."+BindingName),
			r.conn.Call(ctx, "", "Target.detachFromTarget", map[string]any{"sessionId": s.id}, nil))
		if err := errors.Join(errs...); err != nil {
			r.in.Log.Warn("removing hooks from Spotify was incomplete", "err", err)
			continue
		}
		r.in.Log.Info("hooks removed from Spotify", "target", s.targetID)
	}
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
