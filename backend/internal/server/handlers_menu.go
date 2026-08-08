package server

import (
	"encoding/json"
	"net/http"
	"net/url"

	"github.com/google/uuid"
	"yadotena/internal/dto"
	"yadotena/internal/models"
	"yadotena/internal/orders"
)

func (s *Server) publicMenu(w http.ResponseWriter, r *http.Request) {
	cats, err := s.fetchCategories(r, true)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	items, err := s.fetchItems(r, true)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]any{"categories": cats, "items": items})
}

func (s *Server) listCategories(w http.ResponseWriter, r *http.Request) {
	activeOnly := r.URL.Query().Get("include_inactive") != "1"
	cats, err := s.fetchCategories(r, activeOnly)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, cats)
}

func (s *Server) fetchCategories(r *http.Request, activeOnly bool) ([]models.Category, error) {
	q := `SELECT id, name, sort_order, is_active FROM categories`
	if activeOnly {
		q += ` WHERE is_active=true`
	}
	q += ` ORDER BY sort_order, name`
	rows, err := s.Pool.Query(r.Context(), q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []models.Category{}
	for rows.Next() {
		var c models.Category
		if err := rows.Scan(&c.ID, &c.Name, &c.SortOrder, &c.IsActive); err != nil {
			return nil, err
		}
		list = append(list, c)
	}
	return list, nil
}

func (s *Server) createCategory(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	var body struct {
		Name      string `json:"name"`
		SortOrder int    `json:"sort_order"`
	}
	if err := decodeJSON(r, &body); err != nil || body.Name == "" {
		writeErr(w, 400, "name required")
		return
	}
	var id uuid.UUID
	err := s.Pool.QueryRow(r.Context(), `
		INSERT INTO categories (name, sort_order) VALUES ($1,$2) RETURNING id`, body.Name, body.SortOrder).Scan(&id)
	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}
	_ = s.Log.Write(r.Context(), &c.StaffID, c.Name, "create_category", "category", id.String(), nil)
	writeJSON(w, 201, map[string]any{"id": id})
}

func (s *Server) patchCategory(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	id, err := uuid.Parse(chiURLParam(r, "id"))
	if err != nil {
		writeErr(w, 400, "bad id")
		return
	}
	var body struct {
		Name      *string `json:"name"`
		SortOrder *int    `json:"sort_order"`
		IsActive  *bool   `json:"is_active"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	if body.Name != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE categories SET name=$1, updated_at=now() WHERE id=$2`, *body.Name, id)
	}
	if body.SortOrder != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE categories SET sort_order=$1, updated_at=now() WHERE id=$2`, *body.SortOrder, id)
	}
	if body.IsActive != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE categories SET is_active=$1, updated_at=now() WHERE id=$2`, *body.IsActive, id)
	}
	_ = s.Log.Write(r.Context(), &c.StaffID, c.Name, "update_category", "category", id.String(), nil)
	writeJSON(w, 200, map[string]string{"ok": "true"})
}

func (s *Server) listItems(w http.ResponseWriter, r *http.Request) {
	availableOnly := r.URL.Query().Get("include_unavailable") != "1"
	items, err := s.fetchItems(r, availableOnly)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, items)
}

func (s *Server) fetchItems(r *http.Request, availableOnly bool) ([]map[string]any, error) {
	q := `
		SELECT mi.id, mi.category_id, mi.name, mi.description, mi.price_etb::float8,
		       mi.image_url, mi.is_available, mi.sort_order, mi.preparation_time_minutes,
		       c.name
		FROM menu_items mi
		JOIN categories c ON c.id=mi.category_id`
	if availableOnly {
		q += ` WHERE mi.is_available=true AND c.is_active=true`
	}
	q += ` ORDER BY mi.sort_order, mi.name`
	rows, err := s.Pool.Query(r.Context(), q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []map[string]any{}
	for rows.Next() {
		var it models.MenuItem
		var categoryName string
		if err := rows.Scan(
			&it.ID, &it.CategoryID, &it.Name, &it.Description, &it.PriceETB,
			&it.ImageURL, &it.IsAvailable, &it.SortOrder, &it.PreparationTimeMinutes,
			&categoryName,
		); err != nil {
			return nil, err
		}
		list = append(list, dto.MenuItemAPI(it, categoryName))
	}
	return list, nil
}

func (s *Server) createItem(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	var body struct {
		CategoryID            uuid.UUID `json:"categoryId"`
		LegacyCategoryID      uuid.UUID `json:"category_id"`
		Name                  string    `json:"name"`
		Description           string    `json:"description"`
		Price                 *float64  `json:"price"`
		LegacyPriceETB        *float64  `json:"price_etb"`
		Image                 *string   `json:"image"`
		LegacyImageURL        *string   `json:"image_url"`
		Available             *bool     `json:"available"`
		LegacyIsAvailable     *bool     `json:"is_available"`
		PreparationTime       *int      `json:"preparationTime"`
		LegacyPreparationTime *int      `json:"preparation_time_minutes"`
		SortOrder             int       `json:"sort_order"`
	}
	if err := decodeJSON(r, &body); err != nil || body.Name == "" {
		writeErr(w, 400, "invalid item")
		return
	}
	categoryID := body.CategoryID
	if categoryID == uuid.Nil {
		categoryID = body.LegacyCategoryID
	}
	if categoryID == uuid.Nil {
		writeErr(w, 400, "categoryId required")
		return
	}
	price := body.Price
	if price == nil {
		price = body.LegacyPriceETB
	}
	if price == nil {
		writeErr(w, 400, "price required")
		return
	}
	imageURL := body.Image
	if imageURL == nil {
		imageURL = body.LegacyImageURL
	}
	if imageURL != nil && *imageURL != "" {
		if err := validateImageURL(*imageURL); err != nil {
			writeErr(w, 400, err.Error())
			return
		}
	}
	isAvailable := true
	if body.Available != nil {
		isAvailable = *body.Available
	} else if body.LegacyIsAvailable != nil {
		isAvailable = *body.LegacyIsAvailable
	}
	preparationTime := 0
	if body.PreparationTime != nil {
		preparationTime = *body.PreparationTime
	} else if body.LegacyPreparationTime != nil {
		preparationTime = *body.LegacyPreparationTime
	}
	var id uuid.UUID
	err := s.Pool.QueryRow(r.Context(), `
		INSERT INTO menu_items (
			category_id, name, description, price_etb, image_url, is_available,
			preparation_time_minutes, sort_order
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
		categoryID, body.Name, body.Description, *price, imageURL, isAvailable,
		preparationTime, body.SortOrder).Scan(&id)
	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}
	_ = s.Log.Write(r.Context(), &c.StaffID, c.Name, "create_item", "menu_item", id.String(), nil)
	writeJSON(w, 201, map[string]any{"id": id})
}

func (s *Server) patchItem(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	id, err := uuid.Parse(chiURLParam(r, "id"))
	if err != nil {
		writeErr(w, 400, "bad id")
		return
	}
	var body struct {
		CategoryID            *uuid.UUID `json:"categoryId"`
		LegacyCategoryID      *uuid.UUID `json:"category_id"`
		Name                  *string    `json:"name"`
		Description           *string    `json:"description"`
		Price                 *float64   `json:"price"`
		LegacyPriceETB        *float64   `json:"price_etb"`
		Image                 *string    `json:"image"`
		LegacyImageURL        *string    `json:"image_url"`
		Available             *bool      `json:"available"`
		LegacyIsAvailable     *bool      `json:"is_available"`
		PreparationTime       *int       `json:"preparationTime"`
		LegacyPreparationTime *int       `json:"preparation_time_minutes"`
		SortOrder             *int       `json:"sort_order"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	categoryID := body.CategoryID
	if categoryID == nil {
		categoryID = body.LegacyCategoryID
	}
	price := body.Price
	if price == nil {
		price = body.LegacyPriceETB
	}
	imageURL := body.Image
	if imageURL == nil {
		imageURL = body.LegacyImageURL
	}
	isAvailable := body.Available
	if isAvailable == nil {
		isAvailable = body.LegacyIsAvailable
	}
	preparationTime := body.PreparationTime
	if preparationTime == nil {
		preparationTime = body.LegacyPreparationTime
	}
	if imageURL != nil && *imageURL != "" {
		if err := validateImageURL(*imageURL); err != nil {
			writeErr(w, 400, err.Error())
			return
		}
	}
	if categoryID != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE menu_items SET category_id=$1, updated_at=now() WHERE id=$2`, *categoryID, id)
	}
	if body.Name != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE menu_items SET name=$1, updated_at=now() WHERE id=$2`, *body.Name, id)
	}
	if body.Description != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE menu_items SET description=$1, updated_at=now() WHERE id=$2`, *body.Description, id)
	}
	if price != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE menu_items SET price_etb=$1, updated_at=now() WHERE id=$2`, *price, id)
	}
	if imageURL != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE menu_items SET image_url=$1, updated_at=now() WHERE id=$2`, *imageURL, id)
	}
	if isAvailable != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE menu_items SET is_available=$1, updated_at=now() WHERE id=$2`, *isAvailable, id)
	}
	if preparationTime != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE menu_items SET preparation_time_minutes=$1, updated_at=now() WHERE id=$2`, *preparationTime, id)
	}
	if body.SortOrder != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE menu_items SET sort_order=$1, updated_at=now() WHERE id=$2`, *body.SortOrder, id)
	}
	_ = s.Log.Write(r.Context(), &c.StaffID, c.Name, "update_item", "menu_item", id.String(), nil)
	writeJSON(w, 200, map[string]string{"ok": "true"})
}

func validateImageURL(raw string) error {
	u, err := url.Parse(raw)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
		return errInvalidImageURL
	}
	return nil
}

var errInvalidImageURL = &simpleError{"image_url must be http(s)"}

type simpleError struct{ s string }

func (e *simpleError) Error() string { return e.s }

func (s *Server) publicTables(w http.ResponseWriter, r *http.Request) {
	tables, err := s.fetchTables(r, true)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, tables)
}

func (s *Server) listTables(w http.ResponseWriter, r *http.Request) {
	tables, err := s.fetchTables(r, false)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, tables)
}

func (s *Server) fetchTables(r *http.Request, activeOnly bool) ([]map[string]any, error) {
	q := `
		SELECT t.id, t.label, t.seats, t.assigned_waiter_id, t.is_active,
		       o.id, o.order_status, o.payment_status
		FROM cafe_tables t
		LEFT JOIN LATERAL (
			SELECT id, order_status, payment_status
			FROM orders
			WHERE table_id=t.id AND order_type='dine_in'
			  AND order_status NOT IN ('completed','cancelled')
			ORDER BY created_at DESC
			LIMIT 1
		) o ON true`
	if activeOnly {
		q += ` WHERE t.is_active=true`
	}
	q += ` ORDER BY t.label`
	rows, err := s.Pool.Query(r.Context(), q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []map[string]any{}
	for rows.Next() {
		var t models.CafeTable
		var orderID *uuid.UUID
		var orderStatus *models.OrderStatus
		var paymentStatus *models.PaymentStatus
		if err := rows.Scan(
			&t.ID, &t.Label, &t.Seats, &t.AssignedWaiterID, &t.IsActive,
			&orderID, &orderStatus, &paymentStatus,
		); err != nil {
			return nil, err
		}
		var status models.OrderStatus
		var payment models.PaymentStatus
		if orderStatus != nil {
			status = *orderStatus
		}
		if paymentStatus != nil {
			payment = *paymentStatus
		}
		list = append(list, dto.TableAPI(
			t.ID.String(), t.Label, t.Seats,
			orders.DeriveTableStatus(status, payment, orderID != nil),
			orderID,
		))
	}
	return list, nil
}

func (s *Server) createTable(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	var body struct {
		Label            string     `json:"label"`
		Seats            int        `json:"seats"`
		AssignedWaiterID *uuid.UUID `json:"assigned_waiter_id"`
	}
	if err := decodeJSON(r, &body); err != nil || body.Label == "" {
		writeErr(w, 400, "label required")
		return
	}
	if body.Seats <= 0 {
		body.Seats = 2
	}
	var id uuid.UUID
	err := s.Pool.QueryRow(r.Context(), `
		INSERT INTO cafe_tables (label, seats, assigned_waiter_id) VALUES ($1,$2,$3) RETURNING id`,
		body.Label, body.Seats, body.AssignedWaiterID).Scan(&id)
	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}
	_ = s.Log.Write(r.Context(), &c.StaffID, c.Name, "create_table", "table", id.String(), nil)
	writeJSON(w, 201, map[string]any{"id": id})
}

func (s *Server) patchTable(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	id, err := uuid.Parse(chiURLParam(r, "id"))
	if err != nil {
		writeErr(w, 400, "bad id")
		return
	}
	var body struct {
		Label            *string    `json:"label"`
		Seats            *int       `json:"seats"`
		AssignedWaiterID *uuid.UUID `json:"assigned_waiter_id"`
		ClearWaiter      bool       `json:"clear_waiter"`
		IsActive         *bool      `json:"is_active"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	if body.Label != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE cafe_tables SET label=$1, updated_at=now() WHERE id=$2`, *body.Label, id)
	}
	if body.Seats != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE cafe_tables SET seats=$1, updated_at=now() WHERE id=$2`, *body.Seats, id)
	}
	if body.ClearWaiter {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE cafe_tables SET assigned_waiter_id=NULL, updated_at=now() WHERE id=$1`, id)
	} else if body.AssignedWaiterID != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE cafe_tables SET assigned_waiter_id=$1, updated_at=now() WHERE id=$2`, *body.AssignedWaiterID, id)
	}
	if body.IsActive != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE cafe_tables SET is_active=$1, updated_at=now() WHERE id=$2`, *body.IsActive, id)
	}
	_ = s.Log.Write(r.Context(), &c.StaffID, c.Name, "update_table", "table", id.String(), nil)
	writeJSON(w, 200, map[string]string{"ok": "true"})
}

func (s *Server) publicSettings(w http.ResponseWriter, r *http.Request) {
	st, err := s.loadSettings(r)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]any{
		"cafe_name":              st.CafeName,
		"cafe_phone":             st.CafePhone,
		"cafe_address":           st.CafeAddress,
		"accepting_orders":       st.AcceptingOrders,
		"cash_enabled":           st.CashEnabled,
		"digital_enabled":        st.DigitalEnabled,
		"digital_methods":        st.DigitalMethods,
		"service_charge_percent": st.ServiceChargePercent,
	})
}

func (s *Server) getSettings(w http.ResponseWriter, r *http.Request) {
	st, err := s.loadSettings(r)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, st)
}

func (s *Server) patchSettings(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	current, err := s.loadSettings(r)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	var body struct {
		CafeName             *string   `json:"cafe_name"`
		CafePhone            *string   `json:"cafe_phone"`
		CafeAddress          *string   `json:"cafe_address"`
		AcceptingOrders      *bool     `json:"accepting_orders"`
		CashEnabled          *bool     `json:"cash_enabled"`
		DigitalEnabled       *bool     `json:"digital_enabled"`
		DigitalMethods       *[]string `json:"digital_methods"`
		PublicBaseURL        *string   `json:"public_base_url"`
		ServiceChargePercent *float64  `json:"service_charge_percent"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	if body.CafeName != nil {
		current.CafeName = *body.CafeName
	}
	if body.CafePhone != nil {
		current.CafePhone = *body.CafePhone
	}
	if body.CafeAddress != nil {
		current.CafeAddress = *body.CafeAddress
	}
	if body.AcceptingOrders != nil {
		current.AcceptingOrders = *body.AcceptingOrders
	}
	if body.CashEnabled != nil {
		current.CashEnabled = *body.CashEnabled
	}
	if body.DigitalEnabled != nil {
		current.DigitalEnabled = *body.DigitalEnabled
	}
	if body.DigitalMethods != nil {
		current.DigitalMethods = *body.DigitalMethods
	}
	if body.PublicBaseURL != nil {
		current.PublicBaseURL = *body.PublicBaseURL
	}
	if body.ServiceChargePercent != nil {
		current.ServiceChargePercent = *body.ServiceChargePercent
	}
	methods, _ := json.Marshal(current.DigitalMethods)
	_, err = s.Pool.Exec(r.Context(), `
		UPDATE settings SET cafe_name=$1, cafe_phone=$2, cafe_address=$3, accepting_orders=$4,
		cash_enabled=$5, digital_enabled=$6, digital_methods=$7, public_base_url=$8,
		service_charge_percent=$9, updated_at=now()
		WHERE id=1`,
		current.CafeName, current.CafePhone, current.CafeAddress, current.AcceptingOrders,
		current.CashEnabled, current.DigitalEnabled, methods, current.PublicBaseURL,
		current.ServiceChargePercent)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	_ = s.Log.Write(r.Context(), &c.StaffID, c.Name, "update_settings", "settings", "1", nil)
	s.getSettings(w, r)
}

func (s *Server) loadSettings(r *http.Request) (models.Settings, error) {
	var st models.Settings
	var methods []byte
	err := s.Pool.QueryRow(r.Context(), `
		SELECT cafe_name, cafe_phone, cafe_address, accepting_orders, cash_enabled,
		       digital_enabled, digital_methods, public_base_url, service_charge_percent::float8
		FROM settings WHERE id=1`).Scan(
		&st.CafeName, &st.CafePhone, &st.CafeAddress, &st.AcceptingOrders,
		&st.CashEnabled, &st.DigitalEnabled, &methods, &st.PublicBaseURL,
		&st.ServiceChargePercent)
	if err != nil {
		return st, err
	}
	_ = json.Unmarshal(methods, &st.DigitalMethods)
	if st.PublicBaseURL == "" {
		st.PublicBaseURL = s.Cfg.PublicBaseURL
	}
	return st, nil
}
