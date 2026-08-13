package server

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type ServiceRequest struct {
	ID         string     `json:"id"`
	TableID    string     `json:"tableId"`
	Type       string     `json:"type"`
	Status     string     `json:"status"`
	Notes      string     `json:"notes"`
	CreatedAt  time.Time  `json:"createdAt"`
	ResolvedAt *time.Time `json:"resolvedAt,omitempty"`
}

func (s *Server) listServiceRequests(w http.ResponseWriter, r *http.Request) {
	statusFilter := r.URL.Query().Get("status")
	typeFilter := r.URL.Query().Get("type")
	tableFilter := r.URL.Query().Get("table")

	q := `SELECT id, table_id, type, status, notes, created_at, resolved_at FROM service_requests WHERE 1=1`
	args := []any{}
	n := 1

	if statusFilter != "" {
		q += fmt.Sprintf(" AND status = $%d", n)
		args = append(args, strings.ToUpper(statusFilter))
		n++
	}
	if typeFilter != "" {
		q += fmt.Sprintf(" AND type = $%d", n)
		args = append(args, strings.ToUpper(typeFilter))
		n++
	}
	if tableFilter != "" {
		q += fmt.Sprintf(" AND table_id = $%d", n)
		args = append(args, tableFilter)
		n++
	}

	q += " ORDER BY created_at DESC"

	rows, err := s.Pool.Query(r.Context(), q, args...)
	if err != nil {
		writeJSON(w, 200, []ServiceRequest{})
		return
	}
	defer rows.Close()

	reqs := make([]ServiceRequest, 0)
	for rows.Next() {
		var req ServiceRequest
		if err := rows.Scan(&req.ID, &req.TableID, &req.Type, &req.Status, &req.Notes, &req.CreatedAt, &req.ResolvedAt); err == nil {
			reqs = append(reqs, req)
		}
	}

	writeJSON(w, 200, reqs)
}

func (s *Server) createServiceRequest(w http.ResponseWriter, r *http.Request) {
	var body struct {
		TableID string `json:"tableId"`
		Type    string `json:"type"`
		Notes   string `json:"notes"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid JSON body")
		return
	}

	if body.TableID == "" {
		writeErr(w, 400, "tableId is required")
		return
	}
	if body.Type == "" {
		body.Type = "WAITER"
	}
	body.Type = strings.ToUpper(body.Type)

	id := fmt.Sprintf("req-%s", uuid.New().String()[:8])
	var req ServiceRequest

	err := s.Pool.QueryRow(r.Context(), `
		INSERT INTO service_requests (id, table_id, type, status, notes)
		VALUES ($1, $2, $3, 'PENDING', $4)
		RETURNING id, table_id, type, status, notes, created_at, resolved_at`,
		id, body.TableID, body.Type, body.Notes,
	).Scan(&req.ID, &req.TableID, &req.Type, &req.Status, &req.Notes, &req.CreatedAt, &req.ResolvedAt)

	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}

	// Update table status if appropriate
	tableStatus := "WAITING_FOR_SERVICE"
	if req.Type == "BILL" {
		tableStatus = "WAITING_FOR_PAYMENT"
	}
	_, _ = s.Pool.Exec(r.Context(), `UPDATE tables SET status=$1, updated_at=now() WHERE id=$2`, tableStatus, req.TableID)

	// Broadcast via Ably and NATS
	s.Ably.Publish(r.Context(), "yadotena-realtime", "service_request.created", req)
	s.Ably.Publish(r.Context(), "yadotena-realtime", "table.updated", map[string]any{"id": req.TableID, "status": tableStatus})
	s.NATS.Publish("yadotena.service_requests.created", req)

	writeJSON(w, 201, req)
}

func (s *Server) resolveServiceRequest(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req ServiceRequest
	err := s.Pool.QueryRow(r.Context(), `
		UPDATE service_requests SET status = 'RESOLVED', resolved_at = now()
		WHERE id = $1
		RETURNING id, table_id, type, status, notes, created_at, resolved_at`, id).Scan(
		&req.ID, &req.TableID, &req.Type, &req.Status, &req.Notes, &req.CreatedAt, &req.ResolvedAt,
	)

	if err != nil {
		writeErr(w, 404, "Service request not found")
		return
	}

	// Check remaining pending requests for table
	var pendingCount int
	_ = s.Pool.QueryRow(r.Context(), `SELECT COUNT(*) FROM service_requests WHERE table_id = $1 AND status = 'PENDING'`, req.TableID).Scan(&pendingCount)

	if pendingCount == 0 {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE tables SET status = 'OCCUPIED', updated_at = now() WHERE id = $1 AND status IN ('WAITING_FOR_SERVICE', 'WAITING_FOR_PAYMENT')`, req.TableID)
		s.Ably.Publish(r.Context(), "yadotena-realtime", "table.updated", map[string]any{"id": req.TableID, "status": "OCCUPIED"})
	}

	s.Ably.Publish(r.Context(), "yadotena-realtime", "service_request.resolved", req)
	s.NATS.Publish("yadotena.service_requests.resolved", req)

	writeJSON(w, 200, req)
}
