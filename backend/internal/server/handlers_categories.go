package server

import (
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type MenuCategory struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Icon        string    `json:"icon"`
	Description string    `json:"description"`
	SortOrder   int       `json:"sort_order"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

func (s *Server) listCategories(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `
		SELECT id, name, icon, description, sort_order, is_active, created_at, updated_at
		FROM menu_categories ORDER BY sort_order, name`)
	if err != nil {
		writeJSON(w, 200, []MenuCategory{})
		return
	}
	defer rows.Close()

	cats := make([]MenuCategory, 0)
	for rows.Next() {
		var c MenuCategory
		if err := rows.Scan(&c.ID, &c.Name, &c.Icon, &c.Description, &c.SortOrder, &c.IsActive, &c.CreatedAt, &c.UpdatedAt); err == nil {
			cats = append(cats, c)
		}
	}
	writeJSON(w, 200, cats)
}

func (s *Server) getCategory(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var c MenuCategory
	err := s.Pool.QueryRow(r.Context(), `
		SELECT id, name, icon, description, sort_order, is_active, created_at, updated_at
		FROM menu_categories WHERE id = $1`, id).Scan(
		&c.ID, &c.Name, &c.Icon, &c.Description, &c.SortOrder, &c.IsActive, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		writeErr(w, 404, "Category not found")
		return
	}
	writeJSON(w, 200, c)
}

func (s *Server) createCategory(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name        string `json:"name"`
		Icon        string `json:"icon"`
		Description string `json:"description"`
		SortOrder   int    `json:"sort_order"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid JSON body")
		return
	}

	if body.Name == "" {
		writeErr(w, 400, "category name is required")
		return
	}
	if body.Icon == "" {
		body.Icon = "🍽️"
	}

	id := fmt.Sprintf("cat-%s", uuid.New().String()[:8])
	var c MenuCategory
	err := s.Pool.QueryRow(r.Context(), `
		INSERT INTO menu_categories (id, name, icon, description, sort_order)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, name, icon, description, sort_order, is_active, created_at, updated_at`,
		id, body.Name, body.Icon, body.Description, body.SortOrder,
	).Scan(&c.ID, &c.Name, &c.Icon, &c.Description, &c.SortOrder, &c.IsActive, &c.CreatedAt, &c.UpdatedAt)

	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}
	writeJSON(w, 201, c)
}

func (s *Server) updateCategory(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body map[string]any
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid JSON body")
		return
	}

	var c MenuCategory
	err := s.Pool.QueryRow(r.Context(), `
		SELECT id, name, icon, description, sort_order, is_active, created_at, updated_at
		FROM menu_categories WHERE id = $1`, id).Scan(
		&c.ID, &c.Name, &c.Icon, &c.Description, &c.SortOrder, &c.IsActive, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		writeErr(w, 404, "Category not found")
		return
	}

	if name, ok := body["name"].(string); ok {
		c.Name = name
	}
	if icon, ok := body["icon"].(string); ok {
		c.Icon = icon
	}
	if desc, ok := body["description"].(string); ok {
		c.Description = desc
	}
	if sort, ok := body["sort_order"].(float64); ok {
		c.SortOrder = int(sort)
	}

	_, _ = s.Pool.Exec(r.Context(), `
		UPDATE menu_categories SET name=$1, icon=$2, description=$3, sort_order=$4, updated_at=now() WHERE id=$5`,
		c.Name, c.Icon, c.Description, c.SortOrder, id)

	writeJSON(w, 200, c)
}

func (s *Server) deleteCategory(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, _ = s.Pool.Exec(r.Context(), `DELETE FROM menu_categories WHERE id = $1`, id)
	w.WriteHeader(204)
}
