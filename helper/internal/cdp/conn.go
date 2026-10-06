// Package cdp is a minimal Chrome DevTools Protocol client: one browser-level WebSocket connection,
// request/response calls (optionally scoped to a flattened target session) and an event stream.
package cdp

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"sync/atomic"

	"github.com/coder/websocket"
)

// ErrClosed is returned by Call once the connection has gone away (e.g. Spotify quit).
var ErrClosed = errors.New("cdp: connection closed")

// Event is a protocol notification. SessionID is empty for browser-level events.
type Event struct {
	SessionID string
	Method    string
	Params    json.RawMessage
}

// RemoteError is an error reported by the browser for a specific call.
type RemoteError struct {
	Method  string
	Code    int    `json:"code"`
	Message string `json:"message"`
}

func (e *RemoteError) Error() string {
	return fmt.Sprintf("cdp %s: %s (%d)", e.Method, e.Message, e.Code)
}

type request struct {
	ID        int64  `json:"id"`
	Method    string `json:"method"`
	Params    any    `json:"params,omitempty"`
	SessionID string `json:"sessionId,omitempty"`
}

type message struct {
	ID        int64           `json:"id"`
	Method    string          `json:"method"`
	Params    json.RawMessage `json:"params"`
	Result    json.RawMessage `json:"result"`
	Error     *RemoteError    `json:"error"`
	SessionID string          `json:"sessionId"`
}

type reply struct {
	result json.RawMessage
	err    error
}

// Conn is a single DevTools WebSocket connection. Safe for concurrent use.
type Conn struct {
	ws     *websocket.Conn
	nextID atomic.Int64
	events chan Event
	done   chan struct{} // closed when the read loop has exited
	quit   chan struct{} // closed by Close so a blocked event send can't leak the read loop

	closeOnce sync.Once

	mu      sync.Mutex
	pending map[int64]chan reply
	err     error
}

// maxMessageBytes bounds a single inbound protocol message. Payload evaluation results are small,
// but console/runtime events can carry large strings.
const maxMessageBytes = 64 << 20

// Dial connects to a DevTools WebSocket URL (from /json/version). No Origin header is sent, which is
// what Chromium's --remote-allow-origins check expects from non-browser clients.
func Dial(ctx context.Context, url string) (*Conn, error) {
	ws, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		return nil, fmt.Errorf("cdp dial: %w", err)
	}
	ws.SetReadLimit(maxMessageBytes)
	c := &Conn{
		ws:      ws,
		events:  make(chan Event, 256),
		done:    make(chan struct{}),
		quit:    make(chan struct{}),
		pending: make(map[int64]chan reply),
	}
	go c.readLoop()
	return c, nil
}

// Events delivers protocol notifications until the connection closes (then the channel is closed).
func (c *Conn) Events() <-chan Event { return c.events }

// Done is closed when the connection is gone.
func (c *Conn) Done() <-chan struct{} { return c.done }

// Close closes the connection. Pending calls fail with ErrClosed.
func (c *Conn) Close() error {
	var err error
	c.closeOnce.Do(func() {
		close(c.quit)
		err = c.ws.CloseNow()
	})
	return err
}

// Call sends a command and decodes its result into out (which may be nil).
// sessionID scopes the command to an attached target; empty means browser level.
func (c *Conn) Call(ctx context.Context, sessionID, method string, params, out any) error {
	id := c.nextID.Add(1)
	ch := make(chan reply, 1)

	c.mu.Lock()
	if c.err != nil {
		c.mu.Unlock()
		return c.err
	}
	c.pending[id] = ch
	c.mu.Unlock()

	data, err := json.Marshal(request{ID: id, Method: method, Params: params, SessionID: sessionID})
	if err != nil {
		c.forget(id)
		return fmt.Errorf("cdp %s: encode: %w", method, err)
	}
	if err := c.ws.Write(ctx, websocket.MessageText, data); err != nil {
		c.forget(id)
		return fmt.Errorf("cdp %s: write: %w", method, err)
	}

	select {
	case r := <-ch:
		if r.err != nil {
			var remote *RemoteError
			if errors.As(r.err, &remote) {
				remote.Method = method
			}
			return r.err
		}
		if out == nil || len(r.result) == 0 {
			return nil
		}
		if err := json.Unmarshal(r.result, out); err != nil {
			return fmt.Errorf("cdp %s: decode result: %w", method, err)
		}
		return nil
	case <-ctx.Done():
		c.forget(id)
		return ctx.Err()
	}
}

func (c *Conn) forget(id int64) {
	c.mu.Lock()
	delete(c.pending, id)
	c.mu.Unlock()
}

func (c *Conn) readLoop() {
	defer c.shutdown()
	ctx := context.Background()
	for {
		_, data, err := c.ws.Read(ctx)
		if err != nil {
			return
		}
		var m message
		if err := json.Unmarshal(data, &m); err != nil {
			continue // not a protocol message; ignore rather than tearing down the session
		}
		if m.ID != 0 {
			c.resolve(m)
			continue
		}
		if m.Method != "" {
			select {
			case c.events <- Event{SessionID: m.SessionID, Method: m.Method, Params: m.Params}:
			case <-c.quit:
				return
			}
		}
	}
}

func (c *Conn) resolve(m message) {
	c.mu.Lock()
	ch, ok := c.pending[m.ID]
	delete(c.pending, m.ID)
	c.mu.Unlock()
	if !ok {
		return
	}
	if m.Error != nil {
		ch <- reply{err: m.Error}
		return
	}
	ch <- reply{result: m.Result}
}

func (c *Conn) shutdown() {
	c.mu.Lock()
	c.err = ErrClosed
	pending := c.pending
	c.pending = map[int64]chan reply{}
	c.mu.Unlock()

	for _, ch := range pending {
		ch <- reply{err: ErrClosed}
	}
	close(c.done)
	close(c.events)
}
