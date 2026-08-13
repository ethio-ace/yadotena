package server

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"yadotena/internal/config"
)

func TestRouter_APIV1Mounting(t *testing.T) {
	srv := &Server{
		Cfg: config.Config{CORSOrigins: "*"},
	}
	handler := srv.Router()

	tests := []struct {
		name           string
		path           string
		method         string
		expectedStatus int
	}{
		{
			name:           "Root health endpoint",
			path:           "/health",
			method:         "GET",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "API v1 health endpoint",
			path:           "/api/v1/health",
			method:         "GET",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Un-namespaced root API path should 404",
			path:           "/categories",
			method:         "GET",
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "Un-namespaced root API login path should 404",
			path:           "/login",
			method:         "POST",
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "API v1 login endpoint exists (not 404)",
			path:           "/api/v1/login",
			method:         "POST",
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "API v1 auth/login endpoint exists (not 404)",
			path:           "/api/v1/auth/login",
			method:         "POST",
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d for %s %s, got %d", tt.expectedStatus, tt.method, tt.path, rr.Code)
			}
		})
	}
}
