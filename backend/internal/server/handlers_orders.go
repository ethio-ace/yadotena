package server

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"yadotena/internal/cache"
	"yadotena/internal/dto"
	"yadotena/internal/models"
	"yadotena/internal/orders"
	"yadotena/internal/sse"
)

type placeItem struct {
	MenuItemID          uuid.UUID `json:"menu_item_id"`
	MenuItemIDCamel     uuid.UUID `json:"menuItemId"`
	ProductID           uuid.UUID `json:"product_id"`
	ProductIDCamel      uuid.UUID `json:"productId"`
	Qty                 int       `json:"qty"`
	Quantity            int       `json:"quantity"`
	Note                string    `json:"note"`
	SpecialInstructions string    `json:"specialInstructions"`
}

type placeBody struct {
	Type               string               `json:"type"`
	OrderType          models.OrderType     `json:"order_type"`
	CustomerName       string               `json:"customer_name"`
	CustomerNameCamel  string               `json:"customerName"`
	CustomerPhone      string               `json:"customer_phone"`
	CustomerPhoneCamel string               `json:"customerPhone"`
	DeliveryAddress    *string              `json:"delivery_address"`
	DeliveryAddrCamel  *string              `json:"deliveryAddress"`
	TableID            *uuid.UUID           `json:"table_id"`
	TableIDCamel       *uuid.UUID           `json:"tableId"`
	Notes              string               `json:"notes"`
	Items              []placeItem          `json:"items"`
	PaymentMethod      models.PaymentMethod `json:"payment_method"`
	PaymentMethodCamel models.PaymentMethod `json:"paymentMethod"`
	DigitalMethod      *string              `json:"digital_method"`
	DigitalMethodCamel *string              `json:"digitalMethod"`
	Reference          *string              `json:"reference"`
	MarkCashPaid       bool                 `json:"mark_cash_paid"`
	MarkCashPaidCamel  *bool                `json:"markCashPaid"`
}

func (body *placeBody) normalize() error {
	if body.Type != "" {
		orderType, err := dto.ParseOrderTypeAPI(body.Type)
		if err != nil {
			return err
		}
		body.OrderType = orderType
	} else if body.OrderType != "" {
		if orderType, err := dto.ParseOrderTypeAPI(string(body.OrderType)); err == nil {
			body.OrderType = orderType
		}
	}
	if body.CustomerName == "" {
		body.CustomerName = body.CustomerNameCamel
	}
	if body.CustomerPhone == "" {
		body.CustomerPhone = body.CustomerPhoneCamel
	}
	if body.DeliveryAddress == nil {
		body.DeliveryAddress = body.DeliveryAddrCamel
	}
	if body.TableID == nil {
		body.TableID = body.TableIDCamel
	}
	for i := range body.Items {
		item := &body.Items[i]
		if item.MenuItemID == uuid.Nil {
			item.MenuItemID = item.MenuItemIDCamel
		}
		if item.ProductID == uuid.Nil {
			item.ProductID = item.ProductIDCamel
		}
		if item.Qty == 0 {
			item.Qty = item.Quantity
		}
		if item.Note == "" {
			item.Note = item.SpecialInstructions
		}
	}
	if body.PaymentMethod == "" {
		body.PaymentMethod = body.PaymentMethodCamel
	}
	if body.DigitalMethod == nil {
		body.DigitalMethod = body.DigitalMethodCamel
	}
	if body.MarkCashPaidCamel != nil {
		body.MarkCashPaid = *body.MarkCashPaidCamel
	}
	return nil
}

func (s *Server) publicPlaceOrder(w http.ResponseWriter, r *http.Request) {
	ip := r.RemoteAddr
	if !cache.AllowRate(r.Context(), s.Redis, "rl:place:"+ip, 30, time.Minute) {
		writeErr(w, 429, "rate limit exceeded")
		return
	}
	var body placeBody
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	if err := body.normalize(); err != nil {
		writeErr(w, 400, err.Error())
		return
	}
	st, err := s.loadSettings(r)
	if err != nil || !st.AcceptingOrders {
		writeErr(w, 403, "not accepting orders")
		return
	}
	order, err := s.createOrder(r.Context(), body, nil)
	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}
	s.Hub.BroadcastStaff("order.created", dto.OrderAPI(order))
	writeJSON(w, 201, dto.OrderAPI(order))
}

func (s *Server) staffPlaceOrder(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	var body placeBody
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	if err := body.normalize(); err != nil {
		writeErr(w, 400, err.Error())
		return
	}
	taken := c.StaffID
	order, err := s.createOrder(r.Context(), body, &taken)
	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}
	_ = s.Log.Write(r.Context(), &c.StaffID, c.Name, "create_order", "order", order.ID.String(), map[string]any{"type": order.OrderType})
	s.Hub.BroadcastStaff("order.created", dto.OrderAPI(order))
	writeJSON(w, 201, dto.OrderAPI(order))
}

func (s *Server) createOrder(ctx context.Context, body placeBody, takenBy *uuid.UUID) (*models.Order, error) {
	if body.CustomerName == "" || body.CustomerPhone == "" {
		return nil, errMsg("customer_name and customer_phone required")
	}
	if len(body.Items) == 0 {
		return nil, errMsg("items required")
	}
	switch body.OrderType {
	case models.OrderDineIn:
		if body.TableID == nil {
			return nil, errMsg("table_id required for dine_in")
		}
	case models.OrderDelivery, models.OrderShopDelivery:
		if body.DeliveryAddress == nil || *body.DeliveryAddress == "" {
			return nil, errMsg("delivery_address required")
		}
	case models.OrderPickup, models.OrderShopPickup:
	default:
		return nil, errMsg("invalid order_type")
	}
	isShop := orders.IsShopOrder(body.OrderType)
	if body.PaymentMethod != models.PayCash && body.PaymentMethod != models.PayDigital {
		return nil, errMsg("payment_method required")
	}
	if body.PaymentMethod == models.PayDigital && (body.Reference == nil || *body.Reference == "") {
		return nil, errMsg("reference required for digital payment")
	}

	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	type line struct {
		menuID    *uuid.UUID
		productID *uuid.UUID
		name      string
		price     float64
		qty       int
		note      string
	}
	var lines []line
	var subtotal float64
	for _, it := range body.Items {
		if it.Qty <= 0 {
			return nil, errMsg("invalid qty")
		}
		hasMenu := it.MenuItemID != uuid.Nil
		hasProduct := it.ProductID != uuid.Nil
		if hasMenu == hasProduct {
			return nil, errMsg("each item needs exactly one of menuItemId or productId")
		}
		if isShop && !hasProduct {
			return nil, errMsg("shop orders require productId on items")
		}
		if !isShop && !hasMenu {
			return nil, errMsg("menu orders require menuItemId on items")
		}
		var name string
		var price float64
		var avail bool
		if hasProduct {
			err := tx.QueryRow(ctx, `SELECT name, price_etb::float8, is_available FROM products WHERE id=$1`, it.ProductID).
				Scan(&name, &price, &avail)
			if err != nil || !avail {
				return nil, errMsg("product unavailable")
			}
			pid := it.ProductID
			lines = append(lines, line{nil, &pid, name, price, it.Qty, it.Note})
		} else {
			err := tx.QueryRow(ctx, `SELECT name, price_etb::float8, is_available FROM menu_items WHERE id=$1`, it.MenuItemID).
				Scan(&name, &price, &avail)
			if err != nil || !avail {
				return nil, errMsg("menu item unavailable")
			}
			mid := it.MenuItemID
			lines = append(lines, line{&mid, nil, name, price, it.Qty, it.Note})
		}
		subtotal += price * float64(it.Qty)
	}

	payStatus := orders.InitialPaymentStatus(body.OrderType, body.PaymentMethod, body.MarkCashPaid)
	orderStatus := models.OrderPlaced

	var servicePct float64
	_ = tx.QueryRow(ctx, `SELECT service_charge_percent::float8 FROM settings WHERE id=1`).Scan(&servicePct)

	tax := subtotal * 0.15
	serviceCharge := 0.0
	if body.OrderType == models.OrderDineIn && servicePct > 0 {
		serviceCharge = subtotal * (servicePct / 100)
	}
	deliveryFee := 0.0
	if body.OrderType == models.OrderDelivery || body.OrderType == models.OrderShopDelivery {
		deliveryFee = 100
	}
	total := subtotal + tax + serviceCharge + deliveryFee

	var id uuid.UUID
	var num int
	var created, updated time.Time
	err = tx.QueryRow(ctx, `
		INSERT INTO orders (
			order_type, order_status, payment_status, customer_name, customer_phone,
			delivery_address, table_id, notes, subtotal_etb, tax_etb, service_charge_etb,
			delivery_fee_etb, total_etb, taken_by
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
		RETURNING id, order_number, created_at, updated_at`,
		body.OrderType, orderStatus, payStatus, body.CustomerName, body.CustomerPhone,
		body.DeliveryAddress, body.TableID, body.Notes, subtotal, tax, serviceCharge,
		deliveryFee, total, takenBy,
	).Scan(&id, &num, &created, &updated)
	if err != nil {
		return nil, err
	}

	for _, ln := range lines {
		_, err := tx.Exec(ctx, `
			INSERT INTO order_items (order_id, menu_item_id, product_id, name_snapshot, unit_price_etb, qty, note)
			VALUES ($1,$2,$3,$4,$5,$6,$7)`, id, ln.menuID, ln.productID, ln.name, ln.price, ln.qty, ln.note)
		if err != nil {
			return nil, err
		}
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO payments (order_id, method, digital_method, reference)
		VALUES ($1,$2,$3,$4)`, id, body.PaymentMethod, body.DigitalMethod, body.Reference)
	if err != nil {
		return nil, err
	}
	if payStatus == models.PayPaid {
		_, _ = tx.Exec(ctx, `UPDATE payments SET verified_at=now() WHERE order_id=$1`, id)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return s.loadOrder(ctx, id)
}

func (s *Server) publicTrackOrder(w http.ResponseWriter, r *http.Request) {
	ip := r.RemoteAddr
	if !cache.AllowRate(r.Context(), s.Redis, "rl:track:"+ip, 60, time.Minute) {
		writeErr(w, 429, "rate limit exceeded")
		return
	}
	idStr := r.URL.Query().Get("id")
	phone := r.URL.Query().Get("phone")
	if idStr == "" && phone == "" {
		writeErr(w, 400, "id or phone required")
		return
	}
	if idStr != "" {
		id, err := uuid.Parse(idStr)
		if err != nil {
			writeErr(w, 400, "bad id")
			return
		}
		o, err := s.loadOrder(r.Context(), id)
		if err != nil {
			writeErr(w, 404, "not found")
			return
		}
		writeJSON(w, 200, dto.OrderAPI(o))
		return
	}
	rows, err := s.Pool.Query(r.Context(), `
		SELECT id FROM orders WHERE customer_phone=$1 ORDER BY created_at DESC LIMIT 10`, phone)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	defer rows.Close()
	var list []map[string]any
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		o, err := s.loadOrder(r.Context(), id)
		if err != nil {
			continue
		}
		list = append(list, dto.OrderAPI(o))
	}
	writeJSON(w, 200, list)
}

func (s *Server) staffListOrders(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	q := `SELECT id FROM orders WHERE 1=1`
	args := []any{}
	n := 1
	if status := r.URL.Query().Get("order_status"); status != "" {
		q += ` AND order_status=$` + itoa(n)
		args = append(args, status)
		n++
	}
	if ps := r.URL.Query().Get("payment_status"); ps != "" {
		q += ` AND payment_status=$` + itoa(n)
		args = append(args, ps)
		n++
	}
	if ot := r.URL.Query().Get("order_type"); ot != "" {
		q += ` AND order_type=$` + itoa(n)
		args = append(args, ot)
		n++
	}
	if c.Role == models.RoleChef {
		q += ` AND order_status IN ('placed','preparing','ready') AND order_type NOT IN ('shop_pickup','shop_delivery')`
	}
	q += ` ORDER BY created_at DESC LIMIT 100`
	rows, err := s.Pool.Query(r.Context(), q, args...)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	defer rows.Close()
	var list []map[string]any
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		o, err := s.loadOrder(r.Context(), id)
		if err != nil {
			continue
		}
		if c.Role == models.RoleChef && !o.KitchenVisible {
			continue
		}
		list = append(list, dto.OrderAPI(o))
	}
	writeJSON(w, 200, list)
}

func (s *Server) staffGetOrder(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chiURLParam(r, "id"))
	if err != nil {
		writeErr(w, 400, "bad id")
		return
	}
	o, err := s.loadOrder(r.Context(), id)
	if err != nil {
		writeErr(w, 404, "not found")
		return
	}
	writeJSON(w, 200, dto.OrderAPI(o))
}

func (s *Server) staffPatchOrderStatus(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	id, err := uuid.Parse(chiURLParam(r, "id"))
	if err != nil {
		writeErr(w, 400, "bad id")
		return
	}
	var body struct {
		Status       string  `json:"status"`
		OrderStatus  string  `json:"order_status"`
		CancelReason *string `json:"cancel_reason"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	o, err := s.loadOrder(r.Context(), id)
	if err != nil {
		writeErr(w, 404, "not found")
		return
	}
	to, err := parsePatchOrderStatus(body.Status, body.OrderStatus)
	if err != nil {
		writeErr(w, 409, err.Error())
		return
	}
	from := o.OrderStatus
	switch c.Role {
	case models.RoleChef:
		if !o.KitchenVisible {
			writeErr(w, 403, "order not visible to kitchen yet")
			return
		}
		if !orders.CanChefTransition(from, to) {
			writeErr(w, 409, "invalid chef transition")
			return
		}
	default:
		if !orders.CanFloorTransition(from, to) && c.Role != models.RoleOwner && c.Role != models.RoleManager {
			writeErr(w, 409, "invalid transition")
			return
		}
		if c.Role == models.RoleWaiter && !orders.CanFloorTransition(from, to) {
			writeErr(w, 409, "invalid transition")
			return
		}
	}
	if to == models.OrderCompleted && !orders.CanCompleteDineIn(o.OrderType, o.PaymentStatus) {
		writeErr(w, 409, "dine-in must be paid before complete")
		return
	}
	_, err = s.Pool.Exec(r.Context(), `
		UPDATE orders SET order_status=$1, cancel_reason=$2, updated_at=now() WHERE id=$3`,
		to, body.CancelReason, id)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	_ = s.Log.Write(r.Context(), &c.StaffID, c.Name, "order_status", "order", id.String(), map[string]any{"from": from, "to": to})
	o2, _ := s.loadOrder(r.Context(), id)
	s.Hub.BroadcastOrder(id.String(), "order.updated", dto.OrderAPI(o2))
	writeJSON(w, 200, dto.OrderAPI(o2))
}

func parsePatchOrderStatus(status, orderStatus string) (models.OrderStatus, error) {
	if status != "" {
		return dto.ParseOrderStatusAPI(status)
	}
	if parsed, err := dto.ParseOrderStatusAPI(orderStatus); err == nil {
		return parsed, nil
	}
	internal := models.OrderStatus(orderStatus)
	switch internal {
	case models.OrderPlaced, models.OrderConfirmed, models.OrderPreparing, models.OrderReady,
		models.OrderServed, models.OrderCompleted, models.OrderCancelled:
		return internal, nil
	default:
		return "", errMsg("invalid order status")
	}
}

func (s *Server) staffSubmitPayment(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	id, err := uuid.Parse(chiURLParam(r, "id"))
	if err != nil {
		writeErr(w, 400, "bad id")
		return
	}
	var body struct {
		Method             models.PaymentMethod `json:"method"`
		DigitalMethod      *string              `json:"digital_method"`
		DigitalMethodCamel *string              `json:"digitalMethod"`
		Reference          *string              `json:"reference"`
		MarkCashPaid       bool                 `json:"mark_cash_paid"`
		MarkCashPaidCamel  *bool                `json:"markCashPaid"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	if body.DigitalMethod == nil {
		body.DigitalMethod = body.DigitalMethodCamel
	}
	if body.MarkCashPaidCamel != nil {
		body.MarkCashPaid = *body.MarkCashPaidCamel
	}
	o, err := s.loadOrder(r.Context(), id)
	if err != nil {
		writeErr(w, 404, "not found")
		return
	}
	status := orders.InitialPaymentStatus(o.OrderType, body.Method, body.MarkCashPaid)
	if body.Method == models.PayDigital {
		status = models.PayPendingVerification
	}
	_, err = s.Pool.Exec(r.Context(), `
		UPDATE payments SET method=$1, digital_method=$2, reference=$3, updated_at=now() WHERE order_id=$4`,
		body.Method, body.DigitalMethod, body.Reference, id)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	_, _ = s.Pool.Exec(r.Context(), `UPDATE orders SET payment_status=$1, updated_at=now() WHERE id=$2`, status, id)
	_ = s.Log.Write(r.Context(), &c.StaffID, c.Name, "payment_submit", "order", id.String(), map[string]any{"status": status})
	o2, _ := s.loadOrder(r.Context(), id)
	s.Hub.BroadcastOrder(id.String(), "order.updated", dto.OrderAPI(o2))
	writeJSON(w, 200, dto.OrderAPI(o2))
}

func (s *Server) staffVerifyPayment(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	id, err := uuid.Parse(chiURLParam(r, "id"))
	if err != nil {
		writeErr(w, 400, "bad id")
		return
	}
	_, err = s.Pool.Exec(r.Context(), `
		UPDATE payments SET verified_by=$1, verified_at=now(), updated_at=now() WHERE order_id=$2`, c.StaffID, id)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	_, _ = s.Pool.Exec(r.Context(), `UPDATE orders SET payment_status='paid', updated_at=now() WHERE id=$1`, id)
	_ = s.Log.Write(r.Context(), &c.StaffID, c.Name, "payment_verify", "order", id.String(), nil)
	o2, _ := s.loadOrder(r.Context(), id)
	s.Hub.BroadcastOrder(id.String(), "order.updated", dto.OrderAPI(o2))
	writeJSON(w, 200, dto.OrderAPI(o2))
}

func (s *Server) staffRejectPayment(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	id, err := uuid.Parse(chiURLParam(r, "id"))
	if err != nil {
		writeErr(w, 400, "bad id")
		return
	}
	_, _ = s.Pool.Exec(r.Context(), `UPDATE orders SET payment_status='rejected', updated_at=now() WHERE id=$1`, id)
	_ = s.Log.Write(r.Context(), &c.StaffID, c.Name, "payment_reject", "order", id.String(), nil)
	o2, _ := s.loadOrder(r.Context(), id)
	s.Hub.BroadcastOrder(id.String(), "order.updated", dto.OrderAPI(o2))
	writeJSON(w, 200, dto.OrderAPI(o2))
}

func (s *Server) loadOrder(ctx context.Context, id uuid.UUID) (*models.Order, error) {
	var o models.Order
	var addr, cancel *string
	var tableID *uuid.UUID
	var tableLabel *string
	err := s.Pool.QueryRow(ctx, `
		SELECT o.id, o.order_number, o.order_type, o.order_status, o.payment_status,
			o.customer_name, o.customer_phone, o.delivery_address, o.table_id, t.label,
			o.notes, o.subtotal_etb::float8, COALESCE(o.tax_etb,0)::float8,
			COALESCE(o.service_charge_etb,0)::float8, COALESCE(o.delivery_fee_etb,0)::float8,
			o.total_etb::float8, o.taken_by, o.cancel_reason,
			o.created_at, o.updated_at
		FROM orders o
		LEFT JOIN cafe_tables t ON t.id=o.table_id
		WHERE o.id=$1`, id).Scan(
		&o.ID, &o.OrderNumber, &o.OrderType, &o.OrderStatus, &o.PaymentStatus,
		&o.CustomerName, &o.CustomerPhone, &addr, &tableID, &tableLabel,
		&o.Notes, &o.SubtotalETB, &o.TaxETB, &o.ServiceChargeETB, &o.DeliveryFeeETB,
		&o.TotalETB, &o.TakenBy, &cancel,
		&o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	o.DeliveryAddress, o.TableID, o.TableLabel, o.CancelReason = addr, tableID, tableLabel, cancel
	o.KitchenVisible = orders.KitchenVisible(o.OrderType, o.PaymentStatus, o.OrderStatus)

	rows, err := s.Pool.Query(ctx, `
		SELECT id, menu_item_id, product_id, name_snapshot, unit_price_etb::float8, qty, note
		FROM order_items WHERE order_id=$1`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var it models.OrderItem
		if err := rows.Scan(&it.ID, &it.MenuItemID, &it.ProductID, &it.NameSnapshot, &it.UnitPriceETB, &it.Qty, &it.Note); err != nil {
			return nil, err
		}
		o.Items = append(o.Items, it)
	}

	var p models.Payment
	err = s.Pool.QueryRow(ctx, `
		SELECT id, order_id, method, digital_method, reference, verified_by, verified_at
		FROM payments WHERE order_id=$1`, id).Scan(
		&p.ID, &p.OrderID, &p.Method, &p.DigitalMethod, &p.Reference, &p.VerifiedBy, &p.VerifiedAt)
	if err == nil {
		o.Payment = &p
	} else if err != pgx.ErrNoRows {
		return nil, err
	}
	return &o, nil
}

func (s *Server) publicOrderStream(w http.ResponseWriter, r *http.Request) {
	id := chiURLParam(r, "id")
	flusher, ok := w.(http.Flusher)
	if !ok {
		writeErr(w, 500, "stream unsupported")
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	ch := s.Hub.SubscribeOrder(id)
	defer s.Hub.UnsubscribeOrder(id, ch)
	notify := r.Context().Done()
	for {
		select {
		case <-notify:
			return
		case msg := <-ch:
			sse.WriteSSE(w, flusher, msg)
		}
	}
}

func (s *Server) staffStream(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		writeErr(w, 500, "stream unsupported")
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	ch := s.Hub.SubscribeStaff()
	defer s.Hub.UnsubscribeStaff(ch)
	notify := r.Context().Done()
	for {
		select {
		case <-notify:
			return
		case msg := <-ch:
			sse.WriteSSE(w, flusher, msg)
		}
	}
}

type errMsg string

func (e errMsg) Error() string { return string(e) }

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [12]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}
