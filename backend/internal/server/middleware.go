package server

import (
	"context"
	"net/http"
	"strings"

	"yadotena/internal/auth"
	"yadotena/internal/models"
)

type ctxKey string

const claimsKey ctxKey = "claims"

func (s *Server) withAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := bearerOrCookie(r)
		if token == "" {
			writeErr(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		claims, err := auth.ParseToken(s.Cfg.JWTSecret, token)
		if err != nil {
			writeErr(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		ctx := context.WithValue(r.Context(), claimsKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (s *Server) requireRoles(roles ...models.Role) func(http.Handler) http.Handler {
	allowed := map[string]bool{}
	for _, r := range roles {
		roleStr := strings.ToUpper(string(r))
		allowed[roleStr] = true
		if roleStr == "CHEF" || roleStr == "KITCHEN" {
			allowed["CHEF"] = true
			allowed["KITCHEN"] = true
		}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			c := claimsFrom(r)
			if c == nil {
				writeErr(w, http.StatusUnauthorized, "unauthorized")
				return
			}
			userRole := strings.ToUpper(string(c.Role))
			if !allowed[userRole] && !allowed[strings.ToLower(string(c.Role))] {
				writeErr(w, http.StatusForbidden, "forbidden")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func claimsFrom(r *http.Request) *auth.Claims {
	c, _ := r.Context().Value(claimsKey).(*auth.Claims)
	return c
}

func bearerOrCookie(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if strings.HasPrefix(strings.ToLower(h), "bearer ") {
		return strings.TrimSpace(h[7:])
	}
	if c, err := r.Cookie("yadotena_token"); err == nil {
		return c.Value
	}
	return ""
}
