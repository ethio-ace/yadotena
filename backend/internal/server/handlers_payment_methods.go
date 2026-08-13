package server

import (
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type PaymentMethod struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Code          string    `json:"code"`
	Type          string    `json:"type"`
	AccountNumber string    `json:"accountNumber"`
	AccountName   string    `json:"accountName"`
	Instructions  string    `json:"instructions"`
	QRCodeURL     string    `json:"qrCodeUrl,omitempty"`
	IsActive      bool      `json:"isActive"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

func (s *Server) listPaymentMethods(w http.ResponseWriter, r *http.Request) {
	showAll := r.URL.Query().Get("all") == "true"
	query := `
		SELECT id, name, code, type, account_number, account_name, instructions, COALESCE(qr_code_url, ''), is_active, created_at, updated_at
		FROM payment_methods`
	if !showAll {
		query += ` WHERE is_active = true`
	}
	query += ` ORDER BY type DESC, name ASC`

	rows, err := s.Pool.Query(r.Context(), query)
	if err != nil {
		writeJSON(w, 200, []PaymentMethod{})
		return
	}
	defer rows.Close()

	methods := make([]PaymentMethod, 0)
	for rows.Next() {
		var pm PaymentMethod
		if err := rows.Scan(
			&pm.ID, &pm.Name, &pm.Code, &pm.Type, &pm.AccountNumber, &pm.AccountName,
			&pm.Instructions, &pm.QRCodeURL, &pm.IsActive, &pm.CreatedAt, &pm.UpdatedAt,
		); err == nil {
			methods = append(methods, pm)
		}
	}

	writeJSON(w, 200, methods)
}

func (s *Server) getPaymentMethod(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var pm PaymentMethod
	err := s.Pool.QueryRow(r.Context(), `
		SELECT id, name, code, type, account_number, account_name, instructions, COALESCE(qr_code_url, ''), is_active, created_at, updated_at
		FROM payment_methods WHERE id = $1 OR code = $1`, id).Scan(
		&pm.ID, &pm.Name, &pm.Code, &pm.Type, &pm.AccountNumber, &pm.AccountName,
		&pm.Instructions, &pm.QRCodeURL, &pm.IsActive, &pm.CreatedAt, &pm.UpdatedAt,
	)
	if err != nil {
		writeErr(w, 404, "Payment method not found")
		return
	}
	writeJSON(w, 200, pm)
}

func (s *Server) createPaymentMethod(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name          string `json:"name"`
		Code          string `json:"code"`
		Type          string `json:"type"`
		AccountNumber string `json:"accountNumber"`
		AccountName   string `json:"accountName"`
		Instructions  string `json:"instructions"`
		QRCodeURL     string `json:"qrCodeUrl"`
		IsActive      *bool  `json:"isActive"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid JSON body")
		return
	}

	if body.Name == "" || body.Code == "" {
		writeErr(w, 400, "name and code are required")
		return
	}
	if body.Type == "" {
		body.Type = "DIGITAL"
	}
	isActive := true
	if body.IsActive != nil {
		isActive = *body.IsActive
	}

	id := "pm-" + uuid.New().String()[:8]
	now := time.Now()

	var pm PaymentMethod
	err := s.Pool.QueryRow(r.Context(), `
		INSERT INTO payment_methods (id, name, code, type, account_number, account_name, instructions, qr_code_url, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, name, code, type, account_number, account_name, instructions, COALESCE(qr_code_url, ''), is_active, created_at, updated_at`,
		id, body.Name, body.Code, body.Type, body.AccountNumber, body.AccountName, body.Instructions, body.QRCodeURL, isActive, now, now,
	).Scan(
		&pm.ID, &pm.Name, &pm.Code, &pm.Type, &pm.AccountNumber, &pm.AccountName,
		&pm.Instructions, &pm.QRCodeURL, &pm.IsActive, &pm.CreatedAt, &pm.UpdatedAt,
	)

	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}

	s.LogActivity(r.Context(), "owner-admin", "Owner Manager", "OWNER", "CREATE_PAYMENT_METHOD", "PAYMENT_METHOD", pm.ID, fmt.Sprintf("Created payment method %s (%s)", pm.Name, pm.Code), nil, pm, r.RemoteAddr)

	writeJSON(w, 201, pm)
}

func (s *Server) updatePaymentMethod(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body map[string]any
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid JSON body")
		return
	}

	var pm PaymentMethod
	err := s.Pool.QueryRow(r.Context(), `
		SELECT id, name, code, type, account_number, account_name, instructions, COALESCE(qr_code_url, ''), is_active, created_at, updated_at
		FROM payment_methods WHERE id = $1`, id).Scan(
		&pm.ID, &pm.Name, &pm.Code, &pm.Type, &pm.AccountNumber, &pm.AccountName,
		&pm.Instructions, &pm.QRCodeURL, &pm.IsActive, &pm.CreatedAt, &pm.UpdatedAt,
	)
	if err != nil {
		writeErr(w, 404, "Payment method not found")
		return
	}

	prevState := pm

	if val, ok := body["name"].(string); ok && val != "" {
		pm.Name = val
	}
	if val, ok := body["code"].(string); ok && val != "" {
		pm.Code = val
	}
	if val, ok := body["type"].(string); ok && val != "" {
		pm.Type = val
	}
	if val, ok := body["accountNumber"].(string); ok {
		pm.AccountNumber = val
	}
	if val, ok := body["accountName"].(string); ok {
		pm.AccountName = val
	}
	if val, ok := body["instructions"].(string); ok {
		pm.Instructions = val
	}
	if val, ok := body["qrCodeUrl"].(string); ok {
		pm.QRCodeURL = val
	}
	if val, ok := body["isActive"].(bool); ok {
		pm.IsActive = val
	}

	pm.UpdatedAt = time.Now()

	_, err = s.Pool.Exec(r.Context(), `
		UPDATE payment_methods
		SET name = $1, code = $2, type = $3, account_number = $4, account_name = $5, instructions = $6, qr_code_url = $7, is_active = $8, updated_at = $9
		WHERE id = $10`,
		pm.Name, pm.Code, pm.Type, pm.AccountNumber, pm.AccountName, pm.Instructions, pm.QRCodeURL, pm.IsActive, pm.UpdatedAt, pm.ID,
	)

	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}

	s.LogActivity(r.Context(), "owner-admin", "Owner Manager", "OWNER", "UPDATE_PAYMENT_METHOD", "PAYMENT_METHOD", pm.ID, fmt.Sprintf("Updated payment method %s (%s)", pm.Name, pm.Code), prevState, pm, r.RemoteAddr)

	writeJSON(w, 200, pm)
}

func (s *Server) deletePaymentMethod(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := s.Pool.Exec(r.Context(), `DELETE FROM payment_methods WHERE id = $1`, id)
	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}

	s.LogActivity(r.Context(), "owner-admin", "Owner Manager", "OWNER", "DELETE_PAYMENT_METHOD", "PAYMENT_METHOD", id, fmt.Sprintf("Deleted payment method #%s", id), nil, nil, r.RemoteAddr)

	writeJSON(w, 200, map[string]bool{"ok": true})
}
