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
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "Idempotency-Key"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health and Ready endpoints available at root and under /api/v1
	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, 200, map[string]any{"ok": true})
	})
	r.Get("/ready", func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		if err := s.Pool.Ping(ctx); err != nil {
			writeErr(w, 503, "db unavailable")
			return
		}
		writeJSON(w, 200, map[string]any{"ok": true, "db": true})
	})
	r.Get("/uploads/*", s.serveUploads)
	r.Get("/media-proxy", s.mediaProxy)

	// Single strict API v1 namespace - NO dual mounting at root
	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
			writeJSON(w, 200, map[string]any{"ok": true})
		})
		r.Get("/ready", func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			if err := s.Pool.Ping(ctx); err != nil {
				writeErr(w, 503, "db unavailable")
				return
			}
			writeJSON(w, 200, map[string]any{"ok": true, "db": true})
		})
		s.mountCoreRoutes(r)
	})

	return r
}

func (s *Server) mountCoreRoutes(r chi.Router) {
	// --- Public / Unauthenticated Endpoints ---
	r.Post("/login", s.authLogin)
	r.Post("/register", s.authRegister)

	r.Route("/auth", func(r chi.Router) {
		r.Post("/login", s.authLogin)
		r.Post("/register", s.authRegister)
		r.With(s.withAuth).Post("/logout", s.authLogout)
		r.With(s.withAuth).Get("/me", s.authMe)
		r.With(s.withAuth).Get("/ably-token", s.ablyToken)
	})

	// Public Read & Customer Action Routes
	r.Get("/menu", s.listMenuItems)
	r.Get("/menu/{id}", s.getMenuItem)
	r.Get("/menu/{id}/addons", s.getRespectiveAddonsForMenuItem)
	r.Get("/addons", s.listAddons)
	r.Get("/categories", s.listCategories)
	r.Get("/categories/{id}", s.getCategory)
	r.Get("/tables", s.listTables)
	r.Get("/tables/{id}", s.getTable)
	r.Get("/settings", s.getSettings)
	r.Get("/payment-methods", s.listPaymentMethods)
	r.Get("/payment-methods/{id}", s.getPaymentMethod)
	r.Post("/orders", s.createOrderEndpoint)
	r.Get("/orders/{id}", s.getOrder)
	r.Post("/service-requests", s.createServiceRequest)

	r.Get("/media/proxy", s.mediaProxy)
	r.Get("/media/asset", s.getMediaAssetByHash)
	r.Get("/uploads/*", s.serveUploads)

	r.Route("/public", func(r chi.Router) {
		r.Get("/menu", s.publicMenu)
		r.Get("/tables", s.publicTables)
		r.Get("/settings", s.publicSettings)
		r.Post("/orders", s.publicPlaceOrder)
		r.Get("/orders/track", s.publicTrackOrder)
		r.Get("/orders/{id}/stream", s.publicOrderStream)
	})

	r.Post("/staff/auth/login", s.staffLogin)

	// --- Authenticated Group (Requires Valid JWT) ---
	r.Group(func(r chi.Router) {
		r.Use(s.withAuth)

		r.Post("/logout", s.authLogout)
		r.Get("/me", s.authMe)
		r.Get("/sessions/active", s.getActiveSession)

		// --- Staff Operational Endpoints (Waiters, Chefs, Managers, Owners) ---
		r.Group(func(r chi.Router) {
			r.Use(s.requireRoles(models.RoleOwner, models.RoleManager, models.RoleWaiter, models.RoleChef))

			r.Get("/orders", s.listOrders)
			r.Post("/orders/{id}/status", s.updateOrderStatusEndpoint)
			r.Patch("/orders/{id}/status", s.updateOrderStatusEndpoint)
			r.Patch("/orders/{id}", s.updateOrderStatusEndpoint)
			r.Post("/orders/{id}/add-items", s.addOrderItemsEndpoint)

			r.Post("/tables/{id}/start-session", s.startSession)
			r.Post("/tables/{id}/status", s.updateTableStatus)

			r.Get("/service-requests", s.listServiceRequests)
			r.Post("/service-requests/{id}/resolve", s.resolveServiceRequest)

			r.Get("/payments", s.listPayments)
			r.Post("/payments", s.createPayment)
			r.Get("/payments/{id}", s.getPayment)


			r.Post("/media/presign", s.presignMediaUpload)
			r.Post("/media/confirm-presigned", s.confirmPresignedMediaUpload)
			r.Post("/media/upload", s.directMediaUpload)
			r.Post("/media/upload-link", s.uploadMediaFromLink)
			r.Post("/uploads/presign", s.presignMediaUpload)
			r.Post("/uploads/confirm", s.confirmPresignedMediaUpload)
			r.Post("/uploads", s.directMediaUpload)

			r.Get("/staff/me", s.staffMe)
			r.Patch("/staff/me", s.staffPatchMe)
			r.Get("/staff/stream", s.staffStream)
			r.Get("/staff/orders", s.staffListOrders)
			r.Get("/staff/orders/{id}", s.staffGetOrder)
			r.Post("/staff/orders", s.staffPlaceOrder)
			r.Patch("/staff/orders/{id}/status", s.staffPatchOrderStatus)
			r.Post("/staff/orders/{id}/payment", s.staffSubmitPayment)
			r.Post("/staff/orders/{id}/payment/verify", s.staffVerifyPayment)
			r.Post("/staff/orders/{id}/payment/reject", s.staffRejectPayment)
		})

		// --- Manager / Owner Endpoints (Administrative) ---
		r.Group(func(r chi.Router) {
			r.Use(s.requireRoles(models.RoleOwner, models.RoleManager))

			r.Route("/users", func(r chi.Router) {
				r.Get("/", s.listUsers)
				r.Post("/", s.createUser)
				r.Get("/{id}", s.getUser)
				r.Patch("/{id}", s.updateUser)
				r.Post("/{id}/toggle-status", s.toggleUserStatus)
				r.Delete("/{id}", s.deleteUser)
			})

			r.Post("/categories", s.createCategory)
			r.Patch("/categories/{id}", s.updateCategory)
			r.Put("/categories/{id}", s.updateCategory)
			r.Delete("/categories/{id}", s.deleteCategory)

			r.Post("/menu", s.createMenuItem)
			r.Patch("/menu/{id}", s.updateMenuItem)
			r.Put("/menu/{id}", s.updateMenuItem)
			r.Post("/menu/{id}/toggle-availability", s.toggleMenuItemAvailability)
			r.Delete("/menu/{id}", s.deleteMenuItem)

			r.Post("/addons", s.createAddon)
			r.Patch("/addons/{id}", s.updateAddon)
			r.Put("/addons/{id}", s.updateAddon)
			r.Delete("/addons/{id}", s.deleteAddon)

			r.Post("/tables", s.createTable)
			r.Patch("/tables/{id}", s.updateTable)
			r.Delete("/tables/{id}", s.deleteTable)

			r.Route("/expenses", func(r chi.Router) {
				r.Get("/", s.listExpenses)
				r.Post("/", s.createExpense)
				r.Get("/{id}", s.getExpense)
				r.Patch("/{id}", s.updateExpense)
				r.Delete("/{id}", s.deleteExpense)
			})

			r.Route("/activity-logs", func(r chi.Router) {
				r.Get("/", s.listActivityLogs)
				r.Get("/{id}", s.getActivityLog)
			})

			r.Route("/payment-methods", func(r chi.Router) {
				r.Post("/", s.createPaymentMethod)
				r.Patch("/{id}", s.updatePaymentMethod)
				r.Delete("/{id}", s.deletePaymentMethod)
			})

			r.Put("/settings", s.updateSettings)
			r.Patch("/settings", s.updateSettings)
			r.Get("/reports/summary", s.getReportsSummary)

			r.Get("/staff/analytics", s.analytics)
			r.Get("/staff/activity", s.listActivity)
		})
	})
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
