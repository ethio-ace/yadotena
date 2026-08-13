package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type ActivityLog struct {
	ID          string          `json:"id"`
	UserID      string          `json:"userId"`
	UserName    string          `json:"userName"`
	UserRole    string          `json:"userRole"`
	Action      string          `json:"action"`
	EntityType  string          `json:"entityType"`
	EntityID    string          `json:"entityId"`
	Description string          `json:"description"`
	PrevState   json.RawMessage `json:"prevState,omitempty"`
	NextState   json.RawMessage `json:"nextState,omitempty"`
	IPAddress   string          `json:"ipAddress,omitempty"`
	CreatedAt   time.Time       `json:"createdAt"`
}

// LogActivity is the central audit logger helper used across all handlers
func (s *Server) LogActivity(
	ctx context.Context,
	userID, userName, userRole, action, entityType, entityID, description string,
	prevState, nextState any,
	ipAddress string,
) {
	if s.Pool == nil {
		return
	}

	if userID == "" {
		userID = "staff-user"
	}
	if userName == "" {
		userName = "Staff Member"
	}
	if userRole == "" {
		userRole = "WAITER"
	}

	var prevJSON []byte
	if prevState != nil {
		prevJSON, _ = json.Marshal(prevState)
	}

	var nextJSON []byte
	if nextState != nil {
		nextJSON, _ = json.Marshal(nextState)
	}

	logID := "log-" + uuid.New().String()[:12]
	now := time.Now()

	q := `
		INSERT INTO activity_logs (id, user_id, user_name, user_role, action, entity_type, entity_id, description, prev_state, next_state, ip_address, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`

	_, err := s.Pool.Exec(
		ctx, q,
		logID, userID, userName, strings.ToUpper(userRole), action, strings.ToUpper(entityType), entityID, description,
		prevJSON, nextJSON, ipAddress, now,
	)

	if err != nil {
		log.Printf("[LogActivity Error] Failed to record log: %v", err)
		return
	}

	// Publish real-time activity log notification to Ably
	go func() {
		logRecord := ActivityLog{
			ID:          logID,
			UserID:      userID,
			UserName:    userName,
			UserRole:    strings.ToUpper(userRole),
			Action:      action,
			EntityType:  strings.ToUpper(entityType),
			EntityID:    entityID,
			Description: description,
			PrevState:   prevJSON,
			NextState:   nextJSON,
			IPAddress:   ipAddress,
			CreatedAt:   now,
		}
		s.Ably.Publish(context.Background(), "yadotena-realtime", "activity.created", logRecord)
	}()
}

func (s *Server) listActivityLogs(w http.ResponseWriter, r *http.Request) {
	roleFilter := r.URL.Query().Get("role")
	entityTypeFilter := r.URL.Query().Get("entityType")
	actionFilter := r.URL.Query().Get("action")
	searchFilter := r.URL.Query().Get("search")
	limitStr := r.URL.Query().Get("limit")

	limit := 100
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
		limit = l
	}

	q := `
		SELECT id, user_id, user_name, user_role, action, entity_type, entity_id, description,
		       COALESCE(prev_state, 'null'::jsonb), COALESCE(next_state, 'null'::jsonb), COALESCE(ip_address, ''), created_at
		FROM activity_logs
		WHERE 1=1`

	args := []any{}
	n := 1

	if roleFilter != "" {
		q += fmt.Sprintf(" AND user_role = $%d", n)
		args = append(args, strings.ToUpper(roleFilter))
		n++
	}

	if entityTypeFilter != "" {
		q += fmt.Sprintf(" AND entity_type = $%d", n)
		args = append(args, strings.ToUpper(entityTypeFilter))
		n++
	}

	if actionFilter != "" {
		q += fmt.Sprintf(" AND action = $%d", n)
		args = append(args, actionFilter)
		n++
	}

	if searchFilter != "" {
		q += fmt.Sprintf(" AND (user_name ILIKE $%d OR description ILIKE $%d OR entity_id ILIKE $%d)", n, n, n)
		args = append(args, "%"+searchFilter+"%")
		n++
	}

	q += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d", n)
	args = append(args, limit)

	rows, err := s.Pool.Query(r.Context(), q, args...)
	if err != nil {
		writeJSON(w, 200, []ActivityLog{})
		return
	}
	defer rows.Close()

	logsList := make([]ActivityLog, 0)
	for rows.Next() {
		var logRec ActivityLog
		var prevRaw []byte
		var nextRaw []byte
		if errScan := rows.Scan(
			&logRec.ID, &logRec.UserID, &logRec.UserName, &logRec.UserRole, &logRec.Action,
			&logRec.EntityType, &logRec.EntityID, &logRec.Description, &prevRaw, &nextRaw,
			&logRec.IPAddress, &logRec.CreatedAt,
		); errScan == nil {
			if len(prevRaw) > 0 && string(prevRaw) != "null" {
				logRec.PrevState = prevRaw
			}
			if len(nextRaw) > 0 && string(nextRaw) != "null" {
				logRec.NextState = nextRaw
			}
			logsList = append(logsList, logRec)
		}
	}

	writeJSON(w, 200, logsList)
}

func (s *Server) getActivityLog(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var logRec ActivityLog
	var prevRaw []byte
	var nextRaw []byte

	err := s.Pool.QueryRow(r.Context(), `
		SELECT id, user_id, user_name, user_role, action, entity_type, entity_id, description,
		       COALESCE(prev_state, 'null'::jsonb), COALESCE(next_state, 'null'::jsonb), COALESCE(ip_address, ''), created_at
		FROM activity_logs WHERE id = $1`, id).Scan(
		&logRec.ID, &logRec.UserID, &logRec.UserName, &logRec.UserRole, &logRec.Action,
		&logRec.EntityType, &logRec.EntityID, &logRec.Description, &prevRaw, &nextRaw,
		&logRec.IPAddress, &logRec.CreatedAt,
	)

	if err != nil {
		writeErr(w, 404, "Activity log entry not found")
		return
	}

	if len(prevRaw) > 0 && string(prevRaw) != "null" {
		logRec.PrevState = prevRaw
	}
	if len(nextRaw) > 0 && string(nextRaw) != "null" {
		logRec.NextState = nextRaw
	}

	writeJSON(w, 200, logRec)
}
