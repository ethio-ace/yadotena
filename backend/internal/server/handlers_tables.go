package server

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type Table struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Capacity       int       `json:"capacity"`
	Status         string    `json:"status"`
	QRToken        string    `json:"qrToken"`
	CurrentOrderId *string   `json:"currentOrderId,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type DiningSession struct {
	ID          string     `json:"id"`
	TableID     string     `json:"tableId"`
	SessionCode string     `json:"sessionCode"`
	Status      string     `json:"status"`
	Active      bool       `json:"active"`
	OpenOrderId *string    `json:"openOrderId"`
	StartedAt   time.Time  `json:"startedAt"`
	ClosedAt    *time.Time `json:"closedAt,omitempty"`
}

func (s *Server) listTables(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `
		SELECT id, name, capacity, status, qr_token, current_order_id, created_at, updated_at
		FROM tables ORDER BY name`)
	if err != nil {
		writeJSON(w, 200, []Table{})
		return
	}
	defer rows.Close()

	tables := make([]Table, 0)
	for rows.Next() {
		var t Table
		if err := rows.Scan(&t.ID, &t.Name, &t.Capacity, &t.Status, &t.QRToken, &t.CurrentOrderId, &t.CreatedAt, &t.UpdatedAt); err == nil {
			tables = append(tables, t)
		}
	}
	writeJSON(w, 200, tables)
}

func (s *Server) getTable(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var t Table
	err := s.Pool.QueryRow(r.Context(), `
		SELECT id, name, capacity, status, qr_token, current_order_id, created_at, updated_at
		FROM tables
		WHERE id = $1 OR LOWER(id) = LOWER($1) OR LOWER(name) = LOWER($1)
		   OR REPLACE(LOWER(id), 'tbl-', 't') = LOWER($1)
		   OR REPLACE(LOWER(name), 'table ', 't') = LOWER($1)
		LIMIT 1`, id).Scan(
		&t.ID, &t.Name, &t.Capacity, &t.Status, &t.QRToken, &t.CurrentOrderId, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		writeErr(w, 404, "Table not found")
		return
	}
	writeJSON(w, 200, t)
}

func (s *Server) createTable(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID       string `json:"id"`
		Name     string `json:"name"`
		Capacity int    `json:"capacity"`
		Status   string `json:"status"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid JSON body")
		return
	}

	if body.Name == "" {
		writeErr(w, 400, "table name is required")
		return
	}
	if body.Capacity <= 0 {
		body.Capacity = 4
	}
	if body.Status == "" {
		body.Status = "AVAILABLE"
	}

	id := body.ID
	if id == "" {
		id = fmt.Sprintf("t%d", time.Now().UnixNano()%1000)
	}

	qrToken := generateHexToken(6)

	var t Table
	err := s.Pool.QueryRow(r.Context(), `
		INSERT INTO tables (id, name, capacity, status, qr_token)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, name, capacity, status, qr_token, current_order_id, created_at, updated_at`,
		id, body.Name, body.Capacity, body.Status, qrToken,
	).Scan(&t.ID, &t.Name, &t.Capacity, &t.Status, &t.QRToken, &t.CurrentOrderId, &t.CreatedAt, &t.UpdatedAt)

	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}

	s.Ably.Publish(r.Context(), "yadotena-realtime", "table.updated", map[string]any{"id": t.ID, "status": t.Status})
	s.NATS.Publish("yadotena.tables.updated", map[string]any{"id": t.ID, "status": t.Status})

	writeJSON(w, 201, t)
}

func (s *Server) updateTable(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body map[string]any
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid JSON body")
		return
	}

	var t Table
	err := s.Pool.QueryRow(r.Context(), `
		SELECT id, name, capacity, status, qr_token, current_order_id, created_at, updated_at
		FROM tables WHERE id = $1`, id).Scan(
		&t.ID, &t.Name, &t.Capacity, &t.Status, &t.QRToken, &t.CurrentOrderId, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		writeErr(w, 404, "Table not found")
		return
	}

	if name, ok := body["name"].(string); ok {
		t.Name = name
	}
	if cap, ok := body["capacity"].(float64); ok {
		t.Capacity = int(cap)
	}
	if st, ok := body["status"].(string); ok {
		t.Status = st
	}

	_, _ = s.Pool.Exec(r.Context(), `UPDATE tables SET name=$1, capacity=$2, status=$3, updated_at=now() WHERE id=$4`, t.Name, t.Capacity, t.Status, id)

	s.Ably.Publish(r.Context(), "yadotena-realtime", "table.updated", map[string]any{"id": t.ID, "status": t.Status})
	s.NATS.Publish("yadotena.tables.updated", map[string]any{"id": t.ID, "status": t.Status})

	writeJSON(w, 200, t)
}

func (s *Server) updateTableStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body struct {
		Status         string  `json:"status"`
		CurrentOrderId *string `json:"currentOrderId"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid JSON body")
		return
	}

	if body.Status == "" {
		writeErr(w, 400, "status is required")
		return
	}

	var t Table
	err := s.Pool.QueryRow(r.Context(), `
		SELECT id, name, capacity, status, qr_token, current_order_id, created_at, updated_at
		FROM tables WHERE id = $1`, id).Scan(
		&t.ID, &t.Name, &t.Capacity, &t.Status, &t.QRToken, &t.CurrentOrderId, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		writeErr(w, 404, "Table not found")
		return
	}

	t.Status = body.Status
	if body.CurrentOrderId != nil {
		t.CurrentOrderId = body.CurrentOrderId
	}

	_, _ = s.Pool.Exec(r.Context(), `UPDATE tables SET status=$1, current_order_id=$2, updated_at=now() WHERE id=$3`, t.Status, t.CurrentOrderId, id)

	s.Ably.Publish(r.Context(), "yadotena-realtime", "table.updated", map[string]any{"id": t.ID, "status": t.Status})
	s.NATS.Publish("yadotena.tables.updated", map[string]any{"id": t.ID, "status": t.Status})

	writeJSON(w, 200, t)
}

func (s *Server) deleteTable(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, _ = s.Pool.Exec(r.Context(), `DELETE FROM tables WHERE id = $1`, id)
	w.WriteHeader(204)
}

func (s *Server) resolveTableID(ctx context.Context, rawInput *string) *string {
	if rawInput == nil {
		return nil
	}
	clean := strings.TrimSpace(*rawInput)
	if clean == "" || clean == "null" || clean == "undefined" {
		return nil
	}

	numStr := clean
	numStr = strings.TrimPrefix(strings.ToLower(numStr), "table")
	numStr = strings.TrimPrefix(strings.ToLower(numStr), "tbl-")
	numStr = strings.TrimPrefix(strings.ToLower(numStr), "t")
	numStr = strings.TrimSpace(numStr)

	numStrWithZero := numStr
	if len(numStr) == 1 && numStr[0] >= '1' && numStr[0] <= '9' {
		numStrWithZero = "0" + numStr
	}

	var resolvedID string
	err := s.Pool.QueryRow(ctx, `
		SELECT id FROM tables
		WHERE id = $1
		   OR LOWER(id) = LOWER($1)
		   OR LOWER(name) = LOWER($1)
		   OR name ILIKE $2
		   OR name ILIKE $3
		   OR id ILIKE $4
		   OR id ILIKE $5
		LIMIT 1`, clean, "Table "+clean, "Table "+numStrWithZero, "%"+numStr, "%"+numStrWithZero).Scan(&resolvedID)

	if err != nil || resolvedID == "" {
		return nil
	}
	return &resolvedID
}

func (s *Server) startSession(w http.ResponseWriter, r *http.Request) {
	rawTableId := chi.URLParam(r, "id")
	ctx := r.Context()

	resolvedPtr := s.resolveTableID(ctx, &rawTableId)
	if resolvedPtr == nil {
		writeErr(w, 404, "Table not found")
		return
	}
	tableId := *resolvedPtr

	tx, errTx := s.Pool.Begin(ctx)
	if errTx != nil {
		writeErr(w, 500, "failed to begin transaction")
		return
	}
	defer tx.Rollback(ctx)

	var session DiningSession
	var created bool = false

	// Check if active session already exists
	errS := tx.QueryRow(ctx, `
		SELECT id, table_id, session_code, status, started_at, closed_at
		FROM dining_sessions WHERE table_id = $1 AND status = 'ACTIVE' LIMIT 1 FOR UPDATE`, tableId).Scan(
		&session.ID, &session.TableID, &session.SessionCode, &session.Status, &session.StartedAt, &session.ClosedAt,
	)

	if errS != nil {
		// Close previous active sessions if any
		_, _ = tx.Exec(ctx, `UPDATE dining_sessions SET status = 'CLOSED', closed_at = now() WHERE table_id = $1 AND status = 'ACTIVE'`, tableId)

		session.ID = uuid.New().String()
		session.TableID = tableId
		session.SessionCode = fmt.Sprintf("YD-%s", strings.ToUpper(generateHexToken(3)))
		session.Status = "ACTIVE"
		session.StartedAt = time.Now()
		created = true

		_, errIns := tx.Exec(ctx, `
			INSERT INTO dining_sessions (id, table_id, session_code, status, started_at)
			VALUES ($1, $2, $3, $4, $5)`,
			session.ID, session.TableID, session.SessionCode, session.Status, session.StartedAt)
		if errIns != nil {
			writeErr(w, 500, "failed to create session")
			return
		}

		var currStatus string
		_ = tx.QueryRow(ctx, `SELECT status FROM tables WHERE id = $1 FOR UPDATE`, tableId).Scan(&currStatus)
		if currStatus == "AVAILABLE" {
			_, _ = tx.Exec(ctx, `UPDATE tables SET status = 'OCCUPIED', updated_at = now() WHERE id = $1`, tableId)
		}
	}

	if errCommit := tx.Commit(ctx); errCommit != nil {
		writeErr(w, 500, "failed to commit session transaction")
		return
	}

	if created {
		s.Ably.Publish(ctx, "yadotena-realtime", "table.updated", map[string]any{"id": tableId, "status": "OCCUPIED"})
		s.NATS.Publish("yadotena.tables.updated", map[string]any{"id": tableId, "status": "OCCUPIED"})
	}

	session.Active = true

	// Check for open order for table
	var openOrderID string
	errOrder := s.Pool.QueryRow(ctx, `
		SELECT id FROM orders WHERE table_id = $1 AND status IN ('PENDING', 'PREPARING', 'READY') ORDER BY created_at DESC LIMIT 1`, tableId).Scan(&openOrderID)
	if errOrder == nil {
		session.OpenOrderId = &openOrderID
	}

	status := 200
	if created {
		status = 201
	}
	writeJSON(w, status, session)
}

func (s *Server) getActiveSession(w http.ResponseWriter, r *http.Request) {
	tableId := r.URL.Query().Get("table")
	if tableId == "" {
		writeErr(w, 400, "table query parameter is required")
		return
	}

	ctx := r.Context()
	var session DiningSession
	err := s.Pool.QueryRow(ctx, `
		SELECT id, table_id, session_code, status, started_at, closed_at
		FROM dining_sessions WHERE table_id = $1 AND status = 'ACTIVE' LIMIT 1`, tableId).Scan(
		&session.ID, &session.TableID, &session.SessionCode, &session.Status, &session.StartedAt, &session.ClosedAt,
	)

	if err != nil {
		writeJSON(w, 200, map[string]any{
			"active":      false,
			"tableId":     tableId,
			"openOrderId": nil,
		})
		return
	}

	session.Active = true

	var openOrderID string
	errOrder := s.Pool.QueryRow(ctx, `
		SELECT id FROM orders WHERE table_id = $1 AND status IN ('PENDING', 'PREPARING', 'READY') ORDER BY created_at DESC LIMIT 1`, tableId).Scan(&openOrderID)
	if errOrder == nil {
		session.OpenOrderId = &openOrderID
	}

	writeJSON(w, 200, session)
}

func generateHexToken(nBytes int) string {
	b := make([]byte, nBytes)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
