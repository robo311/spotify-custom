// Package cdptest provides a fake DevTools endpoint for tests: it serves /json/version, accepts
// WebSocket connections, answers commands via registered handlers and can push events.
package cdptest

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/coder/websocket"
)

// SpotifyUA is a User-Agent the real Spotify reports; use it to make the fake look trusted.
const SpotifyUA = "Mozilla/5.0 (Macintosh) Chrome/151.0 Spotify/1.3.3.264 Safari/537.36"

// Call is a command the fake server received.
type Call struct {
	Method    string
	SessionID string
	Params    json.RawMessage
}

// Handler answers one command. Return (result, nil) or (nil, error) to send a protocol error.
type Handler func(c Call) (any, error)

// Server is a fake DevTools endpoint.
type Server struct {
	t    testing.TB
	http *httptest.Server

	mu        sync.Mutex
	userAgent string
	handlers  map[string]Handler
	calls     []Call
	conns     []*websocket.Conn
	notify    chan struct{}
}

// New starts a fake endpoint that is closed when the test ends.
func New(t testing.TB) *Server {
	s := &Server{t: t, userAgent: SpotifyUA, handlers: map[string]Handler{}, notify: make(chan struct{}, 1)}
	mux := http.NewServeMux()
	mux.HandleFunc("/json/version", s.serveVersion)
	mux.HandleFunc("/devtools/browser/fake", s.serveWS)
	s.http = httptest.NewServer(mux)
	t.Cleanup(s.Close)
	return s
}

// Port is the TCP port the fake listens on (127.0.0.1).
func (s *Server) Port() int {
	_, p, _ := net.SplitHostPort(strings.TrimPrefix(s.http.URL, "http://"))
	n, _ := strconv.Atoi(p)
	return n
}

// BrowserURL is the WebSocket URL a client should dial.
func (s *Server) BrowserURL() string {
	return "ws" + strings.TrimPrefix(s.http.URL, "http") + "/devtools/browser/fake"
}

// SetUserAgent changes what /json/version reports (e.g. to simulate a non-Spotify browser).
func (s *Server) SetUserAgent(ua string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.userAgent = ua
}

// Handle registers the answer for a method. Unhandled methods return an empty result.
func (s *Server) Handle(method string, h Handler) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.handlers[method] = h
}

// Emit pushes an event to every connected client.
func (s *Server) Emit(sessionID, method string, params any) {
	msg := map[string]any{"method": method, "params": params}
	if sessionID != "" {
		msg["sessionId"] = sessionID
	}
	data, err := json.Marshal(msg)
	if err != nil {
		s.t.Fatalf("cdptest: encode event: %v", err)
	}
	s.mu.Lock()
	conns := append([]*websocket.Conn(nil), s.conns...)
	s.mu.Unlock()
	for _, c := range conns {
		_ = c.Write(context.Background(), websocket.MessageText, data)
	}
}

// Calls returns every command received so far, in order.
func (s *Server) Calls() []Call {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]Call(nil), s.calls...)
}

// WaitFor blocks until a command matching method has been received n times, or fails the test.
func (s *Server) WaitFor(method string, n int) []Call {
	s.t.Helper()
	deadline := time.After(3 * time.Second)
	for {
		var got []Call
		for _, c := range s.Calls() {
			if c.Method == method {
				got = append(got, c)
			}
		}
		if len(got) >= n {
			return got
		}
		select {
		case <-s.notify:
		case <-deadline:
			s.t.Fatalf("cdptest: waited for %d× %s, got %d (calls: %v)", n, method, len(got), s.methods())
			return nil
		}
	}
}

// DropConnections closes every client connection, as if the browser quit.
func (s *Server) DropConnections() {
	s.mu.Lock()
	conns := s.conns
	s.conns = nil
	s.mu.Unlock()
	for _, c := range conns {
		_ = c.CloseNow()
	}
}

// Close stops the fake endpoint.
func (s *Server) Close() {
	s.DropConnections()
	s.http.Close()
}

func (s *Server) methods() []string {
	var out []string
	for _, c := range s.Calls() {
		out = append(out, c.Method)
	}
	return out
}

func (s *Server) serveVersion(w http.ResponseWriter, _ *http.Request) {
	s.mu.Lock()
	ua := s.userAgent
	s.mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{
		"User-Agent":           ua,
		"webSocketDebuggerUrl": s.BrowserURL(),
	})
}

func (s *Server) serveWS(w http.ResponseWriter, r *http.Request) {
	c, err := websocket.Accept(w, r, nil)
	if err != nil {
		return
	}
	c.SetReadLimit(64 << 20)
	s.mu.Lock()
	s.conns = append(s.conns, c)
	s.mu.Unlock()

	ctx := context.Background()
	for {
		_, data, err := c.Read(ctx)
		if err != nil {
			return
		}
		var req struct {
			ID        int64           `json:"id"`
			Method    string          `json:"method"`
			Params    json.RawMessage `json:"params"`
			SessionID string          `json:"sessionId"`
		}
		if err := json.Unmarshal(data, &req); err != nil {
			continue
		}
		call := Call{Method: req.Method, SessionID: req.SessionID, Params: req.Params}

		s.mu.Lock()
		s.calls = append(s.calls, call)
		h := s.handlers[req.Method]
		s.mu.Unlock()
		select {
		case s.notify <- struct{}{}:
		default:
		}

		resp := map[string]any{"id": req.ID}
		if req.SessionID != "" {
			resp["sessionId"] = req.SessionID
		}
		var result any = map[string]any{}
		if h != nil {
			res, herr := h(call)
			if herr != nil {
				resp["error"] = map[string]any{"code": -32000, "message": herr.Error()}
			} else if res != nil {
				result = res
			}
		}
		if _, isErr := resp["error"]; !isErr {
			resp["result"] = result
		}
		out, err := json.Marshal(resp)
		if err != nil {
			s.t.Errorf("cdptest: encode response for %s: %v", req.Method, err)
			return
		}
		_ = c.Write(ctx, websocket.MessageText, out)
	}
}
