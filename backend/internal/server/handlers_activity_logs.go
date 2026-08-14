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

// LogActivityFromReq inspects the request's JWT claims and database to identify exact staff name, role, and IP address.
func (s *Server) LogActivityFromReq(
	r *http.Request,
	action, entityType, entityID, description string,
	prevState, nextState any,
) {
	claims := claimsFrom(r)
	userID := "staff-user"
	userName := ""
	userRole := "WAITER"

	if claims != nil {
		if claims.UserID != "" {
			userID = claims.UserID
		} else if claims.StaffID != uuid.Nil {
			userID = claims.StaffID.String()
		}
		if claims.Name != "" {
			userName = claims.Name
		}
		if claims.Role != "" {
			userRole = strings.ToUpper(string(claims.Role))
		}
	}

	// If userName is generic or empty, perform a database query to resolve exact staff full name
	if (userName == "" || userName == "Staff Member" || strings.HasSuffix(userName, "Staff") || strings.HasPrefix(userName, "staff")) && userID != "" && userID != "staff-user" {
		var dbName, dbRole string
		err := s.Pool.QueryRow(r.Context(), `SELECT name, role FROM users WHERE id = $1`, userID).Scan(&dbName, &dbRole)
		if err == nil && dbName != "" {
			userName = dbName
			if dbRole != "" {
				userRole = strings.ToUpper(dbRole)
			}
		} else {
			_ = s.Pool.QueryRow(r.Context(), `SELECT name, role FROM staff WHERE id = $1`, userID).Scan(&dbName, &dbRole)
			if dbName != "" {
				userName = dbName
				if dbRole != "" {
					userRole = strings.ToUpper(dbRole)
				}
			}
		}
	}

	if userName == "" {
		userName = fmt.Sprintf("%s Staff", strings.Title(strings.ToLower(userRole)))
	}

	ipAddress := r.RemoteAddr
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		ipAddress = strings.TrimSpace(strings.Split(forwarded, ",")[0])
	}

	s.LogActivity(r.Context(), userID, userName, userRole, action, entityType, entityID, description, prevState, nextState, ipAddress)
}

func (s *Server) listActivityLogs(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	reqRole := ""
	if claims != nil {
		reqRole = strings.ToUpper(string(claims.Role))
	}

	roleFilter := r.URL.Query().Get("role")
	entityTypeFilter := r.URL.Query().Get("entityType")
	actionFilter := r.URL.Query().Get("action")
	searchFilter := r.URL.Query().Get("search")
	startDate := r.URL.Query().Get("startDate")
	endDate := r.URL.Query().Get("endDate")
	limitStr := r.URL.Query().Get("limit")

	limit := 150
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

	// Privacy restriction: MANAGER cannot view logs generated by OWNER
	if reqRole == "MANAGER" {
		q += " AND UPPER(user_role) != 'OWNER' AND user_id NOT IN (SELECT id FROM users WHERE UPPER(role) = 'OWNER')"
	}

	if roleFilter != "" && roleFilter != "ALL" {
		q += fmt.Sprintf(" AND user_role = $%d", n)
		args = append(args, strings.ToUpper(roleFilter))
		n++
	}

	if entityTypeFilter != "" && entityTypeFilter != "ALL" {
		q += fmt.Sprintf(" AND entity_type = $%d", n)
		args = append(args, strings.ToUpper(entityTypeFilter))
		n++
	}

	if actionFilter != "" && actionFilter != "ALL" {
		q += fmt.Sprintf(" AND action = $%d", n)
		args = append(args, actionFilter)
		n++
	}

	if startDate != "" {
		if t, err := time.Parse(time.RFC3339, startDate); err == nil {
			q += fmt.Sprintf(" AND created_at >= $%d", n)
			args = append(args, t)
			n++
		} else if t, err := time.Parse("2006-01-02", startDate); err == nil {
			q += fmt.Sprintf(" AND created_at >= $%d", n)
			args = append(args, t)
			n++
		}
	}

	if endDate != "" {
		if t, err := time.Parse(time.RFC3339, endDate); err == nil {
			q += fmt.Sprintf(" AND created_at <= $%d", n)
			args = append(args, t)
			n++
		} else if t, err := time.Parse("2006-01-02", endDate); err == nil {
			// Add 1 day to include full end day
			q += fmt.Sprintf(" AND created_at <= $%d", n)
			args = append(args, t.Add(24*time.Hour))
			n++
		}
	}

	if searchFilter != "" {
		q += fmt.Sprintf(" AND (user_name ILIKE $%d OR description ILIKE $%d OR entity_id ILIKE $%d OR ip_address ILIKE $%d)", n, n, n, n)
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
	claims := claimsFrom(r)
	reqRole := ""
	if claims != nil {
		reqRole = strings.ToUpper(string(claims.Role))
	}

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

	if reqRole == "MANAGER" && strings.ToUpper(logRec.UserRole) == "OWNER" {
		writeErr(w, 403, "Forbidden: managers cannot access owner audit logs")
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
