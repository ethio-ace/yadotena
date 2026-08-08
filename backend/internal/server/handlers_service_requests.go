package server

import (
	"net/http"
	"time"

	"github.com/google/uuid"
	"yadotena/internal/cache"
	"yadotena/internal/dto"
	"yadotena/internal/models"
)

func (s *Server) publicCreateServiceRequest(w http.ResponseWriter, r *http.Request) {
	ip := r.RemoteAddr
	if !cache.AllowRate(r.Context(), s.Redis, "rl:svc:"+ip, 20, time.Minute) {
		writeErr(w, 429, "rate limit exceeded")
		return
	}
	var body struct {
		TableID string `json:"tableId"`
		Type    string `json:"type"`
		Notes   string `json:"notes"`
	}
	if err := decodeJSON(r, &body); err != nil || body.TableID == "" {
		writeErr(w, 400, "tableId and type required")
		return
	}
	switch body.Type {
	case "WAITER", "BILL", "ASSISTANCE":
	default:
		writeErr(w, 400, "type must be WAITER, BILL, or ASSISTANCE")
		return
	}
	tableID, err := uuid.Parse(body.TableID)
	if err != nil {
		writeErr(w, 400, "bad tableId")
		return
	}
	var label string
	err = s.Pool.QueryRow(r.Context(), `
		SELECT label FROM cafe_tables WHERE id=$1 AND is_active=true`, tableID).Scan(&label)
	if err != nil {
		writeErr(w, 404, "table not found")
		return
	}
	notes := body.Notes
	if notes == "" {
		switch body.Type {
		case "BILL":
			notes = "Requested table check / bill"
		case "WAITER":
			notes = "Called for table waiter"
		default:
			notes = "Assistance requested"
		}
	}
	var req models.ServiceRequest
	err = s.Pool.QueryRow(r.Context(), `
		INSERT INTO service_requests (table_id, type, status, notes)
		VALUES ($1,$2,'PENDING',$3)
		RETURNING id, table_id, type, status, notes, created_at`,
		tableID, body.Type, notes).Scan(
		&req.ID, &req.TableID, &req.Type, &req.Status, &req.Notes, &req.CreatedAt)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	req.TableName = label
	s.Hub.BroadcastStaff("service_request.created", dto.ServiceRequestAPI(req))
	writeJSON(w, 201, dto.ServiceRequestAPI(req))
}

func (s *Server) listServiceRequests(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	q := `
		SELECT sr.id, sr.table_id, COALESCE(t.label,''), sr.type, sr.status, sr.notes, sr.created_at
		FROM service_requests sr
		LEFT JOIN cafe_tables t ON t.id = sr.table_id`
	args := []any{}
	if status != "" {
		q += ` WHERE sr.status=$1`
		args = append(args, status)
	}
	q += ` ORDER BY sr.created_at DESC LIMIT 200`
	rows, err := s.Pool.Query(r.Context(), q, args...)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	defer rows.Close()
	list := []map[string]any{}
	for rows.Next() {
		var req models.ServiceRequest
		if err := rows.Scan(&req.ID, &req.TableID, &req.TableName, &req.Type, &req.Status, &req.Notes, &req.CreatedAt); err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		list = append(list, dto.ServiceRequestAPI(req))
	}
	writeJSON(w, 200, list)
}

func (s *Server) resolveServiceRequest(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	id, err := uuid.Parse(chiURLParam(r, "id"))
	if err != nil {
		writeErr(w, 400, "bad id")
		return
	}
	tag, err := s.Pool.Exec(r.Context(), `
		UPDATE service_requests
		SET status='RESOLVED', resolved_at=now(), resolved_by=$1
		WHERE id=$2 AND status='PENDING'`, c.StaffID, id)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	if tag.RowsAffected() == 0 {
		writeErr(w, 404, "not found or already resolved")
		return
	}
	var req models.ServiceRequest
	err = s.Pool.QueryRow(r.Context(), `
		SELECT sr.id, sr.table_id, COALESCE(t.label,''), sr.type, sr.status, sr.notes, sr.created_at
		FROM service_requests sr
		LEFT JOIN cafe_tables t ON t.id = sr.table_id
		WHERE sr.id=$1`, id).Scan(
		&req.ID, &req.TableID, &req.TableName, &req.Type, &req.Status, &req.Notes, &req.CreatedAt)
	if err != nil {
		writeJSON(w, 200, map[string]string{"ok": "true"})
		return
	}
	_ = s.Log.Write(r.Context(), &c.StaffID, c.Name, "resolve_service_request", "service_request", id.String(), nil)
	s.Hub.BroadcastStaff("service_request.resolved", dto.ServiceRequestAPI(req))
	writeJSON(w, 200, dto.ServiceRequestAPI(req))
}
