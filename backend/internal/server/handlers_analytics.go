package server

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// ═══════════════════════════════════════════════════════════════════════
// Analytics Types
// ═══════════════════════════════════════════════════════════════════════

type AnalyticsPeriod struct {
	Start string `json:"start"`
	End   string `json:"end"`
}

type PeriodComparison struct {
	Current    AnalyticsPeriod `json:"current"`
	Comparison AnalyticsPeriod `json:"comparison,omitempty"`
}

type MetricDelta struct {
	Current  float64 `json:"current"`
	Previous float64 `json:"previous"`
	Delta    float64 `json:"delta"`
	PctChange float64 `json:"pctChange"`
}

type OverviewResponse struct {
	Revenue         MetricDelta    `json:"revenue"`
	Orders          MetricDelta    `json:"orders"`
	AvgTicket       MetricDelta    `json:"avgTicket"`
	UnpaidAmount    float64        `json:"unpaidAmount"`
	ActiveTables    int            `json:"activeTables"`
	PreparingOrders int            `json:"preparingOrders"`
	ReadyOrders     int            `json:"readyOrders"`
	UnpaidOrders    int            `json:"unpaidOrders"`
	PendingRequests int            `json:"pendingRequests"`
	RevenueTrend    []TrendPoint   `json:"revenueTrend"`
	TopSellers      []TopSeller    `json:"topSellers"`
	RecentActivity  []ActivityItem `json:"recentActivity"`
}

type TrendPoint struct {
	Label   string  `json:"label"`
	Value   float64 `json:"value"`
	Compare float64 `json:"compare,omitempty"`
}

type TopSeller struct {
	Name     string  `json:"name"`
	Category string  `json:"category"`
	Units    int     `json:"units"`
	Revenue  float64 `json:"revenue"`
}

type ActivityItem struct {
	Time      string `json:"time"`
	Action    string `json:"action"`
	Staff     string `json:"staff"`
	Entity    string `json:"entity"`
	EntityType string `json:"entityType"`
}

type SalesAnalytics struct {
	Revenue        MetricDelta        `json:"revenue"`
	Orders         MetricDelta        `json:"orders"`
	AvgTicket      MetricDelta        `json:"avgTicket"`
	ItemsSold      MetricDelta        `json:"itemsSold"`
	RevenueTrend   []TrendPoint       `json:"revenueTrend"`
	HourlySales    []HourlySalesPoint `json:"hourlySales"`
	CategorySales  []CategorySales    `json:"categorySales"`
	BestDay        string             `json:"bestDay"`
	WorstDay       string             `json:"worstDay"`
	BestHour       string             `json:"bestHour"`
	WorstHour      string             `json:"worstHour"`
}

type HourlySalesPoint struct {
	Hour    int     `json:"hour"`
	Revenue float64 `json:"revenue"`
	Orders  int     `json:"orders"`
}

type CategorySales struct {
	Category string  `json:"category"`
	Units    int     `json:"units"`
	Revenue  float64 `json:"revenue"`
	Share    float64 `json:"share"`
}

type MenuAnalytics struct {
	TotalItemsSold int           `json:"totalItemsSold"`
	MenuRevenue    float64       `json:"menuRevenue"`
	BestSeller     string        `json:"bestSeller"`
	Items          []MenuItemAnalytics `json:"items"`
	RetailItems    []MenuItemAnalytics `json:"RetailItems"`
}

type MenuItemAnalytics struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Category    string  `json:"category"`
	Type        string  `json:"type"` // "prepared" or "retail"
	UnitsSold   int     `json:"unitsSold"`
	Revenue     float64 `json:"revenue"`
	AvgPrice    float64 `json:"avgPrice"`
	Share       float64 `json:"share"`
}

type PaymentAnalytics struct {
	Collected     float64           `json:"collected"`
	Outstanding   float64           `json:"outstanding"`
	PaymentCount  int               `json:"paymentCount"`
	AvgPayment    float64           `json:"avgPayment"`
	Methods       []PaymentMethodBreakdown   `json:"methods"`
}

type PaymentMethodBreakdown struct {
	Method       string  `json:"method"`
	Transactions int     `json:"transactions"`
	Amount       float64 `json:"amount"`
	Share        float64 `json:"share"`
}

// ═══════════════════════════════════════════════════════════════════════
// Period Helpers
// ═══════════════════════════════════════════════════════════════════════

func parsePeriod(r *http.Request) (start, end, compStart, compEnd string) {
	loc := time.FixedZone("EAT", 3*3600) // Africa/Addis_Ababa
	now := time.Now().In(loc)
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)

	period := r.URL.Query().Get("period")
	switch period {
	case "yesterday":
		yesterday := today.AddDate(0, 0, -1)
		start = yesterday.Format("2006-01-02")
		end = yesterday.Format("2006-01-02")
		dayBefore := yesterday.AddDate(0, 0, -1)
		compStart = dayBefore.Format("2006-01-02")
		compEnd = dayBefore.Format("2006-01-02")
	case "this_week":
		weekday := int(today.Weekday())
		if weekday == 0 {
			weekday = 7
		}
		weekStart := today.AddDate(0, 0, -(weekday - 1))
		start = weekStart.Format("2006-01-02")
		end = today.Format("2006-01-02")
		prevWeekEnd := weekStart.AddDate(0, 0, -1)
		prevWeekStart := prevWeekEnd.AddDate(0, 0, -6)
		compStart = prevWeekStart.Format("2006-01-02")
		compEnd = prevWeekEnd.Format("2006-01-02")
	case "last_week":
		weekday := int(today.Weekday())
		if weekday == 0 {
			weekday = 7
		}
		thisWeekStart := today.AddDate(0, 0, -(weekday - 1))
		lastWeekEnd := thisWeekStart.AddDate(0, 0, -1)
		lastWeekStart := lastWeekEnd.AddDate(0, 0, -6)
		start = lastWeekStart.Format("2006-01-02")
		end = lastWeekEnd.Format("2006-01-02")
		prevWeekEnd2 := lastWeekStart.AddDate(0, 0, -1)
		prevWeekStart2 := prevWeekEnd2.AddDate(0, 0, -6)
		compStart = prevWeekStart2.Format("2006-01-02")
		compEnd = prevWeekEnd2.Format("2006-01-02")
	case "this_month":
		monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, loc)
		start = monthStart.Format("2006-01-02")
		end = today.Format("2006-01-02")
		prevMonthEnd := monthStart.AddDate(0, 0, -1)
		prevMonthStart := time.Date(prevMonthEnd.Year(), prevMonthEnd.Month(), 1, 0, 0, 0, 0, loc)
		compStart = prevMonthStart.Format("2006-01-02")
		compEnd = prevMonthEnd.Format("2006-01-02")
	case "last_month":
		monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, loc)
		lastMonthEnd := monthStart.AddDate(0, 0, -1)
		lastMonthStart := time.Date(lastMonthEnd.Year(), lastMonthEnd.Month(), 1, 0, 0, 0, 0, loc)
		start = lastMonthStart.Format("2006-01-02")
		end = lastMonthEnd.Format("2006-01-02")
		prevMonthEnd2 := lastMonthStart.AddDate(0, 0, -1)
		prevMonthStart2 := time.Date(prevMonthEnd2.Year(), prevMonthEnd2.Month(), 1, 0, 0, 0, 0, loc)
		compStart = prevMonthStart2.Format("2006-01-02")
		compEnd = prevMonthEnd2.Format("2006-01-02")
	case "this_year":
		yearStart := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, loc)
		start = yearStart.Format("2006-01-02")
		end = today.Format("2006-01-02")
		prevYearEnd := yearStart.AddDate(0, 0, -1)
		prevYearStart := time.Date(prevYearEnd.Year(), 1, 1, 0, 0, 0, 0, loc)
		compStart = prevYearStart.Format("2006-01-02")
		compEnd = prevYearEnd.Format("2006-01-02")
	case "custom":
		start = r.URL.Query().Get("start")
		end = r.URL.Query().Get("end")
		compStart = r.URL.Query().Get("comp_start")
		compEnd = r.URL.Query().Get("comp_end")
		if start == "" {
			start = today.AddDate(0, 0, -30).Format("2006-01-02")
		}
		if end == "" {
			end = today.Format("2006-01-02")
		}
		if start > end {
			start, end = end, start
		}
	default: // today
		start = today.Format("2006-01-02")
		end = today.Format("2006-01-02")
		yesterday := today.AddDate(0, 0, -1)
		compStart = yesterday.Format("2006-01-02")
		compEnd = yesterday.Format("2006-01-02")
	}
	return
}

// ═══════════════════════════════════════════════════════════════════════
// Analytics Endpoints
// ═══════════════════════════════════════════════════════════════════════

// GET /analytics/overview
func (s *Server) getAnalyticsOverview(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	start, end, compStart, compEnd := parsePeriod(r)

	var resp OverviewResponse

	// Current period revenue
	var revCurStr string
	_ = s.Pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(total)::text, '0') FROM orders
		WHERE status NOT IN ('CANCELLED','DRAFT')
		AND created_at::date BETWEEN $1::date AND $2::date`, start, end).Scan(&revCurStr)
	resp.Revenue.Current = safeScanFloat(revCurStr)

	// Previous period revenue
	if compStart != "" && compEnd != "" {
		var revPrevStr string
		_ = s.Pool.QueryRow(ctx, `
			SELECT COALESCE(SUM(total)::text, '0') FROM orders
			WHERE status NOT IN ('CANCELLED','DRAFT')
			AND created_at::date BETWEEN $1::date AND $2::date`, compStart, compEnd).Scan(&revPrevStr)
		resp.Revenue.Previous = safeScanFloat(revPrevStr)
	}

	// Current period orders
	_ = s.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM orders
		WHERE status NOT IN ('CANCELLED','DRAFT')
		AND created_at::date BETWEEN $1 AND $2`, start, end).Scan(&resp.Orders.Current)

	// Previous period orders
	if compStart != "" && compEnd != "" {
		_ = s.Pool.QueryRow(ctx, `
			SELECT COUNT(*) FROM orders
			WHERE status NOT IN ('CANCELLED','DRAFT')
			AND created_at::date BETWEEN $1 AND $2`, compStart, compEnd).Scan(&resp.Orders.Previous)
	}

	// Calculate deltas
	resp.Revenue.Delta = resp.Revenue.Current - resp.Revenue.Previous
	resp.Orders.Delta = resp.Orders.Current - resp.Orders.Previous
	if resp.Revenue.Previous > 0 {
		resp.Revenue.PctChange = (resp.Revenue.Delta / resp.Revenue.Previous) * 100
	}
	if resp.Orders.Previous > 0 {
		resp.Orders.PctChange = (resp.Orders.Delta / resp.Orders.Previous) * 100
	}
	if resp.Orders.Current > 0 {
		resp.AvgTicket.Current = resp.Revenue.Current / resp.Orders.Current
	}
	if resp.Orders.Previous > 0 {
		resp.AvgTicket.Previous = resp.Revenue.Previous / resp.Orders.Previous
	}
	resp.AvgTicket.Delta = resp.AvgTicket.Current - resp.AvgTicket.Previous
	if resp.AvgTicket.Previous > 0 {
		resp.AvgTicket.PctChange = (resp.AvgTicket.Delta / resp.AvgTicket.Previous) * 100
	}

	// Unpaid amount
	var unpaidStr string
	_ = s.Pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(total)::text, '0') FROM orders
		WHERE payment_status != 'PAID' AND status NOT IN ('CANCELLED','DRAFT')
		AND created_at::date BETWEEN $1::date AND $2::date`, start, end).Scan(&unpaidStr)
	resp.UnpaidAmount = safeScanFloat(unpaidStr)

	// Live operational metrics
	_ = s.Pool.QueryRow(ctx, `
		SELECT COUNT(DISTINCT table_id) FROM orders
		WHERE status IN ('PENDING','PREPARING','READY','SERVED')
		AND table_id IS NOT NULL AND table_id != ''`).Scan(&resp.ActiveTables)

	_ = s.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM orders
		WHERE status = 'PREPARING'`).Scan(&resp.PreparingOrders)

	_ = s.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM orders
		WHERE status = 'READY'`).Scan(&resp.ReadyOrders)

	_ = s.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM orders
		WHERE payment_status != 'PAID' AND status NOT IN ('CANCELLED','DRAFT','COMPLETED')`).Scan(&resp.UnpaidOrders)

	_ = s.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM service_requests
		WHERE status = 'PENDING'`).Scan(&resp.PendingRequests)

	// Revenue trend
	resp.RevenueTrend = s.getRevenueTrend(ctx, start, end, compStart, compEnd)

	// Top sellers
	resp.TopSellers = s.getTopSellers(ctx, start, end, 5)

	// Recent activity
	resp.RecentActivity = s.getRecentActivity(ctx, 10)

	writeJSON(w, 200, resp)
}

// GET /analytics/sales
func (s *Server) getAnalyticsSales(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	start, end, compStart, compEnd := parsePeriod(r)

	var resp SalesAnalytics

	// Revenue
	var revCurStr string
	_ = s.Pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(total)::text, '0') FROM orders
		WHERE status NOT IN ('CANCELLED','DRAFT')
		AND created_at::date BETWEEN $1::date AND $2::date`, start, end).Scan(&revCurStr)
	resp.Revenue.Current = safeScanFloat(revCurStr)
	if compStart != "" && compEnd != "" {
		var revPrevStr string
		_ = s.Pool.QueryRow(ctx, `
			SELECT COALESCE(SUM(total)::text, '0') FROM orders
			WHERE status NOT IN ('CANCELLED','DRAFT')
			AND created_at::date BETWEEN $1::date AND $2::date`, compStart, compEnd).Scan(&revPrevStr)
		resp.Revenue.Previous = safeScanFloat(revPrevStr)
	}
	resp.Revenue.Delta = resp.Revenue.Current - resp.Revenue.Previous
	if resp.Revenue.Previous > 0 {
		resp.Revenue.PctChange = (resp.Revenue.Delta / resp.Revenue.Previous) * 100
	}

	// Orders
	_ = s.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM orders
		WHERE status NOT IN ('CANCELLED','DRAFT')
		AND created_at::date BETWEEN $1 AND $2`, start, end).Scan(&resp.Orders.Current)
	if compStart != "" && compEnd != "" {
		_ = s.Pool.QueryRow(ctx, `
			SELECT COUNT(*) FROM orders
			WHERE status NOT IN ('CANCELLED','DRAFT')
			AND created_at::date BETWEEN $1 AND $2`, compStart, compEnd).Scan(&resp.Orders.Previous)
	}
	resp.Orders.Delta = resp.Orders.Current - resp.Orders.Previous
	if resp.Orders.Previous > 0 {
		resp.Orders.PctChange = (resp.Orders.Delta / resp.Orders.Previous) * 100
	}

	// Items sold
	_ = s.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		WHERE o.status NOT IN ('CANCELLED','DRAFT')
		AND o.created_at::date BETWEEN $1::date AND $2::date`, start, end).Scan(&resp.ItemsSold.Current)
	if compStart != "" && compEnd != "" {
		_ = s.Pool.QueryRow(ctx, `
			SELECT COUNT(*) FROM order_items oi
			JOIN orders o ON o.id = oi.order_id
			WHERE o.status NOT IN ('CANCELLED','DRAFT')
			AND o.created_at::date BETWEEN $1::date AND $2::date`, compStart, compEnd).Scan(&resp.ItemsSold.Previous)
	}
	resp.ItemsSold.Delta = resp.ItemsSold.Current - resp.ItemsSold.Previous
	if resp.ItemsSold.Previous > 0 {
		resp.ItemsSold.PctChange = (resp.ItemsSold.Delta / resp.ItemsSold.Previous) * 100
	}

	// Avg ticket
	if resp.Orders.Current > 0 {
		resp.AvgTicket.Current = resp.Revenue.Current / resp.Orders.Current
	}
	if resp.Orders.Previous > 0 {
		resp.AvgTicket.Previous = resp.Revenue.Previous / resp.Orders.Previous
	}
	resp.AvgTicket.Delta = resp.AvgTicket.Current - resp.AvgTicket.Previous
	if resp.AvgTicket.Previous > 0 {
		resp.AvgTicket.PctChange = (resp.AvgTicket.Delta / resp.AvgTicket.Previous) * 100
	}

	// Revenue trend
	resp.RevenueTrend = s.getRevenueTrend(ctx, start, end, compStart, compEnd)

	// Hourly sales
	resp.HourlySales = s.getHourlySales(ctx, start, end)

	// Category sales
	resp.CategorySales = s.getCategorySales(ctx, start, end)

	writeJSON(w, 200, resp)
}

// GET /analytics/menu
func (s *Server) getAnalyticsMenu(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	start, end, _, _ := parsePeriod(r)

	var resp MenuAnalytics

	// Total items sold
	_ = s.Pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		WHERE o.status NOT IN ('CANCELLED','DRAFT')
		AND (o.created_at AT TIME ZONE 'Africa/Addis_Ababa')::date BETWEEN $1::date AND $2::date`, start, end).Scan(&resp.TotalItemsSold)

	// Menu revenue
	var menuRevStr string
	_ = s.Pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(o.total)::text, '0') FROM orders o
		WHERE o.status NOT IN ('CANCELLED','DRAFT')
		AND (o.created_at AT TIME ZONE 'Africa/Addis_Ababa')::date BETWEEN $1::date AND $2::date`, start, end).Scan(&menuRevStr)
	resp.MenuRevenue = safeScanFloat(menuRevStr)

	// Item performance
	rows, err := s.Pool.Query(ctx, `
		SELECT oi.menu_item_id, oi.name,
			COALESCE(mc.name, 'General') as category,
			COALESCE(mc.id, '') as category_id,
			SUM(oi.quantity) as units,
			COALESCE(SUM(oi.price * oi.quantity)::text, '0') as revenue,
			COALESCE(AVG(oi.price)::text, '0') as avg_price
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		LEFT JOIN menu_items m ON m.id = oi.menu_item_id
		LEFT JOIN menu_categories mc ON mc.id = m.category_id
		WHERE o.status NOT IN ('CANCELLED','DRAFT')
		AND (o.created_at AT TIME ZONE 'Africa/Addis_Ababa')::date BETWEEN $1::date AND $2::date
		GROUP BY oi.menu_item_id, oi.name, mc.name, mc.id
		ORDER BY SUM(oi.price * oi.quantity) DESC
		LIMIT 100`, start, end)

	resp.Items = make([]MenuItemAnalytics, 0)
	if err == nil {
		for rows.Next() {
			var item MenuItemAnalytics
			var catID, revStr, avgStr string
			if err := rows.Scan(&item.ID, &item.Name, &item.Category, &catID, &item.UnitsSold, &revStr, &avgStr); err != nil {
				continue
			}
			item.Revenue = safeScanFloat(revStr)
			item.AvgPrice = safeScanFloat(avgStr)
			if strings.HasPrefix(catID, "cat-shop") || strings.HasPrefix(item.ID, "shop-") {
				item.Type = "retail"
			} else {
				item.Type = "prepared"
			}
			if resp.MenuRevenue > 0 {
				item.Share = (item.Revenue / resp.MenuRevenue) * 100
			}
			resp.Items = append(resp.Items, item)
		}
		rows.Close()
	}

	if len(resp.Items) > 0 {
		resp.BestSeller = resp.Items[0].Name
	}

	writeJSON(w, 200, resp)
}

// GET /analytics/payments
func (s *Server) getAnalyticsPayments(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	start, end, _, _ := parsePeriod(r)

	var resp PaymentAnalytics

	// Collected
	var collectedStr string
	_ = s.Pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(amount)::text, '0') FROM payments
		WHERE status IN ('PAID', 'COMPLETED')
		AND (created_at AT TIME ZONE 'Africa/Addis_Ababa')::date BETWEEN $1::date AND $2::date`, start, end).Scan(&collectedStr)
	resp.Collected = safeScanFloat(collectedStr)

	// Outstanding
	var outstandingStr string
	_ = s.Pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(total)::text, '0') FROM orders
		WHERE payment_status != 'PAID'
		AND status NOT IN ('CANCELLED','DRAFT','COMPLETED')
		AND (created_at AT TIME ZONE 'Africa/Addis_Ababa')::date BETWEEN $1::date AND $2::date`, start, end).Scan(&outstandingStr)
	resp.Outstanding = safeScanFloat(outstandingStr)

	// Payment count
	_ = s.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM payments
		WHERE status IN ('PAID', 'COMPLETED')
		AND (created_at AT TIME ZONE 'Africa/Addis_Ababa')::date BETWEEN $1::date AND $2::date`, start, end).Scan(&resp.PaymentCount)

	if resp.PaymentCount > 0 {
		resp.AvgPayment = resp.Collected / float64(resp.PaymentCount)
	}

	// Methods breakdown
	resp.Methods = s.getPaymentMethods(ctx, start, end, resp.Collected)

	writeJSON(w, 200, resp)
}// ═══════════════════════════════════════════════════════════════════════
// Helper Queries
// ═══════════════════════════════════════════════════════════════════════

// safeScanFloat reads a PostgreSQL numeric column as text then parses to float64.
// This avoids pgx NUMERIC → float64 scan failures that silently drop rows.
func safeScanFloat(s string) float64 {
	var v float64
	fmt.Sscanf(s, "%f", &v)
	return v
}

func (s *Server) getRevenueTrend(ctx context.Context, start, end, compStart, compEnd string) []TrendPoint {
	points := make([]TrendPoint, 0)

	if start == end {
		// Single-day period: return 24 hourly buckets for detailed intraday trend
		rows, err := s.Pool.Query(ctx, `
			SELECT EXTRACT(HOUR FROM (created_at AT TIME ZONE 'Africa/Addis_Ababa'))::int as hour,
				COALESCE(SUM(total)::numeric, 0)::numeric
			FROM orders
			WHERE status NOT IN ('CANCELLED','DRAFT')
			AND (created_at AT TIME ZONE 'Africa/Addis_Ababa')::date = $1::date
			GROUP BY hour ORDER BY hour`, start)
		if err == nil {
			hourMap := make(map[int]float64)
			for rows.Next() {
				var h int
				var valStr string
				if err := rows.Scan(&h, &valStr); err == nil {
					hourMap[h] = safeScanFloat(valStr)
				}
			}
			rows.Close()

			compHourMap := make(map[int]float64)
			if compStart != "" {
				compRows, err := s.Pool.Query(ctx, `
					SELECT EXTRACT(HOUR FROM (created_at AT TIME ZONE 'Africa/Addis_Ababa'))::int as hour,
						COALESCE(SUM(total)::numeric, 0)::numeric
					FROM orders
					WHERE status NOT IN ('CANCELLED','DRAFT')
					AND (created_at AT TIME ZONE 'Africa/Addis_Ababa')::date = $1::date
					GROUP BY hour ORDER BY hour`, compStart)
				if err == nil {
					for compRows.Next() {
						var h int
						var valStr string
						if err := compRows.Scan(&h, &valStr); err == nil {
							compHourMap[h] = safeScanFloat(valStr)
						}
					}
					compRows.Close()
				}
			}

			for h := 0; h < 24; h++ {
				label := fmt.Sprintf("%02d:00", h)
				p := TrendPoint{Label: label, Value: hourMap[h]}
				if cv, ok := compHourMap[h]; ok {
					p.Compare = cv
				}
				points = append(points, p)
			}
			return points
		}
	}

	// Multi-day period: group by date
	rows, err := s.Pool.Query(ctx, `
		SELECT to_char((created_at AT TIME ZONE 'Africa/Addis_Ababa'), 'YYYY-MM-DD') as day,
			COALESCE(SUM(total)::numeric, 0)::numeric
		FROM orders
		WHERE status NOT IN ('CANCELLED','DRAFT')
		AND (created_at AT TIME ZONE 'Africa/Addis_Ababa')::date BETWEEN $1::date AND $2::date
		GROUP BY day ORDER BY day`, start, end)
	if err != nil {
		return points
	}
	defer rows.Close()

	dayMap := make(map[string]float64)
	for rows.Next() {
		var day string
		var valStr string
		if err := rows.Scan(&day, &valStr); err == nil {
			dayMap[day] = safeScanFloat(valStr)
		}
	}

	compMap := make(map[string]float64)
	if compStart != "" && compEnd != "" {
		compRows, err := s.Pool.Query(ctx, `
			SELECT to_char((created_at AT TIME ZONE 'Africa/Addis_Ababa'), 'YYYY-MM-DD') as day,
				COALESCE(SUM(total)::numeric, 0)::numeric
			FROM orders
			WHERE status NOT IN ('CANCELLED','DRAFT')
			AND (created_at AT TIME ZONE 'Africa/Addis_Ababa')::date BETWEEN $1::date AND $2::date
			GROUP BY day ORDER BY day`, compStart, compEnd)
		if err == nil {
			for compRows.Next() {
				var day string
				var valStr string
				if err := compRows.Scan(&day, &valStr); err == nil {
					compMap[day] = safeScanFloat(valStr)
				}
			}
			compRows.Close()
		}
	}

	// Zero-fill dates between start and end
	startDate, _ := time.Parse("2006-01-02", start)
	endDate, _ := time.Parse("2006-01-02", end)
	if startDate.Before(endDate) || startDate.Equal(endDate) {
		for d := startDate; !d.After(endDate); d = d.AddDate(0, 0, 1) {
			key := d.Format("2006-01-02")
			p := TrendPoint{Label: key, Value: dayMap[key]}
			if cv, ok := compMap[key]; ok {
				p.Compare = cv
			}
			points = append(points, p)
		}
	}

	return points
}

func (s *Server) getTopSellers(ctx context.Context, start, end string, limit int) []TopSeller {
	sellers := make([]TopSeller, 0)
	rows, err := s.Pool.Query(ctx, `
		SELECT oi.name, COALESCE(m.category, 'General') as category,
			SUM(oi.quantity) as units, COALESCE(SUM(oi.price * oi.quantity)::text, '0') as revenue
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		LEFT JOIN menu_items m ON m.id = oi.menu_item_id
		WHERE o.status NOT IN ('CANCELLED','DRAFT')
		AND (o.created_at AT TIME ZONE 'Africa/Addis_Ababa')::date BETWEEN $1::date AND $2::date
		GROUP BY oi.name, m.category
		ORDER BY SUM(oi.price * oi.quantity) DESC
		LIMIT $3`, start, end, limit)
	if err != nil {
		return sellers
	}
	defer rows.Close()

	for rows.Next() {
		var s TopSeller
		var revStr string
		if err := rows.Scan(&s.Name, &s.Category, &s.Units, &revStr); err != nil {
			continue
		}
		s.Revenue = safeScanFloat(revStr)
		sellers = append(sellers, s)
	}
	return sellers
}

func (s *Server) getHourlySales(ctx context.Context, start, end string) []HourlySalesPoint {
	points := make([]HourlySalesPoint, 0)
	rows, err := s.Pool.Query(ctx, `
		SELECT EXTRACT(HOUR FROM (created_at AT TIME ZONE 'Africa/Addis_Ababa'))::int as hour,
			COALESCE(SUM(total)::text, '0') as revenue,
			COUNT(*) as orders
		FROM orders
		WHERE status NOT IN ('CANCELLED','DRAFT')
		AND (created_at AT TIME ZONE 'Africa/Addis_Ababa')::date BETWEEN $1::date AND $2::date
		GROUP BY hour ORDER BY hour`, start, end)
	if err != nil {
		return points
	}
	defer rows.Close()

	hourMap := make(map[int]HourlySalesPoint)
	for rows.Next() {
		var p HourlySalesPoint
		var revStr string
		if err := rows.Scan(&p.Hour, &revStr, &p.Orders); err == nil {
			p.Revenue = safeScanFloat(revStr)
			hourMap[p.Hour] = p
		}
	}
	for h := 0; h < 24; h++ {
		if p, ok := hourMap[h]; ok {
			points = append(points, p)
		} else {
			points = append(points, HourlySalesPoint{Hour: h, Revenue: 0, Orders: 0})
		}
	}
	return points
}

func (s *Server) getCategorySales(ctx context.Context, start, end string) []CategorySales {
	cats := make([]CategorySales, 0)
	
	var totalRevenue float64
	var totalRevStr string
	_ = s.Pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(oi.price * oi.quantity)::text, '0')
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		WHERE o.status NOT IN ('CANCELLED','DRAFT')
		AND (o.created_at AT TIME ZONE 'Africa/Addis_Ababa')::date BETWEEN $1::date AND $2::date`, start, end).Scan(&totalRevStr)
	totalRevenue = safeScanFloat(totalRevStr)

	rows, err := s.Pool.Query(ctx, `
		SELECT COALESCE(m.category, 'Other') as category,
			SUM(oi.quantity) as units,
			COALESCE(SUM(oi.price * oi.quantity)::text, '0') as revenue
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		LEFT JOIN menu_items m ON m.id = oi.menu_item_id
		WHERE o.status NOT IN ('CANCELLED','DRAFT')
		AND (o.created_at AT TIME ZONE 'Africa/Addis_Ababa')::date BETWEEN $1::date AND $2::date
		GROUP BY category ORDER BY SUM(oi.price * oi.quantity) DESC`, start, end)
	if err != nil {
		return cats
	}
	defer rows.Close()

	for rows.Next() {
		var c CategorySales
		var revStr string
		if err := rows.Scan(&c.Category, &c.Units, &revStr); err != nil {
			continue
		}
		c.Revenue = safeScanFloat(revStr)
		if totalRevenue > 0 {
			c.Share = (c.Revenue / totalRevenue) * 100
		}
		cats = append(cats, c)
	}
	return cats
}

func (s *Server) getPaymentMethods(ctx context.Context, start, end string, total float64) []PaymentMethodBreakdown {
	methods := make([]PaymentMethodBreakdown, 0)
	rows, err := s.Pool.Query(ctx, `
		SELECT COALESCE(method, 'Unknown') as method,
			COUNT(*) as transactions,
			COALESCE(SUM(amount)::text, '0') as amount
		FROM payments
		WHERE status IN ('PAID', 'COMPLETED')
		AND (created_at AT TIME ZONE 'Africa/Addis_Ababa')::date BETWEEN $1::date AND $2::date
		GROUP BY method ORDER BY SUM(amount) DESC`, start, end)
	if err != nil {
		return methods
	}
	defer rows.Close()

	for rows.Next() {
		var m PaymentMethodBreakdown
		var amtStr string
		if err := rows.Scan(&m.Method, &m.Transactions, &amtStr); err != nil {
			continue
		}
		m.Amount = safeScanFloat(amtStr)
		if total > 0 {
			m.Share = (m.Amount / total) * 100
		}
		methods = append(methods, m)
	}
	return methods
}

func (s *Server) getRecentActivity(ctx context.Context, limit int) []ActivityItem {
	items := make([]ActivityItem, 0)
	rows, err := s.Pool.Query(ctx, `
		SELECT created_at::text, action, COALESCE(actor_name, 'System'), entity_type, entity_id
		FROM activity_logs
		ORDER BY created_at DESC
		LIMIT $1`, limit)
	if err != nil {
		return items
	}
	defer rows.Close()

	for rows.Next() {
		var item ActivityItem
		if err := rows.Scan(&item.Time, &item.Action, &item.Staff, &item.EntityType, &item.Entity); err == nil {
			items = append(items, item)
		}
	}
	return items
}


