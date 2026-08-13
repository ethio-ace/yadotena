package server

import (
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type Expense struct {
	ID            string    `json:"id"`
	Amount        float64   `json:"amount"`
	Category      string    `json:"category"`
	Description   string    `json:"description"`
	Date          string    `json:"date"`
	RecordedById  *string   `json:"recordedById,omitempty"`
	PaymentMethod string    `json:"paymentMethod"`
	ReceiptURL    *string   `json:"receiptUrl,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
}

func (s *Server) listExpenses(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `
		SELECT id, amount::float8, category, description, date::text, COALESCE(recorded_by_id::text, ''), payment_method, receipt_url, created_at
		FROM expenses ORDER BY date DESC, created_at DESC`)
	if err != nil {
		writeJSON(w, 200, []Expense{})
		return
	}
	defer rows.Close()

	expenses := make([]Expense, 0)
	for rows.Next() {
		var ex Expense
		var recBy string
		if err := rows.Scan(&ex.ID, &ex.Amount, &ex.Category, &ex.Description, &ex.Date, &recBy, &ex.PaymentMethod, &ex.ReceiptURL, &ex.CreatedAt); err == nil {
			if recBy != "" {
				ex.RecordedById = &recBy
			}
			expenses = append(expenses, ex)
		}
	}
	writeJSON(w, 200, expenses)
}

func (s *Server) getExpense(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var ex Expense
	var recBy string
	err := s.Pool.QueryRow(r.Context(), `
		SELECT id, amount::float8, category, description, date::text, COALESCE(recorded_by_id::text, ''), payment_method, receipt_url, created_at
		FROM expenses WHERE id = $1`, id).Scan(
		&ex.ID, &ex.Amount, &ex.Category, &ex.Description, &ex.Date, &recBy, &ex.PaymentMethod, &ex.ReceiptURL, &ex.CreatedAt,
	)
	if err != nil {
		writeErr(w, 404, "Expense not found")
		return
	}
	if recBy != "" {
		ex.RecordedById = &recBy
	}
	writeJSON(w, 200, ex)
}

func (s *Server) createExpense(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Amount        float64 `json:"amount"`
		Category      string  `json:"category"`
		Description   string  `json:"description"`
		Date          string  `json:"date"`
		PaymentMethod string  `json:"paymentMethod"`
		ReceiptURL    *string `json:"receiptUrl"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid JSON body")
		return
	}

	if body.Amount <= 0 {
		writeErr(w, 400, "valid amount is required")
		return
	}
	if body.Category == "" {
		body.Category = "General"
	}
	if body.PaymentMethod == "" {
		body.PaymentMethod = "Cash"
	}
	if body.Date == "" {
		body.Date = time.Now().Format("2006-01-02")
	}

	id := fmt.Sprintf("exp-%s", uuid.New().String()[:8])
	var ex Expense
	var recBy string

	err := s.Pool.QueryRow(r.Context(), `
		INSERT INTO expenses (id, amount, category, description, date, payment_method, receipt_url)
		VALUES ($1, $2, $3, $4, $5::date, $6, $7)
		RETURNING id, amount::float8, category, description, date::text, COALESCE(recorded_by_id::text, ''), payment_method, receipt_url, created_at`,
		id, body.Amount, body.Category, body.Description, body.Date, body.PaymentMethod, body.ReceiptURL,
	).Scan(&ex.ID, &ex.Amount, &ex.Category, &ex.Description, &ex.Date, &recBy, &ex.PaymentMethod, &ex.ReceiptURL, &ex.CreatedAt)

	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}

	if recBy != "" {
		ex.RecordedById = &recBy
	}
	writeJSON(w, 201, ex)
}

func (s *Server) updateExpense(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body map[string]any
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid JSON body")
		return
	}

	var ex Expense
	var recBy string
	err := s.Pool.QueryRow(r.Context(), `
		SELECT id, amount::float8, category, description, date::text, COALESCE(recorded_by_id::text, ''), payment_method, receipt_url, created_at
		FROM expenses WHERE id = $1`, id).Scan(
		&ex.ID, &ex.Amount, &ex.Category, &ex.Description, &ex.Date, &recBy, &ex.PaymentMethod, &ex.ReceiptURL, &ex.CreatedAt,
	)
	if err != nil {
		writeErr(w, 404, "Expense not found")
		return
	}

	if amt, ok := body["amount"].(float64); ok {
		ex.Amount = amt
	}
	if cat, ok := body["category"].(string); ok {
		ex.Category = cat
	}
	if desc, ok := body["description"].(string); ok {
		ex.Description = desc
	}
	if dt, ok := body["date"].(string); ok {
		ex.Date = dt
	}
	if pm, ok := body["paymentMethod"].(string); ok {
		ex.PaymentMethod = pm
	}

	_, _ = s.Pool.Exec(r.Context(), `
		UPDATE expenses SET amount=$1, category=$2, description=$3, date=$4::date, payment_method=$5 WHERE id=$6`,
		ex.Amount, ex.Category, ex.Description, ex.Date, ex.PaymentMethod, id)

	if recBy != "" {
		ex.RecordedById = &recBy
	}
	writeJSON(w, 200, ex)
}

func (s *Server) deleteExpense(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, _ = s.Pool.Exec(r.Context(), `DELETE FROM expenses WHERE id = $1`, id)
	w.WriteHeader(204)
}
