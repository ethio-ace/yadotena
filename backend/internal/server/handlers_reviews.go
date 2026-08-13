package server

import (
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type Review struct {
	ID           string    `json:"id"`
	OrderID      *string   `json:"orderId,omitempty"`
	CustomerName string    `json:"customerName"`
	Rating       int       `json:"rating"`
	Comment      string    `json:"comment"`
	CreatedAt    time.Time `json:"createdAt"`
}

func (s *Server) listReviews(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `
		SELECT id, order_id, customer_name, rating, comment, created_at
		FROM reviews ORDER BY created_at DESC`)
	if err != nil {
		writeJSON(w, 200, []Review{})
		return
	}
	defer rows.Close()

	revs := make([]Review, 0)
	for rows.Next() {
		var rev Review
		if err := rows.Scan(&rev.ID, &rev.OrderID, &rev.CustomerName, &rev.Rating, &rev.Comment, &rev.CreatedAt); err == nil {
			revs = append(revs, rev)
		}
	}
	writeJSON(w, 200, revs)
}

func (s *Server) getReview(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var rev Review
	err := s.Pool.QueryRow(r.Context(), `
		SELECT id, order_id, customer_name, rating, comment, created_at
		FROM reviews WHERE id = $1`, id).Scan(
		&rev.ID, &rev.OrderID, &rev.CustomerName, &rev.Rating, &rev.Comment, &rev.CreatedAt,
	)
	if err != nil {
		writeErr(w, 404, "Review not found")
		return
	}
	writeJSON(w, 200, rev)
}

func (s *Server) createReview(w http.ResponseWriter, r *http.Request) {
	var body struct {
		OrderID      *string `json:"orderId"`
		CustomerName string  `json:"customerName"`
		Rating       int     `json:"rating"`
		Comment      string  `json:"comment"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid JSON body")
		return
	}

	if body.Rating < 1 || body.Rating > 5 {
		body.Rating = 5
	}
	if body.CustomerName == "" {
		body.CustomerName = "Guest"
	}

	id := fmt.Sprintf("rev-%s", uuid.New().String()[:8])
	var rev Review

	err := s.Pool.QueryRow(r.Context(), `
		INSERT INTO reviews (id, order_id, customer_name, rating, comment)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, order_id, customer_name, rating, comment, created_at`,
		id, body.OrderID, body.CustomerName, body.Rating, body.Comment,
	).Scan(&rev.ID, &rev.OrderID, &rev.CustomerName, &rev.Rating, &rev.Comment, &rev.CreatedAt)

	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}
	writeJSON(w, 201, rev)
}
