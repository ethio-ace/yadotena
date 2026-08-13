package server

import (
	"net/http"
	"time"
)

type RestaurantSettings struct {
	RestaurantName       string    `json:"restaurantName"`
	Phone                string    `json:"phone"`
	Address              string    `json:"address"`
	ServiceChargePercent float64   `json:"serviceChargePercent"`
	VATPercent           float64   `json:"vatPercent"`
	GuestWiFiSSID        string    `json:"guestWifiSsid"`
	GuestWiFiPassword    string    `json:"guestWifiPassword"`
	TelebirrNo           string    `json:"telebirrNo"`
	TelebirrName         string    `json:"telebirrName"`
	CBEAccount           string    `json:"cbeAccount"`
	CBEName              string    `json:"cbeName"`
	BOAAccount           string    `json:"boaAccount"`
	BOAName              string    `json:"boaName"`
	EBirrAccount         string    `json:"ebirrAccount"`
	EBirrName            string    `json:"ebirrName"`
	UpdatedAt            time.Time `json:"updatedAt"`
}

type TopDish struct {
	Name        string  `json:"name"`
	OrdersCount int     `json:"ordersCount"`
	Revenue     float64 `json:"revenue"`
}

type SummaryReport struct {
	GrossRevenue    float64   `json:"grossRevenue"`
	TotalExpenses   float64   `json:"totalExpenses"`
	NetProfit       float64   `json:"netProfit"`
	OrdersCount     int       `json:"ordersCount"`
	CompletedOrders int       `json:"completedOrders"`
	AverageTicket   float64   `json:"averageTicket"`
	TopDishes       []TopDish `json:"topDishes"`
}

func (s *Server) getSettings(w http.ResponseWriter, r *http.Request) {
	var st RestaurantSettings
	err := s.Pool.QueryRow(r.Context(), `
		SELECT restaurant_name, phone, address, service_charge_percent::float8, vat_percent::float8, guest_wifi_ssid, guest_wifi_password,
		       COALESCE(telebirr_no, '0911234567'), COALESCE(telebirr_name, 'Yadotena Milk & Foods PLC'),
		       COALESCE(cbe_account, '1000123456789'), COALESCE(cbe_name, 'Yadotena Milk & Foods'),
		       COALESCE(boa_account, '987654321'), COALESCE(boa_name, 'Yadotena Milk & Foods'),
		       COALESCE(ebirr_account, '0911234567'), COALESCE(ebirr_name, 'Yadotena Milk & Foods PLC'),
		       updated_at
		FROM restaurant_settings WHERE id = 1`).Scan(
		&st.RestaurantName, &st.Phone, &st.Address, &st.ServiceChargePercent, &st.VATPercent, &st.GuestWiFiSSID, &st.GuestWiFiPassword,
		&st.TelebirrNo, &st.TelebirrName, &st.CBEAccount, &st.CBEName, &st.BOAAccount, &st.BOAName, &st.EBirrAccount, &st.EBirrName,
		&st.UpdatedAt,
	)

	if err != nil {
		st = RestaurantSettings{
			RestaurantName:       "Yadotena Milk & Foods",
			Phone:                "+251 91 123 4567",
			Address:              "Bole Road, Addis Ababa",
			ServiceChargePercent: 10.00,
			VATPercent:           15.00,
			GuestWiFiSSID:        "Yadotena_Milk_5G",
			GuestWiFiPassword:    "Yadotena2026",
			TelebirrNo:           "0911234567",
			TelebirrName:         "Yadotena Milk & Foods PLC",
			CBEAccount:           "1000123456789",
			CBEName:              "Yadotena Milk & Foods",
			BOAAccount:           "987654321",
			BOAName:              "Yadotena Milk & Foods",
			EBirrAccount:         "0911234567",
			EBirrName:            "Yadotena Milk & Foods PLC",
			UpdatedAt:            time.Now(),
		}
	}

	writeJSON(w, 200, st)
}

func (s *Server) updateSettings(w http.ResponseWriter, r *http.Request) {
	var body map[string]any
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid JSON body")
		return
	}

	var st RestaurantSettings
	_ = s.Pool.QueryRow(r.Context(), `
		SELECT restaurant_name, phone, address, service_charge_percent::float8, vat_percent::float8, guest_wifi_ssid, guest_wifi_password,
		       COALESCE(telebirr_no, '0911234567'), COALESCE(telebirr_name, 'Yadotena Milk & Foods PLC'),
		       COALESCE(cbe_account, '1000123456789'), COALESCE(cbe_name, 'Yadotena Milk & Foods'),
		       COALESCE(boa_account, '987654321'), COALESCE(boa_name, 'Yadotena Milk & Foods'),
		       COALESCE(ebirr_account, '0911234567'), COALESCE(ebirr_name, 'Yadotena Milk & Foods PLC'),
		       updated_at
		FROM restaurant_settings WHERE id = 1`).Scan(
		&st.RestaurantName, &st.Phone, &st.Address, &st.ServiceChargePercent, &st.VATPercent, &st.GuestWiFiSSID, &st.GuestWiFiPassword,
		&st.TelebirrNo, &st.TelebirrName, &st.CBEAccount, &st.CBEName, &st.BOAAccount, &st.BOAName, &st.EBirrAccount, &st.EBirrName,
		&st.UpdatedAt,
	)

	if name, ok := body["restaurantName"].(string); ok && name != "" {
		st.RestaurantName = name
	}
	if phone, ok := body["phone"].(string); ok {
		st.Phone = phone
	}
	if addr, ok := body["address"].(string); ok {
		st.Address = addr
	}
	if sc, ok := body["serviceChargePercent"].(float64); ok {
		st.ServiceChargePercent = sc
	}
	if vat, ok := body["vatPercent"].(float64); ok {
		st.VATPercent = vat
	}
	if ssid, ok := body["guestWifiSsid"].(string); ok {
		st.GuestWiFiSSID = ssid
	}
	if pass, ok := body["guestWifiPassword"].(string); ok {
		st.GuestWiFiPassword = pass
	}
	if tNo, ok := body["telebirrNo"].(string); ok {
		st.TelebirrNo = tNo
	}
	if tName, ok := body["telebirrName"].(string); ok {
		st.TelebirrName = tName
	}
	if cAcc, ok := body["cbeAccount"].(string); ok {
		st.CBEAccount = cAcc
	}
	if cName, ok := body["cbeName"].(string); ok {
		st.CBEName = cName
	}
	if bAcc, ok := body["boaAccount"].(string); ok {
		st.BOAAccount = bAcc
	}
	if bName, ok := body["boaName"].(string); ok {
		st.BOAName = bName
	}
	if eAcc, ok := body["ebirrAccount"].(string); ok {
		st.EBirrAccount = eAcc
	}
	if eName, ok := body["ebirrName"].(string); ok {
		st.EBirrName = eName
	}

	st.UpdatedAt = time.Now()

	_, _ = s.Pool.Exec(r.Context(), `
		INSERT INTO restaurant_settings (
			id, restaurant_name, phone, address, service_charge_percent, vat_percent, guest_wifi_ssid, guest_wifi_password,
			telebirr_no, telebirr_name, cbe_account, cbe_name, boa_account, boa_name, ebirr_account, ebirr_name, updated_at
		)
		VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		ON CONFLICT (id) DO UPDATE SET
			restaurant_name = EXCLUDED.restaurant_name,
			phone = EXCLUDED.phone,
			address = EXCLUDED.address,
			service_charge_percent = EXCLUDED.service_charge_percent,
			vat_percent = EXCLUDED.vat_percent,
			guest_wifi_ssid = EXCLUDED.guest_wifi_ssid,
			guest_wifi_password = EXCLUDED.guest_wifi_password,
			telebirr_no = EXCLUDED.telebirr_no,
			telebirr_name = EXCLUDED.telebirr_name,
			cbe_account = EXCLUDED.cbe_account,
			cbe_name = EXCLUDED.cbe_name,
			boa_account = EXCLUDED.boa_account,
			boa_name = EXCLUDED.boa_name,
			ebirr_account = EXCLUDED.ebirr_account,
			ebirr_name = EXCLUDED.ebirr_name,
			updated_at = EXCLUDED.updated_at`,
		st.RestaurantName, st.Phone, st.Address, st.ServiceChargePercent, st.VATPercent, st.GuestWiFiSSID, st.GuestWiFiPassword,
		st.TelebirrNo, st.TelebirrName, st.CBEAccount, st.CBEName, st.BOAAccount, st.BOAName, st.EBirrAccount, st.EBirrName,
		st.UpdatedAt,
	)

	writeJSON(w, 200, st)
}

func (s *Server) getReportsSummary(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var rep SummaryReport

	// Calculate gross revenue & completed orders
	_ = s.Pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(total), 0)::float8, COUNT(*)
		FROM orders WHERE status = 'COMPLETED'`).Scan(&rep.GrossRevenue, &rep.CompletedOrders)

	// Calculate total orders
	_ = s.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM orders`).Scan(&rep.OrdersCount)

	// Calculate total expenses
	_ = s.Pool.QueryRow(ctx, `SELECT COALESCE(SUM(amount), 0)::float8 FROM expenses`).Scan(&rep.TotalExpenses)

	rep.NetProfit = rep.GrossRevenue - rep.TotalExpenses

	if rep.CompletedOrders > 0 {
		rep.AverageTicket = rep.GrossRevenue / float64(rep.CompletedOrders)
	}

	// Calculate top dishes
	rows, err := s.Pool.Query(ctx, `
		SELECT name, SUM(quantity) as orders_count, SUM(price * quantity)::float8 as revenue
		FROM order_items
		GROUP BY name
		ORDER BY orders_count DESC, revenue DESC
		LIMIT 5`)

	rep.TopDishes = make([]TopDish, 0)
	if err == nil {
		for rows.Next() {
			var td TopDish
			if errScan := rows.Scan(&td.Name, &td.OrdersCount, &td.Revenue); errScan == nil {
				rep.TopDishes = append(rep.TopDishes, td)
			}
		}
		rows.Close()
	}

	writeJSON(w, 200, rep)
}
