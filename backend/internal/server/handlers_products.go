package server

import (
	"net/http"

	"github.com/google/uuid"
	"yadotena/internal/dto"
	"yadotena/internal/models"
)

func (s *Server) publicProducts(w http.ResponseWriter, r *http.Request) {
	cats, err := s.fetchProductCategories(r, true)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	items, err := s.fetchProducts(r, true)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]any{"categories": cats, "items": items})
}

func (s *Server) listProductCategories(w http.ResponseWriter, r *http.Request) {
	activeOnly := r.URL.Query().Get("include_inactive") != "1"
	cats, err := s.fetchProductCategories(r, activeOnly)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, cats)
}

func (s *Server) fetchProductCategories(r *http.Request, activeOnly bool) ([]map[string]any, error) {
	q := `SELECT id, name, sort_order, is_active FROM product_categories`
	if activeOnly {
		q += ` WHERE is_active=true`
	}
	q += ` ORDER BY sort_order, name`
	rows, err := s.Pool.Query(r.Context(), q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []map[string]any{}
	for rows.Next() {
		var c models.ProductCategory
		if err := rows.Scan(&c.ID, &c.Name, &c.SortOrder, &c.IsActive); err != nil {
			return nil, err
		}
		list = append(list, dto.ProductCategoryAPI(c))
	}
	return list, nil
}

func (s *Server) createProductCategory(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	var body struct {
		Name      string `json:"name"`
		SortOrder int    `json:"sortOrder"`
	}
	if err := decodeJSON(r, &body); err != nil || body.Name == "" {
		writeErr(w, 400, "name required")
		return
	}
	var id uuid.UUID
	err := s.Pool.QueryRow(r.Context(), `
		INSERT INTO product_categories (name, sort_order) VALUES ($1,$2) RETURNING id`,
		body.Name, body.SortOrder).Scan(&id)
	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}
	_ = s.Log.Write(r.Context(), &c.StaffID, c.Name, "create_product_category", "product_category", id.String(), nil)
	writeJSON(w, 201, map[string]any{"id": id.String()})
}

func (s *Server) patchProductCategory(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	id, err := uuid.Parse(chiURLParam(r, "id"))
	if err != nil {
		writeErr(w, 400, "bad id")
		return
	}
	var body struct {
		Name      *string `json:"name"`
		SortOrder *int    `json:"sortOrder"`
		IsActive  *bool   `json:"isActive"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	if body.Name != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE product_categories SET name=$1, updated_at=now() WHERE id=$2`, *body.Name, id)
	}
	if body.SortOrder != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE product_categories SET sort_order=$1, updated_at=now() WHERE id=$2`, *body.SortOrder, id)
	}
	if body.IsActive != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE product_categories SET is_active=$1, updated_at=now() WHERE id=$2`, *body.IsActive, id)
	}
	_ = s.Log.Write(r.Context(), &c.StaffID, c.Name, "patch_product_category", "product_category", id.String(), nil)
	writeJSON(w, 200, map[string]string{"ok": "true"})
}

func (s *Server) listProducts(w http.ResponseWriter, r *http.Request) {
	availableOnly := r.URL.Query().Get("include_unavailable") != "1"
	items, err := s.fetchProducts(r, availableOnly)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, items)
}

func (s *Server) fetchProducts(r *http.Request, availableOnly bool) ([]map[string]any, error) {
	q := `
		SELECT p.id, p.category_id, c.name, p.name, p.description, p.price_etb::float8,
		       p.image_url, p.is_available, p.sort_order
		FROM products p
		JOIN product_categories c ON c.id = p.category_id`
	if availableOnly {
		q += ` WHERE p.is_available=true AND c.is_active=true`
	}
	q += ` ORDER BY p.sort_order, p.name`
	rows, err := s.Pool.Query(r.Context(), q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []map[string]any{}
	for rows.Next() {
		var p models.Product
		var catName string
		var img *string
		if err := rows.Scan(
			&p.ID, &p.CategoryID, &catName, &p.Name, &p.Description, &p.PriceETB,
			&img, &p.IsAvailable, &p.SortOrder,
		); err != nil {
			return nil, err
		}
		p.ImageURL = img
		list = append(list, dto.ProductAPI(p, catName))
	}
	return list, nil
}

func (s *Server) createProduct(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	var body struct {
		CategoryID  string  `json:"categoryId"`
		Name        string  `json:"name"`
		Description string  `json:"description"`
		Price       float64 `json:"price"`
		Image       string  `json:"image"`
		SortOrder   int     `json:"sortOrder"`
	}
	if err := decodeJSON(r, &body); err != nil || body.Name == "" || body.CategoryID == "" {
		writeErr(w, 400, "name and categoryId required")
		return
	}
	catID, err := uuid.Parse(body.CategoryID)
	if err != nil {
		writeErr(w, 400, "bad categoryId")
		return
	}
	var img *string
	if body.Image != "" {
		img = &body.Image
	}
	var id uuid.UUID
	err = s.Pool.QueryRow(r.Context(), `
		INSERT INTO products (category_id, name, description, price_etb, image_url, sort_order)
		VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		catID, body.Name, body.Description, body.Price, img, body.SortOrder).Scan(&id)
	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}
	_ = s.Log.Write(r.Context(), &c.StaffID, c.Name, "create_product", "product", id.String(), nil)
	writeJSON(w, 201, map[string]any{"id": id.String()})
}

func (s *Server) patchProduct(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	id, err := uuid.Parse(chiURLParam(r, "id"))
	if err != nil {
		writeErr(w, 400, "bad id")
		return
	}
	var body struct {
		CategoryID  *string  `json:"categoryId"`
		Name        *string  `json:"name"`
		Description *string  `json:"description"`
		Price       *float64 `json:"price"`
		Image       *string  `json:"image"`
		Available   *bool    `json:"available"`
		SortOrder   *int     `json:"sortOrder"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	if body.CategoryID != nil {
		catID, err := uuid.Parse(*body.CategoryID)
		if err != nil {
			writeErr(w, 400, "bad categoryId")
			return
		}
		_, _ = s.Pool.Exec(r.Context(), `UPDATE products SET category_id=$1, updated_at=now() WHERE id=$2`, catID, id)
	}
	if body.Name != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE products SET name=$1, updated_at=now() WHERE id=$2`, *body.Name, id)
	}
	if body.Description != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE products SET description=$1, updated_at=now() WHERE id=$2`, *body.Description, id)
	}
	if body.Price != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE products SET price_etb=$1, updated_at=now() WHERE id=$2`, *body.Price, id)
	}
	if body.Image != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE products SET image_url=$1, updated_at=now() WHERE id=$2`, *body.Image, id)
	}
	if body.Available != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE products SET is_available=$1, updated_at=now() WHERE id=$2`, *body.Available, id)
	}
	if body.SortOrder != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE products SET sort_order=$1, updated_at=now() WHERE id=$2`, *body.SortOrder, id)
	}
	_ = s.Log.Write(r.Context(), &c.StaffID, c.Name, "patch_product", "product", id.String(), nil)
	writeJSON(w, 200, map[string]string{"ok": "true"})
}
