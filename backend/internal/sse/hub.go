package sse

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

const RedisChannel = "yadotena:events"

type redisEnvelope struct {
	Scope   string          `json:"scope"` // staff | order
	OrderID string          `json:"orderId,omitempty"`
	Event   string          `json:"event"`
	Data    json.RawMessage `json:"data"`
}

type Hub struct {
	mu     sync.RWMutex
	staff  map[chan []byte]struct{}
	orders map[string]map[chan []byte]struct{}
	redis  *redis.Client
}

func NewHub() *Hub {
	return &Hub{
		staff:  make(map[chan []byte]struct{}),
		orders: make(map[string]map[chan []byte]struct{}),
	}
}

// AttachRedis enables multi-instance fan-out via pub/sub. Safe with nil client.
func (h *Hub) AttachRedis(ctx context.Context, client *redis.Client) {
	h.redis = client
	if client == nil {
		return
	}
	go h.subscribeLoop(ctx)
}

func (h *Hub) subscribeLoop(ctx context.Context) {
	for {
		if ctx.Err() != nil {
			return
		}
		pubsub := h.redis.Subscribe(ctx, RedisChannel)
		ch := pubsub.Channel()
		log.Printf("sse: subscribed to redis channel %s", RedisChannel)
		for {
			select {
			case <-ctx.Done():
				_ = pubsub.Close()
				return
			case msg, ok := <-ch:
				if !ok {
					_ = pubsub.Close()
					time.Sleep(time.Second)
					goto reconnect
				}
				h.deliverFromRedis([]byte(msg.Payload))
			}
		}
	reconnect:
	}
}

func (h *Hub) deliverFromRedis(raw []byte) {
	var env redisEnvelope
	if err := json.Unmarshal(raw, &env); err != nil {
		return
	}
	b, _ := json.Marshal(map[string]any{"event": env.Event, "data": json.RawMessage(env.Data)})
	switch env.Scope {
	case "order":
		h.deliverOrder(env.OrderID, b, true)
	default:
		h.deliverStaff(b)
	}
}

func (h *Hub) publishRedis(scope, orderID, event string, payload any) {
	if h.redis == nil {
		return
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return
	}
	env := redisEnvelope{Scope: scope, OrderID: orderID, Event: event, Data: data}
	b, err := json.Marshal(env)
	if err != nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := h.redis.Publish(ctx, RedisChannel, b).Err(); err != nil {
		log.Printf("sse: redis publish: %v", err)
	}
}

func (h *Hub) SubscribeStaff() chan []byte {
	ch := make(chan []byte, 16)
	h.mu.Lock()
	h.staff[ch] = struct{}{}
	h.mu.Unlock()
	return ch
}

func (h *Hub) UnsubscribeStaff(ch chan []byte) {
	h.mu.Lock()
	delete(h.staff, ch)
	h.mu.Unlock()
	close(ch)
}

func (h *Hub) SubscribeOrder(orderID string) chan []byte {
	ch := make(chan []byte, 16)
	h.mu.Lock()
	if h.orders[orderID] == nil {
		h.orders[orderID] = make(map[chan []byte]struct{})
	}
	h.orders[orderID][ch] = struct{}{}
	h.mu.Unlock()
	return ch
}

func (h *Hub) UnsubscribeOrder(orderID string, ch chan []byte) {
	h.mu.Lock()
	if m := h.orders[orderID]; m != nil {
		delete(m, ch)
		if len(m) == 0 {
			delete(h.orders, orderID)
		}
	}
	h.mu.Unlock()
	close(ch)
}

func (h *Hub) deliverStaff(b []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.staff {
		select {
		case ch <- b:
		default:
		}
	}
}

func (h *Hub) deliverOrder(orderID string, b []byte, alsoStaff bool) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.orders[orderID] {
		select {
		case ch <- b:
		default:
		}
	}
	if alsoStaff {
		for ch := range h.staff {
			select {
			case ch <- b:
			default:
			}
		}
	}
}

func (h *Hub) BroadcastStaff(event string, payload any) {
	if h.redis != nil {
		h.publishRedis("staff", "", event, payload)
		return
	}
	b, _ := json.Marshal(map[string]any{"event": event, "data": payload})
	h.deliverStaff(b)
}

func (h *Hub) BroadcastOrder(orderID, event string, payload any) {
	if h.redis != nil {
		h.publishRedis("order", orderID, event, payload)
		return
	}
	b, _ := json.Marshal(map[string]any{"event": event, "data": payload})
	h.deliverOrder(orderID, b, true)
}

func WriteSSE(w http.ResponseWriter, flusher http.Flusher, msg []byte) {
	_, _ = w.Write([]byte("data: "))
	_, _ = w.Write(msg)
	_, _ = w.Write([]byte("\n\n"))
	flusher.Flush()
}

func WriteSSEComment(w http.ResponseWriter, flusher http.Flusher, comment string) {
	_, _ = w.Write([]byte(": "))
	_, _ = w.Write([]byte(comment))
	_, _ = w.Write([]byte("\n\n"))
	flusher.Flush()
}
