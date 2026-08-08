package server

import (
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"yadotena/internal/cache"
	"yadotena/internal/dto"
	"yadotena/internal/models"
)

func (s *Server) publicCreateReview(w http.ResponseWriter, r *http.Request) {
	ip := r.RemoteAddr
	if !cache.AllowRate(r.Context(), s.Redis, "rl:review:"+ip, 15, time.Minute) {
		writeErr(w, 429, "rate limit exceeded")
		return
	}
	var body struct {
		OrderID      string `json:"orderId"`
		Rating       int    `json:"rating"`
		Comment      string `json:"comment"`
		CustomerName string `json:"customerName"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	if body.Rating < 1 || body.Rating > 5 {
		writeErr(w, 400, "rating must be 1-5")
		return
	}
	name := strings.TrimSpace(body.CustomerName)
	var orderID *uuid.UUID
	if body.OrderID != "" {
		parsed, err := uuid.Parse(body.OrderID)
		if err != nil {
			writeErr(w, 400, "bad orderId")
			return
		}
		orderID = &parsed
		var orderName, phone string
		err = s.Pool.QueryRow(r.Context(), `
			SELECT customer_name, customer_phone FROM orders WHERE id=$1`, parsed).Scan(&orderName, &phone)
		if err != nil {
			writeErr(w, 404, "order not found")
			return
		}
		if name == "" {
			name = orderName
		}
	}
	if name == "" {
		name = "Guest"
	}
	var rev models.Review
	err := s.Pool.QueryRow(r.Context(), `
		INSERT INTO reviews (order_id, customer_name, rating, comment)
		VALUES ($1,$2,$3,$4)
		RETURNING id, order_id, customer_name, rating, comment, created_at`,
		orderID, name, body.Rating, strings.TrimSpace(body.Comment)).Scan(
		&rev.ID, &rev.OrderID, &rev.CustomerName, &rev.Rating, &rev.Comment, &rev.CreatedAt)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 201, dto.ReviewAPI(rev))
}

func (s *Server) listReviews(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `
		SELECT id, order_id, customer_name, rating, comment, created_at
		FROM reviews
		ORDER BY created_at DESC
		LIMIT 200`)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	defer rows.Close()
	list := []map[string]any{}
	for rows.Next() {
		var rev models.Review
		if err := rows.Scan(&rev.ID, &rev.OrderID, &rev.CustomerName, &rev.Rating, &rev.Comment, &rev.CreatedAt); err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		list = append(list, dto.ReviewAPI(rev))
	}
	writeJSON(w, 200, list)
}
