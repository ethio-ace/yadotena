package server

import (
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type Customer struct {
	ID            string     `json:"id"`
	Name          string     `json:"name"`
	Phone         string     `json:"phone"`
	Email         *string    `json:"email,omitempty"`
	TotalOrders   int        `json:"totalOrders"`
	TotalSpent    float64    `json:"totalSpent"`
	LastOrderDate *time.Time `json:"lastOrderDate,omitempty"`
	CreatedAt     time.Time  `json:"createdAt"`
}

func (s *Server) listCustomers(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `
		SELECT id, name, phone, email, total_orders, total_spent::float8, last_order_date, created_at
		FROM customers ORDER BY total_spent DESC, created_at DESC`)
	if err != nil {
		writeJSON(w, 200, []Customer{})
		return
	}
	defer rows.Close()

	custs := make([]Customer, 0)
	for rows.Next() {
		var c Customer
		if err := rows.Scan(&c.ID, &c.Name, &c.Phone, &c.Email, &c.TotalOrders, &c.TotalSpent, &c.LastOrderDate, &c.CreatedAt); err == nil {
			custs = append(custs, c)
		}
	}
	writeJSON(w, 200, custs)
}

func (s *Server) getCustomer(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var c Customer
	err := s.Pool.QueryRow(r.Context(), `
		SELECT id, name, phone, email, total_orders, total_spent::float8, last_order_date, created_at
		FROM customers WHERE id = $1`, id).Scan(
		&c.ID, &c.Name, &c.Phone, &c.Email, &c.TotalOrders, &c.TotalSpent, &c.LastOrderDate, &c.CreatedAt,
	)
	if err != nil {
		writeErr(w, 404, "Customer not found")
		return
	}
	writeJSON(w, 200, c)
}

func (s *Server) createCustomer(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name  string  `json:"name"`
		Phone string  `json:"phone"`
		Email *string `json:"email"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid JSON body")
		return
	}

	if body.Name == "" || body.Phone == "" {
		writeErr(w, 400, "name and phone are required")
		return
	}

	id := fmt.Sprintf("c-%s", uuid.New().String()[:8])
	var c Customer

	err := s.Pool.QueryRow(r.Context(), `
		INSERT INTO customers (id, name, phone, email)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email
		RETURNING id, name, phone, email, total_orders, total_spent::float8, last_order_date, created_at`,
		id, body.Name, body.Phone, body.Email,
	).Scan(&c.ID, &c.Name, &c.Phone, &c.Email, &c.TotalOrders, &c.TotalSpent, &c.LastOrderDate, &c.CreatedAt)

	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}
	writeJSON(w, 201, c)
}

func (s *Server) updateCustomer(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body map[string]any
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid JSON body")
		return
	}

	var c Customer
	err := s.Pool.QueryRow(r.Context(), `
		SELECT id, name, phone, email, total_orders, total_spent::float8, last_order_date, created_at
		FROM customers WHERE id = $1`, id).Scan(
		&c.ID, &c.Name, &c.Phone, &c.Email, &c.TotalOrders, &c.TotalSpent, &c.LastOrderDate, &c.CreatedAt,
	)
	if err != nil {
		writeErr(w, 404, "Customer not found")
		return
	}

	if name, ok := body["name"].(string); ok {
		c.Name = name
	}
	if phone, ok := body["phone"].(string); ok {
		c.Phone = phone
	}

	_, _ = s.Pool.Exec(r.Context(), `UPDATE customers SET name=$1, phone=$2 WHERE id=$3`, c.Name, c.Phone, id)
	writeJSON(w, 200, c)
}
