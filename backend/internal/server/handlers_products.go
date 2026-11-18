package server

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// ---- Structs ----

type Product struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	Price         float64   `json:"price"`
	Unit          string    `json:"unit"`
	StockQuantity float64   `json:"stockQuantity"`
	IsActive      bool      `json:"isActive"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type ProductSale struct {
	ID          string    `json:"id"`
	ProductID   string    `json:"productId"`
	ProductName string    `json:"productName"`
	Quantity    float64   `json:"quantity"`
	TotalPrice  float64   `json:"totalPrice"`
	SoldByID    *string   `json:"soldById,omitempty"`
	SoldByName  string    `json:"soldByName"`
	SaleDate    time.Time `json:"saleDate"`
}

type ProductPurchase struct {
	ID              string    `json:"id"`
	ProductID       string    `json:"productId"`
	ProductName     string    `json:"productName"`
	Quantity        float64   `json:"quantity"`
	TotalCost       float64   `json:"totalCost"`
	PurchasedByID   *string   `json:"purchasedById,omitempty"`
	PurchasedByName string    `json:"purchasedByName"`
	PurchaseDate    time.Time `json:"purchaseDate"`
}

// ---- Helper ----

func scanProduct(row interface {
	Scan(...any) error
}) (Product, error) {
	var p Product
	err := row.Scan(
		&p.ID, &p.Name, &p.Description,
		&p.Price, &p.Unit, &p.StockQuantity,
		&p.IsActive, &p.CreatedAt, &p.UpdatedAt,
	)
	return p, err
}

// ---- Product Handlers ----

func (s *Server) listProducts(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	query := `SELECT id, name, description, price::float8, unit, stock_quantity::float8, is_active, created_at, updated_at FROM products`
	args := []any{}

	if r.URL.Query().Get("active") == "true" {
		query += " WHERE is_active = true"
	}
	query += " ORDER BY name"

	rows, err := s.Pool.Query(ctx, query, args...)
	if err != nil {
		writeJSON(w, 200, []Product{})
		return
	}
	defer rows.Close()

	products := make([]Product, 0)
	for rows.Next() {
		p, err := scanProduct(rows)
		if err == nil {
			products = append(products, p)
		}
	}
	writeJSON(w, 200, products)
}

func (s *Server) createProduct(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name          string  `json:"name"`
		Description   string  `json:"description"`
		Price         float64 `json:"price"`
		Unit          string  `json:"unit"`
		StockQuantity float64 `json:"stockQuantity"`
		IsActive      *bool   `json:"isActive"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid JSON body")
		return
	}
	if strings.TrimSpace(body.Name) == "" {
		writeErr(w, 400, "name is required")
		return
	}
	if body.Price < 0 {
		writeErr(w, 400, "price must be >= 0")
		return
	}
	if body.Unit == "" {
		body.Unit = "pcs"
	}
	isActive := true
	if body.IsActive != nil {
		isActive = *body.IsActive
	}

	id := fmt.Sprintf("prod-%s", uuid.New().String()[:8])
	row := s.Pool.QueryRow(r.Context(), `
		INSERT INTO products (id, name, description, price, unit, stock_quantity, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, name, description, price::float8, unit, stock_quantity::float8, is_active, created_at, updated_at`,
		id, body.Name, body.Description, body.Price, body.Unit, body.StockQuantity, isActive,
	)
	p, err := scanProduct(row)
	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}
	writeJSON(w, 201, p)
}

func (s *Server) getProduct(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	row := s.Pool.QueryRow(r.Context(), `
		SELECT id, name, description, price::float8, unit, stock_quantity::float8, is_active, created_at, updated_at
		FROM products WHERE id = $1`, id)
	p, err := scanProduct(row)
	if err != nil {
		writeErr(w, 404, "Product not found")
		return
	}
	writeJSON(w, 200, p)
}

func (s *Server) updateProduct(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body map[string]any
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid JSON body")
		return
	}

	row := s.Pool.QueryRow(r.Context(), `
		SELECT id, name, description, price::float8, unit, stock_quantity::float8, is_active, created_at, updated_at
		FROM products WHERE id = $1`, id)
	p, err := scanProduct(row)
	if err != nil {
		writeErr(w, 404, "Product not found")
		return
	}

	if v, ok := body["name"].(string); ok {
		p.Name = v
	}
	if v, ok := body["description"].(string); ok {
		p.Description = v
	}
	if v, ok := body["price"].(float64); ok {
		p.Price = v
	}
	if v, ok := body["unit"].(string); ok {
		p.Unit = v
	}
	if v, ok := body["stockQuantity"].(float64); ok {
		p.StockQuantity = v
	}
	if v, ok := body["isActive"].(bool); ok {
		p.IsActive = v
	}

	_, _ = s.Pool.Exec(r.Context(), `
		UPDATE products SET name=$1, description=$2, price=$3, unit=$4, stock_quantity=$5, is_active=$6, updated_at=now()
		WHERE id=$7`,
		p.Name, p.Description, p.Price, p.Unit, p.StockQuantity, p.IsActive, id)

	// re-fetch to get updated_at
	row2 := s.Pool.QueryRow(r.Context(), `
		SELECT id, name, description, price::float8, unit, stock_quantity::float8, is_active, created_at, updated_at
		FROM products WHERE id = $1`, id)
	p, _ = scanProduct(row2)
	writeJSON(w, 200, p)
}

func (s *Server) deleteProduct(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, _ = s.Pool.Exec(r.Context(), `DELETE FROM products WHERE id = $1`, id)
	w.WriteHeader(204)
}

// ---- Product Sales Handlers ----

func (s *Server) listProductSales(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `
		SELECT id, product_id, product_name, quantity::float8, total_price::float8,
		       COALESCE(sold_by_id::text,''), sold_by_name, sale_date
		FROM product_sales ORDER BY sale_date DESC`)
	if err != nil {
		writeJSON(w, 200, []ProductSale{})
		return
	}
	defer rows.Close()

	sales := make([]ProductSale, 0)
	for rows.Next() {
		var ps ProductSale
		var soldByID string
		if err := rows.Scan(&ps.ID, &ps.ProductID, &ps.ProductName, &ps.Quantity, &ps.TotalPrice,
			&soldByID, &ps.SoldByName, &ps.SaleDate); err == nil {
			if soldByID != "" {
				ps.SoldByID = &soldByID
			}
			sales = append(sales, ps)
		}
	}
	writeJSON(w, 200, sales)
}

func (s *Server) createProductSale(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Product  string  `json:"product"`
		Quantity float64 `json:"quantity"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid JSON body")
		return
	}
	if body.Product == "" {
		writeErr(w, 400, "product is required")
		return
	}
	if body.Quantity <= 0 {
		writeErr(w, 400, "quantity must be > 0")
		return
	}

	ctx := r.Context()
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	defer tx.Rollback(ctx)

	// Fetch product with stock
	var prod Product
	err = tx.QueryRow(ctx, `
		SELECT id, name, description, price::float8, unit, stock_quantity::float8, is_active, created_at, updated_at
		FROM products WHERE id = $1`, body.Product).Scan(
		&prod.ID, &prod.Name, &prod.Description,
		&prod.Price, &prod.Unit, &prod.StockQuantity,
		&prod.IsActive, &prod.CreatedAt, &prod.UpdatedAt,
	)
	if err != nil {
		writeErr(w, 404, "Product not found")
		return
	}

	if prod.StockQuantity < body.Quantity {
		writeErr(w, 422, "insufficient stock")
		return
	}

	totalPrice := prod.Price * body.Quantity

	// Deduct stock
	_, err = tx.Exec(ctx, `
		UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = now()
		WHERE id = $2`, body.Quantity, prod.ID)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}

	// Insert sale
	saleID := fmt.Sprintf("psale-%s", uuid.New().String()[:8])
	var ps ProductSale
	var soldByID string
	err = tx.QueryRow(ctx, `
		INSERT INTO product_sales (id, product_id, product_name, quantity, total_price, sale_date)
		VALUES ($1, $2, $3, $4, $5, now())
		RETURNING id, product_id, product_name, quantity::float8, total_price::float8,
		          COALESCE(sold_by_id::text,''), sold_by_name, sale_date`,
		saleID, prod.ID, prod.Name, body.Quantity, totalPrice,
	).Scan(&ps.ID, &ps.ProductID, &ps.ProductName, &ps.Quantity, &ps.TotalPrice,
		&soldByID, &ps.SoldByName, &ps.SaleDate)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	if soldByID != "" {
		ps.SoldByID = &soldByID
	}

	if errCommit := tx.Commit(ctx); errCommit != nil {
		writeErr(w, 500, errCommit.Error())
		return
	}

	// Publish Ably event
	_ = s.Ably.Publish(ctx, "yadotena-realtime", "product.changed", map[string]any{})

	writeJSON(w, 201, ps)
}

// ---- Product Purchases Handlers ----

func (s *Server) listProductPurchases(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `
		SELECT id, product_id, product_name, quantity::float8, total_cost::float8,
		       COALESCE(purchased_by_id::text,''), purchased_by_name, purchase_date
		FROM product_purchases ORDER BY purchase_date DESC`)
	if err != nil {
		writeJSON(w, 200, []ProductPurchase{})
		return
	}
	defer rows.Close()

	purchases := make([]ProductPurchase, 0)
	for rows.Next() {
		var pp ProductPurchase
		var purchasedByID string
		if err := rows.Scan(&pp.ID, &pp.ProductID, &pp.ProductName, &pp.Quantity, &pp.TotalCost,
			&purchasedByID, &pp.PurchasedByName, &pp.PurchaseDate); err == nil {
			if purchasedByID != "" {
				pp.PurchasedByID = &purchasedByID
			}
			purchases = append(purchases, pp)
		}
	}
	writeJSON(w, 200, purchases)
}

func (s *Server) createProductPurchase(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Product   string  `json:"product"`
		Quantity  float64 `json:"quantity"`
		TotalCost float64 `json:"total_cost"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid JSON body")
		return
	}
	if body.Product == "" {
		writeErr(w, 400, "product is required")
		return
	}
	if body.Quantity <= 0 {
		writeErr(w, 400, "quantity must be > 0")
		return
	}

	ctx := r.Context()
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	defer tx.Rollback(ctx)

	// Fetch product
	var prod Product
	err = tx.QueryRow(ctx, `
		SELECT id, name, description, price::float8, unit, stock_quantity::float8, is_active, created_at, updated_at
		FROM products WHERE id = $1`, body.Product).Scan(
		&prod.ID, &prod.Name, &prod.Description,
		&prod.Price, &prod.Unit, &prod.StockQuantity,
		&prod.IsActive, &prod.CreatedAt, &prod.UpdatedAt,
	)
	if err != nil {
		writeErr(w, 404, "Product not found")
		return
	}

	// Add stock
	_, err = tx.Exec(ctx, `
		UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = now()
		WHERE id = $2`, body.Quantity, prod.ID)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}

	// Insert purchase
	purchaseID := fmt.Sprintf("ppur-%s", uuid.New().String()[:8])
	var pp ProductPurchase
	var purchasedByID string
	err = tx.QueryRow(ctx, `
		INSERT INTO product_purchases (id, product_id, product_name, quantity, total_cost, purchase_date)
		VALUES ($1, $2, $3, $4, $5, now())
		RETURNING id, product_id, product_name, quantity::float8, total_cost::float8,
		          COALESCE(purchased_by_id::text,''), purchased_by_name, purchase_date`,
		purchaseID, prod.ID, prod.Name, body.Quantity, body.TotalCost,
	).Scan(&pp.ID, &pp.ProductID, &pp.ProductName, &pp.Quantity, &pp.TotalCost,
		&purchasedByID, &pp.PurchasedByName, &pp.PurchaseDate)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	if purchasedByID != "" {
		pp.PurchasedByID = &purchasedByID
	}

	if errCommit := tx.Commit(ctx); errCommit != nil {
		writeErr(w, 500, errCommit.Error())
		return
	}

	// Publish Ably event
	_ = s.Ably.Publish(ctx, "yadotena-realtime", "product.changed", map[string]any{})

	writeJSON(w, 201, pp)
}

// ---- Product Analytics ----

type productPeriodStats struct {
	Quantity float64 `json:"quantity"`
	Total    float64 `json:"total"`
}

type productAnalyticsGroup struct {
	Today productPeriodStats `json:"today"`
	Week  productPeriodStats `json:"week"`
	Month productPeriodStats `json:"month"`
	Year  productPeriodStats `json:"year"`
}

func (s *Server) productAnalytics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	now := time.Now()
	today := now.Truncate(24 * time.Hour)
	week := now.Add(-7 * 24 * time.Hour)
	month := now.Add(-30 * 24 * time.Hour)
	year := now.Add(-365 * 24 * time.Hour)

	salesStats := func(since time.Time) productPeriodStats {
		var qty, total float64
		_ = s.Pool.QueryRow(ctx,
			`SELECT COALESCE(SUM(quantity),0), COALESCE(SUM(total_price),0) FROM product_sales WHERE sale_date >= $1`,
			since,
		).Scan(&qty, &total)
		return productPeriodStats{Quantity: qty, Total: total}
	}

	purchaseStats := func(since time.Time) productPeriodStats {
		var qty, total float64
		_ = s.Pool.QueryRow(ctx,
			`SELECT COALESCE(SUM(quantity),0), COALESCE(SUM(total_cost),0) FROM product_purchases WHERE purchase_date >= $1`,
			since,
		).Scan(&qty, &total)
		return productPeriodStats{Quantity: qty, Total: total}
	}

	result := map[string]any{
		"sales": productAnalyticsGroup{
			Today: salesStats(today),
			Week:  salesStats(week),
			Month: salesStats(month),
			Year:  salesStats(year),
		},
		"purchases": productAnalyticsGroup{
			Today: purchaseStats(today),
			Week:  purchaseStats(week),
			Month: purchaseStats(month),
			Year:  purchaseStats(year),
		},
	}
	writeJSON(w, 200, result)
}
