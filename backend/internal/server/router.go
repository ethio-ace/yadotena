package server

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"yadotena/internal/models"
)

func (s *Server) Router() http.Handler {
	r := chi.NewRouter()
	r.Use(chimw.RequestID, chimw.RealIP, chimw.Logger, chimw.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   splitOrigins(s.Cfg.CORSOrigins),
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Cheap liveness for Render / cron-job.org / GitHub Actions — no DB/Redis.
	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, 200, map[string]any{"ok": true})
	})
	// Optional readiness (dependency check) — do not use for keep-alive pings.
	r.Get("/ready", func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		if err := s.Pool.Ping(ctx); err != nil {
			writeErr(w, 503, "db unavailable")
			return
		}
		writeJSON(w, 200, map[string]any{"ok": true, "db": true})
	})
	r.Handle("/uploads/*", http.StripPrefix("/uploads/", http.FileServer(http.Dir(s.Cfg.UploadsDir))))

	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/public", func(r chi.Router) {
			r.Get("/menu", s.publicMenu)
			r.Get("/products", s.publicProducts)
			r.Get("/tables", s.publicTables)
			r.Get("/settings", s.publicSettings)
			r.Post("/orders", s.publicPlaceOrder)
			r.Get("/orders/track", s.publicTrackOrder)
			r.Get("/orders/{id}/stream", s.publicOrderStream)
			r.Post("/service-requests", s.publicCreateServiceRequest)
			r.Post("/reviews", s.publicCreateReview)
		})

		r.Post("/staff/auth/login", s.staffLogin)

		r.Group(func(r chi.Router) {
			r.Use(s.withAuth)
			r.Get("/staff/me", s.staffMe)
			r.Patch("/staff/me", s.staffPatchMe)
			r.Get("/staff/stream", s.staffStream)

			r.With(s.requireRoles(models.RoleOwner, models.RoleManager, models.RoleWaiter, models.RoleChef)).Get("/staff/orders", s.staffListOrders)
			r.With(s.requireRoles(models.RoleOwner, models.RoleManager, models.RoleWaiter, models.RoleChef)).Get("/staff/orders/{id}", s.staffGetOrder)
			r.With(s.requireRoles(models.RoleOwner, models.RoleManager, models.RoleWaiter)).Post("/staff/orders", s.staffPlaceOrder)
			r.With(s.requireRoles(models.RoleOwner, models.RoleManager, models.RoleWaiter, models.RoleChef)).Patch("/staff/orders/{id}/status", s.staffPatchOrderStatus)
			r.With(s.requireRoles(models.RoleOwner, models.RoleManager, models.RoleWaiter)).Post("/staff/orders/{id}/payment", s.staffSubmitPayment)
			r.With(s.requireRoles(models.RoleOwner, models.RoleManager, models.RoleWaiter)).Post("/staff/orders/{id}/payment/verify", s.staffVerifyPayment)
			r.With(s.requireRoles(models.RoleOwner, models.RoleManager, models.RoleWaiter)).Post("/staff/orders/{id}/payment/reject", s.staffRejectPayment)
			r.With(s.requireRoles(models.RoleOwner, models.RoleManager, models.RoleWaiter)).Get("/staff/customers", s.listCustomers)

			r.With(s.requireRoles(models.RoleOwner, models.RoleManager, models.RoleWaiter)).Get("/staff/service-requests", s.listServiceRequests)
			r.With(s.requireRoles(models.RoleOwner, models.RoleManager, models.RoleWaiter)).Patch("/staff/service-requests/{id}/resolve", s.resolveServiceRequest)
			r.With(s.requireRoles(models.RoleOwner, models.RoleManager)).Get("/staff/reviews", s.listReviews)

			r.With(s.requireRoles(models.RoleOwner, models.RoleManager, models.RoleWaiter)).Route("/staff/categories", func(r chi.Router) {
				r.Get("/", s.listCategories)
				r.With(s.requireRoles(models.RoleOwner, models.RoleManager)).Post("/", s.createCategory)
				r.With(s.requireRoles(models.RoleOwner, models.RoleManager)).Patch("/{id}", s.patchCategory)
			})
			r.With(s.requireRoles(models.RoleOwner, models.RoleManager, models.RoleWaiter)).Route("/staff/items", func(r chi.Router) {
				r.Get("/", s.listItems)
				r.With(s.requireRoles(models.RoleOwner, models.RoleManager)).Post("/", s.createItem)
				r.With(s.requireRoles(models.RoleOwner, models.RoleManager)).Patch("/{id}", s.patchItem)
			})
			r.With(s.requireRoles(models.RoleOwner, models.RoleManager, models.RoleWaiter)).Route("/staff/product-categories", func(r chi.Router) {
				r.Get("/", s.listProductCategories)
				r.With(s.requireRoles(models.RoleOwner, models.RoleManager)).Post("/", s.createProductCategory)
				r.With(s.requireRoles(models.RoleOwner, models.RoleManager)).Patch("/{id}", s.patchProductCategory)
			})
			r.With(s.requireRoles(models.RoleOwner, models.RoleManager, models.RoleWaiter)).Route("/staff/products", func(r chi.Router) {
				r.Get("/", s.listProducts)
				r.With(s.requireRoles(models.RoleOwner, models.RoleManager)).Post("/", s.createProduct)
				r.With(s.requireRoles(models.RoleOwner, models.RoleManager)).Patch("/{id}", s.patchProduct)
			})
			r.With(s.requireRoles(models.RoleOwner, models.RoleManager, models.RoleWaiter)).Route("/staff/tables", func(r chi.Router) {
				r.Get("/", s.listTables)
				r.With(s.requireRoles(models.RoleOwner, models.RoleManager)).Post("/", s.createTable)
				r.With(s.requireRoles(models.RoleOwner, models.RoleManager)).Patch("/{id}", s.patchTable)
			})
			r.With(s.requireRoles(models.RoleOwner, models.RoleManager)).Route("/staff/staff", func(r chi.Router) {
				r.Get("/", s.listStaff)
				r.Post("/", s.createStaff)
				r.Patch("/{id}", s.patchStaff)
			})
			r.With(s.requireRoles(models.RoleOwner, models.RoleManager)).Get("/staff/analytics", s.analytics)
			r.With(s.requireRoles(models.RoleOwner, models.RoleManager)).Get("/staff/activity", s.listActivity)
			r.With(s.requireRoles(models.RoleOwner, models.RoleManager)).Route("/staff/expenses", func(r chi.Router) {
				r.Get("/", s.listExpenses)
				r.Post("/", s.createExpense)
				r.Patch("/{id}", s.patchExpense)
				r.Delete("/{id}", s.deleteExpense)
			})
			r.With(s.requireRoles(models.RoleOwner, models.RoleManager)).Post("/staff/uploads/presign", s.presignUpload)
			r.With(s.requireRoles(models.RoleOwner, models.RoleManager)).Put("/staff/uploads/{id}", s.putUpload)

			r.With(s.requireRoles(models.RoleOwner, models.RoleManager)).Get("/staff/settings", s.getSettings)
			r.With(s.requireRoles(models.RoleOwner)).Patch("/staff/settings", s.patchSettings)
		})
	})
	return r
}

func splitOrigins(s string) []string {
	parts := stringsSplitComma(s)
	if len(parts) == 0 {
		return []string{"http://localhost:3000"}
	}
	return parts
}

func stringsSplitComma(s string) []string {
	var out []string
	start := 0
	for i := 0; i <= len(s); i++ {
		if i == len(s) || s[i] == ',' {
			p := trimSpace(s[start:i])
			if p != "" {
				out = append(out, p)
			}
			start = i + 1
		}
	}
	return out
}

func trimSpace(s string) string {
	i, j := 0, len(s)
	for i < j && (s[i] == ' ' || s[i] == '\t') {
		i++
	}
	for j > i && (s[j-1] == ' ' || s[j-1] == '\t') {
		j--
	}
	return s[i:j]
}
