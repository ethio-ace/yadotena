package server

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"yadotena/internal/dto"
	"yadotena/internal/models"
)

func (s *Server) analytics(w http.ResponseWriter, r *http.Request) {
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")
	if from == "" {
		from = time.Now().Format("2006-01-02")
	}
	if to == "" {
		to = from
	}
	var orderCount int
	var revenue float64
	_ = s.Pool.QueryRow(r.Context(), `
		SELECT COUNT(*), COALESCE(SUM(total),0)::float8
		FROM orders
		WHERE payment_status='PAID' OR payment_status='paid'
		  AND created_at::date >= $1::date AND created_at::date <= $2::date`, from, to).
		Scan(&orderCount, &revenue)

	byType := map[string]int{}
	rows, err := s.Pool.Query(r.Context(), `
		SELECT type, COUNT(*) FROM orders
		WHERE created_at::date >= $1::date AND created_at::date <= $2::date
		GROUP BY type`, from, to)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var t string
			var c int
			_ = rows.Scan(&t, &c)
			byType[t] = c
		}
	}

	type top struct {
		Name string  `json:"name"`
		Qty  int     `json:"qty"`
		Rev  float64 `json:"revenue_etb"`
	}
	var tops []top
	rows2, err := s.Pool.Query(r.Context(), `
		SELECT oi.name, SUM(oi.quantity)::int, SUM(oi.quantity*oi.price)::float8
		FROM order_items oi
		JOIN orders o ON o.id=oi.order_id
		WHERE o.payment_status='PAID' OR o.payment_status='paid'
		  AND o.created_at::date >= $1::date AND o.created_at::date <= $2::date
		GROUP BY oi.name ORDER BY SUM(oi.quantity) DESC LIMIT 10`, from, to)
	if err == nil {
		defer rows2.Close()
		for rows2.Next() {
			var t top
			_ = rows2.Scan(&t.Name, &t.Qty, &t.Rev)
			tops = append(tops, t)
		}
	}

	payMix := map[string]int{}
	rows3, err := s.Pool.Query(r.Context(), `
		SELECT p.method, COUNT(*) FROM payments p
		JOIN orders o ON o.id=p.order_id
		WHERE o.payment_status='PAID' OR o.payment_status='paid'
		  AND o.created_at::date >= $1::date AND o.created_at::date <= $2::date
		GROUP BY p.method`, from, to)
	if err == nil {
		defer rows3.Close()
		for rows3.Next() {
			var m string
			var c int
			_ = rows3.Scan(&m, &c)
			payMix[m] = c
		}
	}

	byTypeAPI := map[string]int{}
	for k, v := range byType {
		byTypeAPI[dto.OrderTypeAPI(models.OrderType(k))] = v
	}

	dailyByDate := map[string]map[string]float64{}
	rows4, err := s.Pool.Query(r.Context(), `
		SELECT created_at::date AS d,
		       COALESCE(SUM(total) FILTER (WHERE type='DINE_IN' OR type='dine_in'),0)::float8,
		       COALESCE(SUM(total) FILTER (WHERE type='TAKEAWAY' OR type='pickup'),0)::float8,
		       COALESCE(SUM(total) FILTER (WHERE type='DELIVERY' OR type='delivery'),0)::float8,
		       COALESCE(SUM(total),0)::float8
		FROM orders
		WHERE payment_status='PAID' OR payment_status='paid'
		  AND created_at::date >= $1::date AND created_at::date <= $2::date
		GROUP BY 1 ORDER BY 1`, from, to)
	if err == nil {
		defer rows4.Close()
		for rows4.Next() {
			var d time.Time
			var dineIn, takeaway, delivery, rev float64
			if err := rows4.Scan(&d, &dineIn, &takeaway, &delivery, &rev); err == nil {
				key := d.Format("2006-01-02")
				dailyByDate[key] = map[string]float64{
					"dineIn": dineIn, "takeaway": takeaway, "delivery": delivery, "revenue": rev,
				}
			}
		}
	}
	daily := []map[string]any{}
	start, errFrom := time.Parse("2006-01-02", from)
	end, errTo := time.Parse("2006-01-02", to)
	if errFrom == nil && errTo == nil {
		for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
			key := d.Format("2006-01-02")
			row := map[string]any{"date": key, "dineIn": 0.0, "takeaway": 0.0, "delivery": 0.0, "revenue": 0.0}
			if v, ok := dailyByDate[key]; ok {
				row["dineIn"] = v["dineIn"]
				row["takeaway"] = v["takeaway"]
				row["delivery"] = v["delivery"]
				row["revenue"] = v["revenue"]
			}
			daily = append(daily, row)
		}
	}

	if tops == nil {
		tops = []top{}
	}

	writeJSON(w, 200, map[string]any{
		"from":             from,
		"to":               to,
		"paid_order_count": orderCount,
		"revenue_etb":      revenue,
		"by_order_type":    byTypeAPI,
		"byOrderType":      byTypeAPI,
		"top_items":        tops,
		"payment_mix":      payMix,
		"daily":            daily,
	})
}

func (s *Server) listActivity(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `
		SELECT id, actor_id, actor_name, action, entity_type, entity_id, metadata, created_at
		FROM activity_logs ORDER BY created_at DESC LIMIT 200`)
	if err != nil {
		writeJSON(w, 200, []models.ActivityLog{})
		return
	}
	defer rows.Close()
	var list []models.ActivityLog
	for rows.Next() {
		var a models.ActivityLog
		var meta []byte
		if err := rows.Scan(&a.ID, &a.ActorID, &a.ActorName, &a.Action, &a.EntityType, &a.EntityID, &meta, &a.CreatedAt); err == nil {
			_ = json.Unmarshal(meta, &a.Metadata)
			if a.Metadata == nil {
				a.Metadata = map[string]any{}
			}
			list = append(list, a)
		}
	}
	writeJSON(w, 200, list)
}

func (s *Server) presignUpload(w http.ResponseWriter, r *http.Request) {
	s.presignMediaUpload(w, r)
}

func (s *Server) putUpload(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "id")
	if strings.Contains(name, "..") || strings.Contains(name, "/") {
		writeErr(w, 400, "bad name")
		return
	}
	_ = os.MkdirAll(s.Cfg.UploadsDir, 0o755)
	path := filepath.Join(s.Cfg.UploadsDir, name)
	f, err := os.Create(path)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	defer f.Close()
	r.Body = http.MaxBytesReader(w, r.Body, s.Cfg.UploadMaxBytes)
	if _, err := io.Copy(f, r.Body); err != nil {
		writeErr(w, 400, "upload failed")
		return
	}
	writeJSON(w, 200, map[string]string{"public_url": "/uploads/" + name})
}

// --- Legacy Handlers Aliases & Adapters ---
func (s *Server) publicMenu(w http.ResponseWriter, r *http.Request)            { s.listMenuItems(w, r) }
func (s *Server) publicTables(w http.ResponseWriter, r *http.Request)          { s.listTables(w, r) }
func (s *Server) publicSettings(w http.ResponseWriter, r *http.Request)        { s.getSettings(w, r) }
func (s *Server) publicPlaceOrder(w http.ResponseWriter, r *http.Request)      { s.createOrderEndpoint(w, r) }
func (s *Server) publicTrackOrder(w http.ResponseWriter, r *http.Request)      { s.getOrder(w, r) }
func (s *Server) publicOrderStream(w http.ResponseWriter, _ *http.Request)     { writeJSON(w, 200, map[string]string{"status": "ok"}) }
func (s *Server) staffLogin(w http.ResponseWriter, r *http.Request)             { s.authLogin(w, r) }
func (s *Server) staffMe(w http.ResponseWriter, r *http.Request)                { s.authMe(w, r) }
func (s *Server) staffPatchMe(w http.ResponseWriter, r *http.Request)           { s.authMe(w, r) }
func (s *Server) staffStream(w http.ResponseWriter, _ *http.Request)            { writeJSON(w, 200, map[string]string{"status": "ok"}) }
func (s *Server) staffListOrders(w http.ResponseWriter, r *http.Request)        { s.listOrders(w, r) }
func (s *Server) staffGetOrder(w http.ResponseWriter, r *http.Request)         { s.getOrder(w, r) }
func (s *Server) staffPlaceOrder(w http.ResponseWriter, r *http.Request)       { s.createOrderEndpoint(w, r) }
func (s *Server) staffPatchOrderStatus(w http.ResponseWriter, r *http.Request) { s.updateOrderStatusEndpoint(w, r) }
func (s *Server) staffSubmitPayment(w http.ResponseWriter, r *http.Request)     { s.createPayment(w, r) }
func (s *Server) staffVerifyPayment(w http.ResponseWriter, r *http.Request)    { s.createPayment(w, r) }
func (s *Server) staffRejectPayment(w http.ResponseWriter, r *http.Request)    { s.createPayment(w, r) }
