package sse

import (
	"encoding/json"
	"net/http"
	"sync"
)

type Hub struct {
	mu       sync.RWMutex
	staff    map[chan []byte]struct{}
	orders   map[string]map[chan []byte]struct{}
}

func NewHub() *Hub {
	return &Hub{
		staff:  make(map[chan []byte]struct{}),
		orders: make(map[string]map[chan []byte]struct{}),
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

func (h *Hub) BroadcastStaff(event string, payload any) {
	b, _ := json.Marshal(map[string]any{"event": event, "data": payload})
	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.staff {
		select {
		case ch <- b:
		default:
		}
	}
}

func (h *Hub) BroadcastOrder(orderID, event string, payload any) {
	b, _ := json.Marshal(map[string]any{"event": event, "data": payload})
	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.orders[orderID] {
		select {
		case ch <- b:
		default:
		}
	}
	for ch := range h.staff {
		select {
		case ch <- b:
		default:
		}
	}
}

func WriteSSE(w http.ResponseWriter, flusher http.Flusher, msg []byte) {
	_, _ = w.Write([]byte("data: "))
	_, _ = w.Write(msg)
	_, _ = w.Write([]byte("\n\n"))
	flusher.Flush()
}
