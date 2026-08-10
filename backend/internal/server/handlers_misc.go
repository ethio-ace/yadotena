package server

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"yadotena/internal/dto"
	"yadotena/internal/models"
	"yadotena/internal/storage"
)

func cafeNow() time.Time {
	loc, err := time.LoadLocation("Africa/Addis_Ababa")
	if err != nil {
		return time.Now().UTC()
	}
	return time.Now().In(loc)
}

func (s *Server) analytics(w http.ResponseWriter, r *http.Request) {
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")
	if from == "" {
		from = cafeNow().Format("2006-01-02")
	}
	if to == "" {
		to = from
	}
	const cafeDay = `(created_at AT TIME ZONE 'Africa/Addis_Ababa')::date`
	var orderCount int
	var revenue float64
	_ = s.Pool.QueryRow(r.Context(), `
		SELECT COUNT(*), COALESCE(SUM(total_etb),0)::float8
		FROM orders
		WHERE payment_status='paid'
		  AND `+cafeDay+` >= $1::date AND `+cafeDay+` <= $2::date`, from, to).
		Scan(&orderCount, &revenue)

	byType := map[string]int{}
	rows, err := s.Pool.Query(r.Context(), `
		SELECT order_type, COUNT(*) FROM orders
		WHERE `+cafeDay+` >= $1::date AND `+cafeDay+` <= $2::date
		GROUP BY order_type`, from, to)
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
		SELECT oi.name_snapshot, SUM(oi.qty)::int, SUM(oi.qty*oi.unit_price_etb)::float8
		FROM order_items oi
		JOIN orders o ON o.id=oi.order_id
		WHERE o.payment_status='paid'
		  AND (o.created_at AT TIME ZONE 'Africa/Addis_Ababa')::date >= $1::date
		  AND (o.created_at AT TIME ZONE 'Africa/Addis_Ababa')::date <= $2::date
		GROUP BY oi.name_snapshot ORDER BY SUM(oi.qty) DESC LIMIT 10`, from, to)
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
		WHERE o.payment_status='paid'
		  AND (o.created_at AT TIME ZONE 'Africa/Addis_Ababa')::date >= $1::date
		  AND (o.created_at AT TIME ZONE 'Africa/Addis_Ababa')::date <= $2::date
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
		SELECT (created_at AT TIME ZONE 'Africa/Addis_Ababa')::date AS d,
		       COALESCE(SUM(total_etb) FILTER (WHERE order_type='dine_in'),0)::float8,
		       COALESCE(SUM(total_etb) FILTER (WHERE order_type='pickup'),0)::float8,
		       COALESCE(SUM(total_etb) FILTER (WHERE order_type='delivery'),0)::float8,
		       COALESCE(SUM(total_etb) FILTER (WHERE order_type IN ('shop_pickup','shop_delivery')),0)::float8,
		       COALESCE(SUM(total_etb),0)::float8
		FROM orders
		WHERE payment_status='paid'
		  AND (created_at AT TIME ZONE 'Africa/Addis_Ababa')::date >= $1::date
		  AND (created_at AT TIME ZONE 'Africa/Addis_Ababa')::date <= $2::date
		GROUP BY 1 ORDER BY 1`, from, to)
	if err == nil {
		defer rows4.Close()
		for rows4.Next() {
			var d time.Time
			var dineIn, takeaway, delivery, shop, rev float64
			if err := rows4.Scan(&d, &dineIn, &takeaway, &delivery, &shop, &rev); err == nil {
				key := d.Format("2006-01-02")
				dailyByDate[key] = map[string]float64{
					"dineIn": dineIn, "takeaway": takeaway, "delivery": delivery, "shop": shop, "revenue": rev,
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
			row := map[string]any{"date": key, "dineIn": 0.0, "takeaway": 0.0, "delivery": 0.0, "shop": 0.0, "revenue": 0.0}
			if v, ok := dailyByDate[key]; ok {
				row["dineIn"] = v["dineIn"]
				row["takeaway"] = v["takeaway"]
				row["delivery"] = v["delivery"]
				row["shop"] = v["shop"]
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
		writeErr(w, 500, err.Error())
		return
	}
	defer rows.Close()
	var list []models.ActivityLog
	for rows.Next() {
		var a models.ActivityLog
		var meta []byte
		if err := rows.Scan(&a.ID, &a.ActorID, &a.ActorName, &a.Action, &a.EntityType, &a.EntityID, &meta, &a.CreatedAt); err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		_ = json.Unmarshal(meta, &a.Metadata)
		if a.Metadata == nil {
			a.Metadata = map[string]any{}
		}
		list = append(list, a)
	}
	writeJSON(w, 200, list)
}

func (s *Server) presignUpload(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ContentType string `json:"content_type"`
		Filename    string `json:"filename"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	r2 := storage.R2Config{
		AccountID:       s.Cfg.R2AccountID,
		AccessKeyID:     s.Cfg.R2AccessKeyID,
		SecretAccessKey: s.Cfg.R2SecretAccessKey,
		Bucket:          s.Cfg.R2Bucket,
		PublicBaseURL:   s.Cfg.R2PublicBaseURL,
		Endpoint:        s.Cfg.R2Endpoint,
	}
	if r2.Enabled() {
		res, err := storage.PresignPut(r.Context(), r2, body.ContentType, body.Filename, s.Cfg.UploadMaxBytes)
		if err != nil {
			writeErr(w, 400, err.Error())
			return
		}
		writeJSON(w, 200, map[string]any{
			"upload_url": res.UploadURL,
			"public_url": res.PublicURL,
			"headers":    res.Headers,
			"expires_in": res.ExpiresIn,
		})
		return
	}
	// Local/dev fallback (not for multi-instance hosts)
	ct := strings.ToLower(body.ContentType)
	if ct != "image/jpeg" && ct != "image/png" && ct != "image/webp" {
		writeErr(w, 400, "content_type must be jpeg/png/webp")
		return
	}
	id := uuid.New().String()
	ext := ".jpg"
	switch ct {
	case "image/png":
		ext = ".png"
	case "image/webp":
		ext = ".webp"
	}
	key := id + ext
	writeJSON(w, 200, map[string]any{
		"upload_url": "/api/v1/staff/uploads/" + key,
		"public_url": "/uploads/" + key,
		"headers":    map[string]string{"Content-Type": ct},
		"expires_in": 300,
	})
}

func (s *Server) putUpload(w http.ResponseWriter, r *http.Request) {
	if s.Cfg.R2AccountID != "" {
		writeErr(w, 400, "use Cloudflare R2 presigned URL for uploads")
		return
	}
	name := chiURLParam(r, "id")
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
