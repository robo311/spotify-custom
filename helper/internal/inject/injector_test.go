package inject_test

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"strconv"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"spotifycustom/internal/cdp"
	"spotifycustom/internal/cdp/cdptest"
	"spotifycustom/internal/inject"
)

const uiURL = "https://xpui.app.spotify.com/index.html"

type staticPayload struct{ src atomic.Value }

func newPayload(src string) *staticPayload {
	p := &staticPayload{}
	p.src.Store(src)
	return p
}

func (p *staticPayload) Source() (string, error) { return p.src.Load().(string), nil }

type handlerFunc func(ctx context.Context, op string, args json.RawMessage) (any, error)

func (f handlerFunc) Handle(ctx context.Context, op string, args json.RawMessage) (any, error) {
	return f(ctx, op, args)
}

type harness struct {
	srv    *cdptest.Server
	cancel context.CancelFunc
	done   chan error
	reload chan struct{}
	pl     *staticPayload
	in     *inject.Injector
}

func start(t *testing.T, h inject.Handler) *harness {
	t.Helper()
	srv := cdptest.New(t)
	var sessions atomic.Int32
	srv.Handle("Target.attachToTarget", func(c cdptest.Call) (any, error) {
		return map[string]string{"sessionId": "S" + strconv.Itoa(int(sessions.Add(1)))}, nil
	})
	var scripts atomic.Int32
	srv.Handle("Page.addScriptToEvaluateOnNewDocument", func(c cdptest.Call) (any, error) {
		return map[string]string{"identifier": strconv.Itoa(int(scripts.Add(1)))}, nil
	})

	conn, err := cdp.Dial(context.Background(), srv.BrowserURL())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = conn.Close() })

	ctx, cancel := context.WithCancel(context.Background())
	hs := &harness{srv: srv, cancel: cancel, done: make(chan error, 1), reload: make(chan struct{}, 1), pl: newPayload("/*payload v1*/")}
	in := &inject.Injector{
		Payload: hs.pl,
		Handler: h,
		Log:     slog.New(slog.NewTextHandler(io.Discard, nil)),
		Reload:  hs.reload,
	}
	hs.in = in
	go func() { hs.done <- in.Run(ctx, conn) }()
	t.Cleanup(cancel)
	srv.WaitFor("Target.setDiscoverTargets", 1)
	return hs
}

func (h *harness) createTarget(id, typ, url string) {
	h.srv.Emit("", "Target.targetCreated", map[string]any{"targetInfo": map[string]any{"targetId": id, "type": typ, "url": url}})
}

func params(t *testing.T, c cdptest.Call) map[string]any {
	t.Helper()
	var m map[string]any
	if err := json.Unmarshal(c.Params, &m); err != nil {
		t.Fatal(err)
	}
	return m
}

func noHandler(context.Context, string, json.RawMessage) (any, error) { return nil, nil }

func TestInjectsIntoSpotifyUIOnly(t *testing.T) {
	h := start(t, handlerFunc(noHandler))
	h.createTarget("popup", "browser_ui", "chrome://omnibox-popup.top-chrome/")
	h.createTarget("ui", "page", uiURL)

	attach := h.srv.WaitFor("Target.attachToTarget", 1)
	if got := params(t, attach[0])["targetId"]; got != "ui" {
		t.Fatalf("attached to %v, want ui", got)
	}
	binding := h.srv.WaitFor("Runtime.addBinding", 1)[0]
	if binding.SessionID != "S1" || params(t, binding)["name"] != inject.BindingName {
		t.Fatalf("binding call = %+v", binding)
	}
	script := h.srv.WaitFor("Page.addScriptToEvaluateOnNewDocument", 1)[0]
	if params(t, script)["source"] != "/*payload v1*/" {
		t.Fatalf("new-document script = %s", script.Params)
	}
	eval := h.srv.WaitFor("Runtime.evaluate", 1)[0]
	if params(t, eval)["expression"] != "/*payload v1*/" {
		t.Fatalf("evaluate = %s", eval.Params)
	}
	if n := len(h.srv.WaitFor("Target.attachToTarget", 1)); n != 1 {
		t.Fatalf("attached %d times, want 1", n)
	}
}

func TestBridgeRepliesWithResultAndErrors(t *testing.T) {
	h := start(t, handlerFunc(func(_ context.Context, op string, args json.RawMessage) (any, error) {
		if op == "deleteTheme" {
			return nil, errors.New("no such theme")
		}
		return map[string]any{"op": op, "args": json.RawMessage(args)}, nil
	}))
	h.createTarget("ui", "page", uiURL)
	h.srv.WaitFor("Runtime.evaluate", 1) // payload injected

	h.srv.Emit("S1", "Runtime.bindingCalled", map[string]any{
		"name": inject.BindingName, "executionContextId": 5,
		"payload": `{"id":7,"op":"getState","args":{"a":1}}`,
	})
	evals := h.srv.WaitFor("Runtime.evaluate", 2)
	reply := params(t, evals[1])
	if reply["expression"] != `window.__sc?.bridge.reply(7,true,{"args":{"a":1},"op":"getState"})` || reply["contextId"] != float64(5) {
		t.Fatalf("reply = %v", reply)
	}

	h.srv.Emit("S1", "Runtime.bindingCalled", map[string]any{
		"name": inject.BindingName, "executionContextId": 5,
		"payload": `{"id":8,"op":"deleteTheme","args":{"id":"x"}}`,
	})
	evals = h.srv.WaitFor("Runtime.evaluate", 3)
	if got := params(t, evals[2])["expression"]; got != `window.__sc?.bridge.reply(8,false,"no such theme")` {
		t.Fatalf("error reply = %v", got)
	}
}

func TestIgnoresMalformedAndForeignBindingCalls(t *testing.T) {
	var calls atomic.Int32
	h := start(t, handlerFunc(func(context.Context, string, json.RawMessage) (any, error) {
		calls.Add(1)
		return nil, nil
	}))
	h.createTarget("ui", "page", uiURL)
	h.srv.WaitFor("Runtime.evaluate", 1)

	h.srv.Emit("S1", "Runtime.bindingCalled", map[string]any{"name": inject.BindingName, "payload": `not json`})
	h.srv.Emit("S1", "Runtime.bindingCalled", map[string]any{"name": inject.BindingName, "payload": `{"op":"getState"}`})
	h.srv.Emit("S1", "Runtime.bindingCalled", map[string]any{"name": "otherBinding", "payload": `{"id":1,"op":"getState"}`})
	// A valid call afterwards proves the loop survived the bad ones.
	h.srv.Emit("S1", "Runtime.bindingCalled", map[string]any{"name": inject.BindingName, "payload": `{"id":2,"op":"getState","args":null}`})
	h.srv.WaitFor("Runtime.evaluate", 2)
	if n := calls.Load(); n != 1 {
		t.Fatalf("handler called %d times, want 1", n)
	}
}

func TestReattachesAfterTargetIsDestroyed(t *testing.T) {
	h := start(t, handlerFunc(noHandler))
	h.createTarget("ui-1", "page", uiURL)
	h.srv.WaitFor("Runtime.evaluate", 1)

	h.srv.Emit("", "Target.targetDestroyed", map[string]any{"targetId": "ui-1"})
	h.createTarget("ui-2", "page", uiURL)

	attaches := h.srv.WaitFor("Target.attachToTarget", 2)
	if got := params(t, attaches[1])["targetId"]; got != "ui-2" {
		t.Fatalf("re-attached to %v, want ui-2", got)
	}
	if b := h.srv.WaitFor("Runtime.addBinding", 2)[1]; b.SessionID != "S2" {
		t.Fatalf("binding on %q, want S2", b.SessionID)
	}
}

func TestDevReloadReplacesScript(t *testing.T) {
	h := start(t, handlerFunc(noHandler))
	h.createTarget("ui", "page", uiURL)
	h.srv.WaitFor("Runtime.evaluate", 1)

	h.pl.src.Store("/*payload v2*/")
	h.reload <- struct{}{}

	removed := h.srv.WaitFor("Page.removeScriptToEvaluateOnNewDocument", 1)[0]
	if params(t, removed)["identifier"] != "1" {
		t.Fatalf("removed %s, want identifier 1", removed.Params)
	}
	added := h.srv.WaitFor("Page.addScriptToEvaluateOnNewDocument", 2)[1]
	if params(t, added)["source"] != "/*payload v2*/" {
		t.Fatalf("re-added %s", added.Params)
	}
	if e := h.srv.WaitFor("Runtime.evaluate", 2)[1]; params(t, e)["expression"] != "/*payload v2*/" {
		t.Fatalf("re-evaluated %s", e.Params)
	}
}

func TestCancelCleansUp(t *testing.T) {
	h := start(t, handlerFunc(noHandler))
	h.createTarget("ui", "page", uiURL)
	h.srv.WaitFor("Runtime.evaluate", 1)

	h.cancel()
	select {
	case err := <-h.done:
		if !errors.Is(err, context.Canceled) {
			t.Fatalf("Run returned %v, want context.Canceled", err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Run did not return after cancel")
	}
	h.srv.WaitFor("Runtime.removeBinding", 1)
	h.srv.WaitFor("Page.removeScriptToEvaluateOnNewDocument", 1)
	h.srv.WaitFor("Target.detachFromTarget", 1)
	last := h.srv.WaitFor("Runtime.evaluate", 2)[1]
	if !strings.Contains(params(t, last)["expression"].(string), "delete window."+inject.BindingName) {
		t.Fatalf("last evaluate = %s", last.Params)
	}
}

func TestConnectionLossEndsRun(t *testing.T) {
	h := start(t, handlerFunc(noHandler))
	h.srv.DropConnections()
	select {
	case err := <-h.done:
		if !errors.Is(err, cdp.ErrClosed) {
			t.Fatalf("Run returned %v, want ErrClosed", err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Run did not return after connection loss")
	}
}

// Regression: Chromium only runs new-document scripts on reload with Page.enable, and only
// re-installs bindings into the new document with Runtime.enable (see chrome_test.go).
func TestEnablesDomainsBeforeInstallingHooks(t *testing.T) {
	h := start(t, handlerFunc(noHandler))
	h.createTarget("ui", "page", uiURL)
	h.srv.WaitFor("Runtime.evaluate", 1)

	first := map[string]int{}
	var methods []string
	for i, c := range h.srv.Calls() {
		if c.SessionID != "S1" {
			continue
		}
		methods = append(methods, c.Method)
		if _, seen := first[c.Method]; !seen {
			first[c.Method] = i
		}
	}
	for _, p := range [][2]string{{"Runtime.enable", "Runtime.addBinding"}, {"Page.enable", "Page.addScriptToEvaluateOnNewDocument"}} {
		enable, ok := first[p[0]]
		if !ok || enable > first[p[1]] {
			t.Errorf("%s must be sent before %s; session calls: %v", p[0], p[1], methods)
		}
	}
}

func evaluated(srv *cdptest.Server, expr string) []cdptest.Call {
	var out []cdptest.Call
	for _, c := range srv.Calls() {
		var p struct {
			Expression string `json:"expression"`
		}
		if c.Method == "Runtime.evaluate" && json.Unmarshal(c.Params, &p) == nil && p.Expression == expr {
			out = append(out, c)
		}
	}
	return out
}

func TestBroadcastEvaluatesInEveryPageAndDropsWhileBusy(t *testing.T) {
	h := start(t, handlerFunc(noHandler))
	h.in.Broadcast("early") // nothing attached yet: dropped

	release := make(chan struct{})
	entered := make(chan struct{}, 1)
	h.srv.Handle("Runtime.evaluate", func(c cdptest.Call) (any, error) {
		var p struct {
			Expression string `json:"expression"`
		}
		if json.Unmarshal(c.Params, &p) == nil && p.Expression == "slow" {
			entered <- struct{}{}
			<-release
		}
		return map[string]any{}, nil
	})
	h.createTarget("ui", "page", uiURL)
	h.srv.WaitFor("Runtime.evaluate", 1) // payload injected

	h.in.Broadcast("slow")
	<-entered
	h.in.Broadcast("dropped") // the page is still busy with "slow"
	close(release)

	deadline := time.Now().Add(3 * time.Second)
	for len(evaluated(h.srv, "after")) == 0 {
		if time.Now().After(deadline) {
			t.Fatal("broadcast never resumed after the busy evaluate returned")
		}
		h.in.Broadcast("after")
		time.Sleep(5 * time.Millisecond)
	}
	if n := len(evaluated(h.srv, "dropped")); n != 0 {
		t.Errorf("busy page got the dropped broadcast %d times", n)
	}
	if n := len(evaluated(h.srv, "early")); n != 0 {
		t.Errorf("broadcast before attach was delivered %d times", n)
	}
	c := evaluated(h.srv, "slow")[0]
	if c.SessionID != "S1" || params(t, c)["silent"] != true {
		t.Errorf("broadcast call = %+v", c)
	}

	h.cancel()
	<-h.done
	h.in.Broadcast("late") // after the connection ended: no-op, no panic
}
