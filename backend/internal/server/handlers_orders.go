package server

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"yadotena/internal/cache"
)

func round2(x float64) float64 {
	return math.Round(x*100) / 100
}

type APIOrderItem struct {
	ID                  string   `json:"id"`
	MenuItemID          string   `json:"menuItemId"`
	Name                string   `json:"name"`
	Price               float64  `json:"price"`
	Quantity            int      `json:"quantity"`
	SpecialInstructions string   `json:"specialInstructions"`
	SelectedAddons      []string `json:"selectedAddons"`
	RoundNumber         int      `json:"roundNumber"`
}

type APIOrder struct {
	ID              string         `json:"id"`
	Type            string         `json:"type"`
	Status          string         `json:"status"`
	PaymentStatus   string         `json:"paymentStatus"`
	TableID         *string        `json:"tableId,omitempty"`
	CustomerName    *string        `json:"customerName,omitempty"`
	CustomerPhone   *string        `json:"customerPhone,omitempty"`
	DeliveryAddress *string        `json:"deliveryAddress,omitempty"`
	Subtotal        float64        `json:"subtotal"`
	Tax             float64        `json:"tax"`
	ServiceCharge   float64        `json:"serviceCharge"`
	DeliveryFee     float64        `json:"deliveryFee"`
	Total           float64        `json:"total"`
	Items           []APIOrderItem `json:"items"`
	IdempotencyKey  *string        `json:"idempotencyKey,omitempty"`
	CreatedAt       time.Time      `json:"createdAt"`
	UpdatedAt       time.Time      `json:"updatedAt"`
}

type CreateOrderItemInput struct {
	MenuItemID          string   `json:"menuItemId"`
	Name                string   `json:"name"`
	Price               float64  `json:"price"`
	Quantity            int      `json:"quantity"`
	SpecialInstructions string   `json:"specialInstructions"`
	SelectedAddons      []string `json:"selectedAddons"`
}

func (item *CreateOrderItemInput) UnmarshalJSON(data []byte) error {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}

	for _, key := range []string{"name", "title", "label"} {
		if val, ok := raw[key]; ok {
			var str string
			if err := json.Unmarshal(val, &str); err == nil && str != "" {
				item.Name = str
				break
			}
		}
	}

	for _, key := range []string{"price", "cost", "unitPrice"} {
		if val, ok := raw[key]; ok {
			var p float64
			if err := json.Unmarshal(val, &p); err == nil {
				item.Price = p
				break
			}
		}
	}

	for _, key := range []string{"menuItemId", "menu_item_id", "id"} {
		if val, ok := raw[key]; ok {
			var str string
			if err := json.Unmarshal(val, &str); err == nil && str != "" {
				item.MenuItemID = str
				break
			}
		}
	}

	for _, key := range []string{"quantity", "qty"} {
		if val, ok := raw[key]; ok {
			var q int
			if err := json.Unmarshal(val, &q); err == nil && q > 0 {
				item.Quantity = q
				break
			}
		}
	}
	if item.Quantity <= 0 {
		item.Quantity = 1
	}

	for _, key := range []string{"specialInstructions", "special_instructions", "note"} {
		if val, ok := raw[key]; ok {
			var str string
			if err := json.Unmarshal(val, &str); err == nil {
				item.SpecialInstructions = str
				break
			}
		}
	}

	item.SelectedAddons = []string{}
	for _, key := range []string{"selectedAddons", "selected_addons"} {
		if val, ok := raw[key]; ok {
			var strSlice []string
			if err := json.Unmarshal(val, &strSlice); err == nil {
				item.SelectedAddons = strSlice
				break
			}
			var objSlice []map[string]interface{}
			if err := json.Unmarshal(val, &objSlice); err == nil {
				for _, obj := range objSlice {
					if id, ok := obj["id"].(string); ok && id != "" {
						item.SelectedAddons = append(item.SelectedAddons, id)
					} else if name, ok := obj["name"].(string); ok && name != "" {
						item.SelectedAddons = append(item.SelectedAddons, name)
					}
				}
				break
			}
		}
	}

	return nil
}

type CreateOrderInput struct {
	Type            string                 `json:"type"`
	OrderType       string                 `json:"order_type"`
	PaymentStatus   string                 `json:"paymentStatus"`
	TableID         *string                `json:"tableId"`
	CustomerName    *string                `json:"customerName"`
	CustomerPhone   *string                `json:"customerPhone"`
	DeliveryAddress *string                `json:"deliveryAddress"`
	IdempotencyKey  *string                `json:"idempotencyKey"`
	Items           []CreateOrderItemInput `json:"items"`
}

func (input *CreateOrderInput) UnmarshalJSON(data []byte) error {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}

	for _, key := range []string{"type", "order_type", "orderType"} {
		if val, ok := raw[key]; ok {
			var str string
			if err := json.Unmarshal(val, &str); err == nil && str != "" {
				input.Type = str
				input.OrderType = str
				break
			}
		}
	}

	for _, key := range []string{"paymentStatus", "payment_status"} {
		if val, ok := raw[key]; ok {
			var str string
			if err := json.Unmarshal(val, &str); err == nil && str != "" {
				input.PaymentStatus = str
				break
			}
		}
	}

	for _, key := range []string{"tableId", "table_id"} {
		if val, ok := raw[key]; ok {
			var str string
			if err := json.Unmarshal(val, &str); err == nil && str != "" {
				input.TableID = &str
				break
			}
		}
	}

	for _, key := range []string{"customerName", "customer_name"} {
		if val, ok := raw[key]; ok {
			var str string
			if err := json.Unmarshal(val, &str); err == nil && str != "" {
				input.CustomerName = &str
				break
			}
		}
	}

	for _, key := range []string{"customerPhone", "customer_phone"} {
		if val, ok := raw[key]; ok {
			var str string
			if err := json.Unmarshal(val, &str); err == nil && str != "" {
				input.CustomerPhone = &str
				break
			}
		}
	}

	for _, key := range []string{"deliveryAddress", "delivery_address"} {
		if val, ok := raw[key]; ok {
			var str string
			if err := json.Unmarshal(val, &str); err == nil && str != "" {
				input.DeliveryAddress = &str
				break
			}
		}
	}

	for _, key := range []string{"idempotencyKey", "idempotency_key"} {
		if val, ok := raw[key]; ok {
			var str string
			if err := json.Unmarshal(val, &str); err == nil && str != "" {
				input.IdempotencyKey = &str
				break
			}
		}
	}

	if val, ok := raw["items"]; ok {
		var items []CreateOrderItemInput
		if err := json.Unmarshal(val, &items); err == nil {
			input.Items = items
		}
	}

	return nil
}

func (s *Server) listOrders(w http.ResponseWriter, r *http.Request) {
	typeFilter := r.URL.Query().Get("type")
	statusFilter := r.URL.Query().Get("status")
	paymentStatusFilter := r.URL.Query().Get("paymentStatus")
	tableFilter := r.URL.Query().Get("table")
	searchFilter := r.URL.Query().Get("search")

	q := `
		SELECT 
			o.id, o.type, o.status, o.payment_status, o.table_id, o.customer_name, o.customer_phone, o.delivery_address,
			o.subtotal::float8, o.tax::float8, o.service_charge::float8, o.delivery_fee::float8, o.total::float8,
			o.idempotency_key, o.created_at, o.updated_at,
			COALESCE(
				jsonb_agg(
					jsonb_build_object(
						'id', oi.id,
						'menuItemId', COALESCE(oi.menu_item_id, ''),
						'name', oi.name,
						'price', oi.price::float8,
						'quantity', oi.quantity,
						'specialInstructions', COALESCE(oi.special_instructions, ''),
						'selectedAddons', COALESCE(oi.selected_addons, '[]'::jsonb),
						'roundNumber', oi.round_number
					) ORDER BY oi.round_number, oi.id
				) FILTER (WHERE oi.id IS NOT NULL), '[]'::jsonb
			) AS items
		FROM orders o
		LEFT JOIN order_items oi ON oi.order_id = o.id
		WHERE 1=1`
	args := []any{}
	n := 1

	if typeFilter != "" {
		q += fmt.Sprintf(" AND o.type = $%d", n)
		args = append(args, strings.ToUpper(typeFilter))
		n++
	}
	if statusFilter != "" {
		q += fmt.Sprintf(" AND o.status = $%d", n)
		args = append(args, strings.ToUpper(statusFilter))
		n++
	}
	if paymentStatusFilter != "" {
		q += fmt.Sprintf(" AND o.payment_status = $%d", n)
		args = append(args, strings.ToUpper(paymentStatusFilter))
		n++
	}
	if tableFilter != "" {
		q += fmt.Sprintf(" AND (o.table_id = $%d OR o.table_id ILIKE $%d)", n, n)
		args = append(args, tableFilter)
		n++
	}
	if searchFilter != "" {
		q += fmt.Sprintf(" AND (o.id ILIKE $%d OR o.customer_name ILIKE $%d OR o.customer_phone ILIKE $%d)", n, n, n)
		args = append(args, "%"+searchFilter+"%")
		n++
	}

	q += " GROUP BY o.id ORDER BY o.created_at DESC LIMIT 100"

	rows, err := s.Pool.Query(r.Context(), q, args...)
	if err != nil {
		writeJSON(w, 200, []APIOrder{})
		return
	}
	defer rows.Close()

	ordersList := make([]APIOrder, 0)
	for rows.Next() {
		var o APIOrder
		var itemsRaw []byte
		if errScan := rows.Scan(
			&o.ID, &o.Type, &o.Status, &o.PaymentStatus, &o.TableID, &o.CustomerName, &o.CustomerPhone, &o.DeliveryAddress,
			&o.Subtotal, &o.Tax, &o.ServiceCharge, &o.DeliveryFee, &o.Total,
			&o.IdempotencyKey, &o.CreatedAt, &o.UpdatedAt, &itemsRaw,
		); errScan == nil {
			if len(itemsRaw) > 0 {
				_ = json.Unmarshal(itemsRaw, &o.Items)
			}
			if o.Items == nil {
				o.Items = []APIOrderItem{}
			}
			ordersList = append(ordersList, o)
		}
	}

	writeJSON(w, 200, ordersList)
}

func (s *Server) getOrder(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	order, err := s.fetchOrderFull(r.Context(), id)
	if err != nil {
		writeErr(w, 404, "Order not found")
		return
	}
	writeJSON(w, 200, order)
}

func (s *Server) createOrderEndpoint(w http.ResponseWriter, r *http.Request) {
	ip := r.RemoteAddr
	if !cache.AllowRate(r.Context(), s.Redis, "rl:order:"+ip, 60, time.Minute) {
		writeErr(w, 429, "rate limit exceeded")
		return
	}

	var input CreateOrderInput
	if err := decodeJSON(r, &input); err != nil {
		writeErr(w, 400, "invalid JSON body")
		return
	}

	// Normalize input values
	orderType := strings.ToUpper(input.Type)
	if orderType == "" {
		orderType = strings.ToUpper(input.OrderType)
	}
	if orderType == "" {
		orderType = "DINE_IN"
	}
	paymentStatus := strings.ToUpper(input.PaymentStatus)
	if paymentStatus == "" {
		paymentStatus = "PENDING"
	}

	// Safe Table ID resolution to eliminate foreign key constraints
	if orderType == "DINE_IN" {
		input.TableID = s.resolveTableID(r.Context(), input.TableID)
	} else {
		input.TableID = nil
	}

	// 1. Idempotency Key check
	if input.IdempotencyKey != nil && *input.IdempotencyKey != "" {
		var existingID string
		errIdem := s.Pool.QueryRow(r.Context(), `SELECT id FROM orders WHERE idempotency_key = $1`, *input.IdempotencyKey).Scan(&existingID)
		if errIdem == nil && existingID != "" {
			existingOrder, errF := s.fetchOrderFull(r.Context(), existingID)
			if errF == nil {
				writeJSON(w, 200, existingOrder)
				return
			}
		}
	}

	// 2. Dine-In Auto-Merge check
	var targetOrderID string
	if orderType == "DINE_IN" && input.TableID != nil && *input.TableID != "" {
		_ = s.Pool.QueryRow(r.Context(), `
			SELECT id FROM orders
			WHERE table_id = $1 AND type = 'DINE_IN' AND status IN ('PENDING', 'PREPARING', 'READY')
			ORDER BY created_at DESC LIMIT 1`, *input.TableID).Scan(&targetOrderID)
	}

	// Validate Items
	if len(input.Items) == 0 {
		writeErr(w, 400, "order must contain at least one item")
		return
	}

	// Check menu items & availability in batch
	unavailableItems := make([]string, 0)
	type resolvedItem struct {
		menuItemID string
		name       string
		price      float64
		qty        int
		notes      string
		addons     []string
	}
	resolved := make([]resolvedItem, 0, len(input.Items))

	menuItemIDs := make([]string, 0, len(input.Items))
	for _, item := range input.Items {
		if item.MenuItemID != "" {
			menuItemIDs = append(menuItemIDs, item.MenuItemID)
		}
	}

	type menuItemInfo struct {
		name      string
		price     float64
		available bool
	}
	menuMap := make(map[string]menuItemInfo)

	if len(menuItemIDs) > 0 {
		rowsMenu, errM := s.Pool.Query(r.Context(), `SELECT id, name, price::float8, available FROM menu_items WHERE id = ANY($1)`, menuItemIDs)
		if errM == nil {
			defer rowsMenu.Close()
			for rowsMenu.Next() {
				var idStr, name string
				var pr float64
				var av bool
				if errScan := rowsMenu.Scan(&idStr, &name, &pr, &av); errScan == nil {
					menuMap[idStr] = menuItemInfo{name: name, price: pr, available: av}
				}
			}
		}

		// Also resolve standalone add-on IDs
		rowsAddons, errA := s.Pool.Query(r.Context(), `SELECT id, name, price::float8, is_active FROM addons WHERE id = ANY($1)`, menuItemIDs)
		if errA == nil {
			defer rowsAddons.Close()
			for rowsAddons.Next() {
				var idStr, name string
				var pr float64
				var act bool
				if errScan := rowsAddons.Scan(&idStr, &name, &pr, &act); errScan == nil {
					menuMap[idStr] = menuItemInfo{name: name, price: pr, available: act}
				}
			}
		}
	}

	for _, item := range input.Items {
		mID := item.MenuItemID
		qty := item.Quantity
		if qty <= 0 {
			qty = 1
		}
		notes := item.SpecialInstructions

		info, ok := menuMap[mID]
		if !ok {
			if item.Name != "" {
				info = menuItemInfo{name: item.Name, price: item.Price, available: true}
			} else {
				unavailableItems = append(unavailableItems, fmt.Sprintf("Item %s not found", mID))
				continue
			}
		}
		if !info.available {
			unavailableItems = append(unavailableItems, info.name)
			continue
		}

		resolved = append(resolved, resolvedItem{
			menuItemID: mID,
			name:       info.name,
			price:      info.price,
			qty:        qty,
			notes:      notes,
			addons:     item.SelectedAddons,
		})
	}

	if len(unavailableItems) > 0 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(400)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"error":             "Some items are unavailable",
			"unavailable_items": unavailableItems,
		})
		return
	}

	ctx := r.Context()
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	defer tx.Rollback(ctx)

	// If Auto-Merging into existing open order
	if targetOrderID != "" {
		// Find max round number for existing order items
		var maxRound int
		_ = tx.QueryRow(ctx, `SELECT COALESCE(MAX(round_number), 1) FROM order_items WHERE order_id = $1`, targetOrderID).Scan(&maxRound)
		nextRound := maxRound + 1

		for _, item := range resolved {
			adBytes, _ := json.Marshal(item.addons)
			itemID := fmt.Sprintf("item-%s", uuid.New().String()[:8])
			_, errAdd := tx.Exec(ctx, `
				INSERT INTO order_items (id, order_id, menu_item_id, name, price, quantity, special_instructions, selected_addons, round_number)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
				itemID, targetOrderID, item.menuItemID, item.name, item.price, item.qty, item.notes, adBytes, nextRound,
			)
			if errAdd != nil {
				writeErr(w, 500, errAdd.Error())
				return
			}
			for _, addonName := range item.addons {
				_, _ = tx.Exec(ctx, `
					INSERT INTO order_item_addons (order_item_id, addon_id, name, price)
					VALUES ($1, NULL, $2, 0.00)`, itemID, addonName)
			}
		}

		s.recalculateOrderFinancialsTx(ctx, tx, targetOrderID, orderType)
		if errCommit := tx.Commit(ctx); errCommit != nil {
			writeErr(w, 500, errCommit.Error())
			return
		}

		updatedOrder, _ := s.fetchOrderFull(ctx, targetOrderID)
		s.Ably.Publish(ctx, "yadotena-realtime", "order.updated", updatedOrder)
		s.NATS.Publish("yadotena.orders.updated", updatedOrder)
		writeJSON(w, 200, updatedOrder)
		return
	}

	// Create New Order
	orderID := fmt.Sprintf("ORD-%d", time.Now().UnixNano()%1000000)

	var subtotal float64
	for _, item := range resolved {
		subtotal += item.price * float64(item.qty)
	}
	subtotal = round2(subtotal)

	vatTax := round2(subtotal * 0.15)
	var serviceCharge float64
	if orderType == "DINE_IN" {
		serviceCharge = round2(subtotal * 0.10)
	}
	var deliveryFee float64
	if orderType == "DELIVERY" {
		deliveryFee = 100.00
	}
	total := round2(subtotal + vatTax + serviceCharge + deliveryFee)

	_, errIns := tx.Exec(ctx, `
		INSERT INTO orders (id, type, status, payment_status, table_id, customer_name, customer_phone, delivery_address, subtotal, tax, service_charge, delivery_fee, total, idempotency_key)
		VALUES ($1, $2, 'PENDING', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
		orderID, orderType, paymentStatus, input.TableID, input.CustomerName, input.CustomerPhone, input.DeliveryAddress,
		subtotal, vatTax, serviceCharge, deliveryFee, total, input.IdempotencyKey,
	)

	if errIns != nil {
		writeErr(w, 400, errIns.Error())
		return
	}

	for _, item := range resolved {
		adBytes, _ := json.Marshal(item.addons)
		itemID := fmt.Sprintf("item-%s", uuid.New().String()[:8])
		_, errAdd := tx.Exec(ctx, `
			INSERT INTO order_items (id, order_id, menu_item_id, name, price, quantity, special_instructions, selected_addons, round_number)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)`,
			itemID, orderID, item.menuItemID, item.name, item.price, item.qty, item.notes, adBytes,
		)
		if errAdd != nil {
			writeErr(w, 500, errAdd.Error())
			return
		}
		for _, addonName := range item.addons {
			_, _ = tx.Exec(ctx, `
				INSERT INTO order_item_addons (order_item_id, addon_id, name, price)
				VALUES ($1, NULL, $2, 0.00)`, itemID, addonName)
		}
	}

	// Update table status to OCCUPIED if dine-in
	if orderType == "DINE_IN" && input.TableID != nil && *input.TableID != "" {
		_, _ = tx.Exec(ctx, `UPDATE tables SET status = 'OCCUPIED', updated_at = now() WHERE id = $1`, *input.TableID)
		s.Ably.Publish(ctx, "yadotena-realtime", "table.updated", map[string]any{"id": *input.TableID, "status": "OCCUPIED"})
	}

	if errCommit := tx.Commit(ctx); errCommit != nil {
		writeErr(w, 500, errCommit.Error())
		return
	}

	newOrder, _ := s.fetchOrderFull(ctx, orderID)
	s.Ably.Publish(ctx, "yadotena-realtime", "order.created", newOrder)
	s.NATS.Publish("yadotena.orders.created", newOrder)
	s.LogActivity(ctx, "waiter-station", "Floor Waiter", "WAITER", "CREATE_ORDER", "ORDER", orderID, fmt.Sprintf("Placed new %s order #%s (Total: ETB %.2f)", orderType, orderID, total), nil, newOrder, r.RemoteAddr)

	writeJSON(w, 201, newOrder)
}

func (s *Server) updateOrderStatusEndpoint(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body struct {
		Status string `json:"status"`
	}
	if err := decodeJSON(r, &body); err != nil || body.Status == "" {
		writeErr(w, 400, "status is required")
		return
	}

	newStatus := strings.ToUpper(body.Status)
	ctx := r.Context()

	var oldStatus string
	var currentPaymentStatus string
	errScanOld := s.Pool.QueryRow(ctx, `SELECT status, payment_status FROM orders WHERE id = $1`, id).Scan(&oldStatus, &currentPaymentStatus)
	if errScanOld != nil {
		writeErr(w, 404, "Order not found")
		return
	}

	oldStatus = strings.ToUpper(oldStatus)

	// Explicit State Transition Matrix Rules
	if oldStatus != newStatus {
		validTransitions := map[string][]string{
			"DRAFT":     {"PENDING", "CANCELLED"},
			"PENDING":   {"PREPARING", "CANCELLED"},
			"PREPARING": {"READY", "CANCELLED"},
			"READY":     {"SERVED", "CANCELLED"},
			"SERVED":    {"COMPLETED", "CANCELLED"},
			"COMPLETED": {}, // Terminal state
			"CANCELLED": {}, // Terminal state
		}

		allowed, exists := validTransitions[oldStatus]
		if !exists {
			allowed = []string{"PENDING", "PREPARING", "READY", "SERVED", "COMPLETED", "CANCELLED"}
		}

		isAllowed := false
		for _, target := range allowed {
			if target == newStatus {
				isAllowed = true
				break
			}
		}

		if !isAllowed && oldStatus != "" {
			writeErr(w, 409, fmt.Sprintf("Invalid order status transition from %s to %s", oldStatus, newStatus))
			return
		}
	}

	// Strict State Invariant: An order cannot transition to COMPLETED unless payment_status is PAID
	if newStatus == "COMPLETED" && strings.ToUpper(currentPaymentStatus) != "PAID" {
		writeErr(w, 409, "Cannot set order status to COMPLETED when payment is UNPAID. Settle payment first.")
		return
	}

	var tableID *string
	err := s.Pool.QueryRow(ctx, `UPDATE orders SET status = $1, updated_at = now() WHERE id = $2 RETURNING table_id`, newStatus, id).Scan(&tableID)
	if err != nil {
		writeErr(w, 404, "Order not found")
		return
	}

	// Sync table status if dine-in
	if tableID != nil && *tableID != "" {
		if newStatus == "READY" {
			_, _ = s.Pool.Exec(ctx, `UPDATE tables SET status = 'WAITING_FOR_SERVICE', updated_at = now() WHERE id = $1`, *tableID)
			s.Ably.Publish(ctx, "yadotena-realtime", "table.updated", map[string]any{"id": *tableID, "status": "WAITING_FOR_SERVICE"})
		} else if newStatus == "COMPLETED" || newStatus == "CANCELLED" {
			_, _ = s.Pool.Exec(ctx, `UPDATE tables SET status = 'AVAILABLE', updated_at = now() WHERE id = $1`, *tableID)
			s.Ably.Publish(ctx, "yadotena-realtime", "table.updated", map[string]any{"id": *tableID, "status": "AVAILABLE"})
		}
	}

	updatedOrder, _ := s.fetchOrderFull(ctx, id)
	s.Ably.Publish(ctx, "yadotena-realtime", "order.updated", updatedOrder)
	s.NATS.Publish("yadotena.orders.updated", updatedOrder)

	s.LogActivityFromReq(r, "UPDATE_ORDER_STATUS", "ORDER", id, fmt.Sprintf("Updated Order #%s status from %s to %s", id, oldStatus, newStatus), map[string]string{"status": oldStatus}, map[string]string{"status": newStatus})

	writeJSON(w, 200, updatedOrder)
}

func (s *Server) addOrderItemsEndpoint(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var input struct {
		Items []CreateOrderItemInput `json:"items"`
	}
	if err := decodeJSON(r, &input); err != nil || len(input.Items) == 0 {
		writeErr(w, 400, "items are required")
		return
	}

	ctx := r.Context()
	order, err := s.fetchOrderFull(ctx, id)
	if err != nil {
		writeErr(w, 404, "Order not found")
		return
	}

	if order.Status == "COMPLETED" || order.Status == "CANCELLED" {
		writeErr(w, 400, fmt.Sprintf("Cannot add items to a %s order", strings.ToLower(order.Status)))
		return
	}

	tx, errTx := s.Pool.Begin(ctx)
	if errTx != nil {
		writeErr(w, 500, errTx.Error())
		return
	}
	defer tx.Rollback(ctx)

	// Explicit FOR UPDATE Row Lock on orders table to serialize round_number calculation under concurrent writes
	var dummyID string
	errLock := tx.QueryRow(ctx, `SELECT id FROM orders WHERE id = $1 FOR UPDATE`, id).Scan(&dummyID)
	if errLock != nil {
		writeErr(w, 404, "Order not found")
		return
	}

	var maxRound int
	_ = tx.QueryRow(ctx, `SELECT COALESCE(MAX(round_number), 1) FROM order_items WHERE order_id = $1`, id).Scan(&maxRound)
	nextRound := maxRound + 1

	for _, item := range input.Items {
		qty := item.Quantity
		if qty <= 0 {
			qty = 1
		}
		notes := item.SpecialInstructions

		var name string
		var price float64
		errItem := tx.QueryRow(ctx, `SELECT name, price::float8 FROM menu_items WHERE id = $1`, item.MenuItemID).Scan(&name, &price)
		if errItem != nil {
			errAddon := tx.QueryRow(ctx, `SELECT name, price::float8 FROM addons WHERE id = $1`, item.MenuItemID).Scan(&name, &price)
			if errAddon != nil {
				if item.Name != "" {
					name = item.Name
					price = item.Price
				} else {
					name = "Custom Item"
					price = 0.0
				}
			}
		}

		adBytes, _ := json.Marshal(item.SelectedAddons)
		itemID := fmt.Sprintf("item-%s", uuid.New().String()[:8])

		_, errAdd := tx.Exec(ctx, `
			INSERT INTO order_items (id, order_id, menu_item_id, name, price, quantity, special_instructions, selected_addons, round_number)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			itemID, id, item.MenuItemID, name, price, qty, notes, adBytes, nextRound,
		)
		if errAdd != nil {
			writeErr(w, 500, errAdd.Error())
			return
		}
	}

	s.recalculateOrderFinancialsTx(ctx, tx, id, order.Type)
	_, _ = tx.Exec(ctx, `UPDATE orders SET status = 'PENDING', updated_at = now() WHERE id = $1`, id)

	if errCommit := tx.Commit(ctx); errCommit != nil {
		writeErr(w, 500, errCommit.Error())
		return
	}

	updatedOrder, _ := s.fetchOrderFull(ctx, id)
	s.Ably.Publish(ctx, "yadotena-realtime", "order.updated", updatedOrder)
	s.NATS.Publish("yadotena.orders.updated", updatedOrder)
	s.LogActivity(ctx, "waiter-station", "Floor Waiter", "WAITER", "APPEND_ORDER_ITEMS", "ORDER", id, fmt.Sprintf("Appended %d items/addons to Order #%s (New Total: ETB %.2f)", len(input.Items), id, updatedOrder.Total), order, updatedOrder, r.RemoteAddr)

	writeJSON(w, 200, updatedOrder)
}

func (s *Server) fetchOrderFull(ctx context.Context, id string) (*APIOrder, error) {
	var o APIOrder
	err := s.Pool.QueryRow(ctx, `
		SELECT id, type, status, payment_status, table_id, customer_name, customer_phone, delivery_address,
		       subtotal::float8, tax::float8, service_charge::float8, delivery_fee::float8, total::float8,
		       idempotency_key, created_at, updated_at
		FROM orders WHERE id = $1`, id).Scan(
		&o.ID, &o.Type, &o.Status, &o.PaymentStatus, &o.TableID, &o.CustomerName, &o.CustomerPhone, &o.DeliveryAddress,
		&o.Subtotal, &o.Tax, &o.ServiceCharge, &o.DeliveryFee, &o.Total,
		&o.IdempotencyKey, &o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	o.Items = s.loadOrderItems(ctx, o.ID)
	return &o, nil
}

func (s *Server) loadOrderItems(ctx context.Context, orderID string) []APIOrderItem {
	rows, err := s.Pool.Query(ctx, `
		SELECT id, COALESCE(menu_item_id, ''), name, price::float8, quantity, COALESCE(special_instructions, ''), selected_addons, round_number
		FROM order_items WHERE order_id = $1 ORDER BY round_number, id`, orderID)
	if err != nil {
		return []APIOrderItem{}
	}
	defer rows.Close()

	items := make([]APIOrderItem, 0)
	for rows.Next() {
		var item APIOrderItem
		var adRaw []byte
		if errScan := rows.Scan(&item.ID, &item.MenuItemID, &item.Name, &item.Price, &item.Quantity, &item.SpecialInstructions, &adRaw, &item.RoundNumber); errScan == nil {
			if len(adRaw) > 0 {
				_ = json.Unmarshal(adRaw, &item.SelectedAddons)
			}
			if item.SelectedAddons == nil {
				item.SelectedAddons = []string{}
			}
			items = append(items, item)
		}
	}
	return items
}

func (s *Server) recalculateOrderFinancialsTx(ctx context.Context, tx pgx.Tx, orderID string, orderType string) {
	var subtotal float64
	_ = tx.QueryRow(ctx, `SELECT COALESCE(SUM(price * quantity), 0)::float8 FROM order_items WHERE order_id = $1`, orderID).Scan(&subtotal)
	subtotal = round2(subtotal)

	tax := round2(subtotal * 0.15)
	var serviceCharge float64
	if orderType == "DINE_IN" {
		serviceCharge = round2(subtotal * 0.10)
	}
	var deliveryFee float64
	if orderType == "DELIVERY" {
		deliveryFee = 100.00
	}
	total := round2(subtotal + tax + serviceCharge + deliveryFee)

	_, _ = tx.Exec(ctx, `
		UPDATE orders SET subtotal=$1, tax=$2, service_charge=$3, delivery_fee=$4, total=$5, updated_at=now() WHERE id=$6`,
		subtotal, tax, serviceCharge, deliveryFee, total, orderID,
	)
}
