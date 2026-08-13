package server

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type PaymentRecord struct {
	ID             string    `json:"id"`
	OrderID        string    `json:"orderId"`
	Method         string    `json:"method"`
	Amount         float64   `json:"amount"`
	Status         string    `json:"status"`
	TransactionRef *string   `json:"transactionRef,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
}

func (s *Server) listPayments(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `
		SELECT id, order_id, method, amount::float8, status, transaction_ref, created_at
		FROM payments ORDER BY created_at DESC`)
	if err != nil {
		writeJSON(w, 200, []PaymentRecord{})
		return
	}
	defer rows.Close()

	pmts := make([]PaymentRecord, 0)
	for rows.Next() {
		var p PaymentRecord
		if err := rows.Scan(&p.ID, &p.OrderID, &p.Method, &p.Amount, &p.Status, &p.TransactionRef, &p.CreatedAt); err == nil {
			pmts = append(pmts, p)
		}
	}
	writeJSON(w, 200, pmts)
}

func (s *Server) getPayment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var p PaymentRecord
	err := s.Pool.QueryRow(r.Context(), `
		SELECT id, order_id, method, amount::float8, status, transaction_ref, created_at
		FROM payments WHERE id = $1`, id).Scan(
		&p.ID, &p.OrderID, &p.Method, &p.Amount, &p.Status, &p.TransactionRef, &p.CreatedAt,
	)
	if err != nil {
		writeErr(w, 404, "Payment record not found")
		return
	}
	writeJSON(w, 200, p)
}

func (s *Server) createPayment(w http.ResponseWriter, r *http.Request) {
	var body struct {
		OrderID        string  `json:"orderId"`
		Method         string  `json:"method"`
		Amount         float64 `json:"amount"`
		Status         string  `json:"status"`
		TransactionRef *string `json:"transactionRef"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid JSON body")
		return
	}

	if body.OrderID == "" || body.Amount <= 0 {
		writeErr(w, 400, "orderId and valid amount are required")
		return
	}
	if body.Method == "" {
		body.Method = "TELEBIRR"
	}
	if body.Status == "" {
		body.Status = "PAID"
	}

	id := uuid.New().String()
	var p PaymentRecord

	err := s.Pool.QueryRow(r.Context(), `
		INSERT INTO payments (id, order_id, method, amount, status, transaction_ref)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, order_id, method, amount::float8, status, transaction_ref, created_at`,
		id, body.OrderID, body.Method, body.Amount, body.Status, body.TransactionRef,
	).Scan(&p.ID, &p.OrderID, &p.Method, &p.Amount, &p.Status, &p.TransactionRef, &p.CreatedAt)

	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}

	// Update order payment status
	_, _ = s.Pool.Exec(r.Context(), `UPDATE orders SET payment_status = $1, updated_at = now() WHERE id = $2`, p.Status, p.OrderID)

	s.Ably.Publish(r.Context(), "yadotena-realtime", "order.updated", map[string]any{"id": p.OrderID, "paymentStatus": p.Status})
	s.NATS.Publish("yadotena.payments.created", p)

	writeJSON(w, 201, p)
}
