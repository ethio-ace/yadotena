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
	// --- Auth & User Profile ---
	r.Post("/login", s.authLogin)
	r.Post("/register", s.authRegister)
	r.Post("/logout", s.authLogout)
	r.Get("/me", s.authMe)

	r.Route("/auth", func(r chi.Router) {
		r.Post("/login", s.authLogin)
		r.Post("/register", s.authRegister)
		r.Post("/logout", s.authLogout)
		r.Get("/me", s.authMe)
		r.Get("/ably-token", s.ablyToken)
	})

	// --- Users Management ---
	r.Route("/users", func(r chi.Router) {
		r.Get("/", s.listUsers)
		r.Post("/", s.createUser)
		r.Get("/{id}", s.getUser)
		r.Patch("/{id}", s.updateUser)
		r.Post("/{id}/toggle-status", s.toggleUserStatus)
		r.Delete("/{id}", s.deleteUser)
	})

	// --- Menu Categories ---
	r.Route("/categories", func(r chi.Router) {
		r.Get("/", s.listCategories)
		r.Post("/", s.createCategory)
		r.Get("/{id}", s.getCategory)
		r.Patch("/{id}", s.updateCategory)
		r.Put("/{id}", s.updateCategory)
		r.Delete("/{id}", s.deleteCategory)
	})

	// --- Menu Items ---
	r.Route("/menu", func(r chi.Router) {
		r.Get("/", s.listMenuItems)
		r.Post("/", s.createMenuItem)
		r.Get("/{id}", s.getMenuItem)
		r.Patch("/{id}", s.updateMenuItem)
		r.Put("/{id}", s.updateMenuItem)
		r.Post("/{id}/toggle-availability", s.toggleMenuItemAvailability)
		r.Delete("/{id}", s.deleteMenuItem)
	})

	// --- Tables ---
	r.Route("/tables", func(r chi.Router) {
		r.Get("/", s.listTables)
		r.Post("/", s.createTable)
		r.Get("/{id}", s.getTable)
		r.Patch("/{id}", s.updateTable)
		r.Post("/{id}/status", s.updateTableStatus)
		r.Post("/{id}/start-session", s.startSession)
		r.Delete("/{id}", s.deleteTable)
	})

	// --- Dining Sessions ---
	r.Route("/sessions", func(r chi.Router) {
		r.Get("/active", s.getActiveSession)
	})

	// --- Orders ---
	r.Route("/orders", func(r chi.Router) {
		r.Get("/", s.listOrders)
		r.Post("/", s.createOrderEndpoint)
		r.Get("/{id}", s.getOrder)
		r.Post("/{id}/status", s.updateOrderStatusEndpoint)
		r.Patch("/{id}/status", s.updateOrderStatusEndpoint)
		r.Patch("/{id}", s.updateOrderStatusEndpoint)
		r.Post("/{id}/add-items", s.addOrderItemsEndpoint)
	})

	// --- Service Requests ---
	r.Route("/service-requests", func(r chi.Router) {
		r.Get("/", s.listServiceRequests)
		r.Post("/", s.createServiceRequest)
		r.Post("/{id}/resolve", s.resolveServiceRequest)
	})

	// --- Expenses ---
	r.Route("/expenses", func(r chi.Router) {
		r.Get("/", s.listExpenses)
		r.Post("/", s.createExpense)
		r.Get("/{id}", s.getExpense)
		r.Patch("/{id}", s.updateExpense)
		r.Delete("/{id}", s.deleteExpense)
	})



	// --- Payments ---
	r.Route("/payments", func(r chi.Router) {
		r.Get("/", s.listPayments)
		r.Post("/", s.createPayment)
		r.Get("/{id}", s.getPayment)
	})

	// --- Activity Logs Audit Trail ---
	r.Route("/activity-logs", func(r chi.Router) {
		r.Get("/", s.listActivityLogs)
		r.Get("/{id}", s.getActivityLog)
	})

	// --- Payment Methods ---
	r.Route("/payment-methods", func(r chi.Router) {
		r.Get("/", s.listPaymentMethods)
		r.Post("/", s.createPaymentMethod)
		r.Get("/{id}", s.getPaymentMethod)
		r.Patch("/{id}", s.updatePaymentMethod)
		r.Delete("/{id}", s.deletePaymentMethod)
	})

	// --- Restaurant Settings & Analytics ---
	r.Get("/settings", s.getSettings)
	r.Put("/settings", s.updateSettings)
	r.Patch("/settings", s.updateSettings)
	r.Get("/reports/summary", s.getReportsSummary)

	// --- Media Uploads & Presigned URLs ---
	r.Get("/media/proxy", s.mediaProxy)
	r.Post("/media/presign", s.presignMediaUpload)
	r.Post("/media/upload", s.directMediaUpload)
	r.Post("/media/upload-link", s.uploadMediaFromLink)
	r.Post("/uploads/presign", s.presignMediaUpload)
	r.Post("/uploads", s.directMediaUpload)
	r.Get("/uploads/*", s.serveUploads)

	// --- Legacy / Public / Staff Compatibility Routes ---
	r.Route("/public", func(r chi.Router) {
		r.Get("/menu", s.publicMenu)
		r.Get("/tables", s.publicTables)
		r.Get("/settings", s.publicSettings)
		r.Post("/orders", s.publicPlaceOrder)
		r.Get("/orders/track", s.publicTrackOrder)
		r.Get("/orders/{id}/stream", s.publicOrderStream)
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

		r.With(s.requireRoles(models.RoleOwner, models.RoleManager)).Get("/staff/analytics", s.analytics)
		r.With(s.requireRoles(models.RoleOwner, models.RoleManager)).Get("/staff/activity", s.listActivity)
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
