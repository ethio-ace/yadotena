package server

import (
	"net/http"
	"time"

	"yadotena/internal/customers"
)

type customerResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Phone       string    `json:"phone"`
	TotalOrders int       `json:"totalOrders"`
	TotalSpent  float64   `json:"totalSpent"`
	LastOrder   time.Time `json:"lastOrder"`
	Type        string    `json:"type"`
}

func (s *Server) listCustomers(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `
		SELECT customer_phone,
		       (ARRAY_AGG(customer_name ORDER BY created_at DESC))[1] AS name,
		       COUNT(*)::int AS total_orders,
		       COALESCE(SUM(total_etb) FILTER (WHERE payment_status='paid'), 0)::float8 AS total_spent,
		       MAX(created_at) AS last_order
		FROM orders
		GROUP BY customer_phone
		ORDER BY last_order DESC`)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	list := make([]customerResponse, 0)
	for rows.Next() {
		var customer customerResponse
		if err := rows.Scan(
			&customer.Phone,
			&customer.Name,
			&customer.TotalOrders,
			&customer.TotalSpent,
			&customer.LastOrder,
		); err != nil {
			writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		customer.ID = customer.Phone
		customer.Type = customers.Classify(customer.TotalOrders, customer.TotalSpent)
		list = append(list, customer)
	}
	if err := rows.Err(); err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, list)
}
