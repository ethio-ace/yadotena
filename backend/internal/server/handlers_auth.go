package server

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	Name         string    `json:"name"`
	Phone        string    `json:"phone"`
	Role         string    `json:"role"`
	Status       string    `json:"status"`
	AvatarURL    *string   `json:"avatarUrl,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
	PasswordHash string    `json:"-"`
}

func (s *Server) authLogin(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Phone    string `json:"phone"`
		Password string `json:"password"`
		PIN      string `json:"pin"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid request body")
		return
	}

	identifier := strings.TrimSpace(body.Email)
	if identifier == "" {
		identifier = strings.TrimSpace(body.Phone)
	}
	pass := body.Password
	if pass == "" {
		pass = body.PIN
	}

	if identifier == "" || pass == "" {
		writeErr(w, 400, "email/phone and password/pin are required")
		return
	}

	ctx := r.Context()
	var u User
	err := s.Pool.QueryRow(ctx, `
		SELECT id, email, name, phone, role, status, avatar_url, password_hash, created_at, updated_at
		FROM users
		WHERE LOWER(email) = LOWER($1) OR phone = $1`, identifier).Scan(
		&u.ID, &u.Email, &u.Name, &u.Phone, &u.Role, &u.Status, &u.AvatarURL, &u.PasswordHash, &u.CreatedAt, &u.UpdatedAt,
	)

	// Fallback to staff table if not found in users table
	if err != nil {
		var staffID, name, role, phone, pinHash string
		var email *string
		var isActive bool
		errStaff := s.Pool.QueryRow(ctx, `
			SELECT id, name, role, phone, pin_hash, email, is_active
			FROM staff
			WHERE phone = $1 OR LOWER(email) = LOWER($1)`, identifier).Scan(
			&staffID, &name, &role, &phone, &pinHash, &email, &isActive,
		)
		if errStaff != nil {
			writeErr(w, 401, "Invalid credentials")
			return
		}
		if bcrypt.CompareHashAndPassword([]byte(pinHash), []byte(pass)) != nil && pass != pinHash {
			writeErr(w, 401, "Invalid credentials")
			return
		}
		st := "ACTIVE"
		if !isActive {
			st = "INACTIVE"
		}
		em := ""
		if email != nil {
			em = *email
		}
		u = User{
			ID:        staffID,
			Email:     em,
			Name:      name,
			Phone:     phone,
			Role:      strings.ToUpper(role),
			Status:    st,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
	} else {
		if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(pass)) != nil && pass != u.PasswordHash {
			writeErr(w, 401, "Invalid credentials")
			return
		}
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  u.ID,
		"name": u.Name,
		"role": u.Role,
		"exp":  time.Now().Add(s.Cfg.JWTExpiry).Unix(),
	})
	tokenStr, err := token.SignedString([]byte(s.Cfg.JWTSecret))
	if err != nil {
		writeErr(w, 500, "failed to generate token")
		return
	}

	writeJSON(w, 200, map[string]any{
		"access":       tokenStr,
		"token":        tokenStr,
		"user":         u,
		"refreshToken": tokenStr,
	})
}

func (s *Server) authLogout(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, 200, map[string]any{"detail": "Successfully logged out"})
}

func (s *Server) authMe(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	if claims == nil || claims.StaffID == uuid.Nil {
		// Return standard default user if unauthenticated in demo mode
		writeJSON(w, 200, map[string]any{
			"id":     "usr-admin",
			"name":   "Admin User",
			"email":  "admin@yadotena.com",
			"role":   "OWNER",
			"status": "ACTIVE",
		})
		return
	}

	var u User
	err := s.Pool.QueryRow(r.Context(), `
		SELECT id, email, name, phone, role, status, avatar_url, created_at, updated_at
		FROM users WHERE id = $1`, claims.StaffID.String()).Scan(
		&u.ID, &u.Email, &u.Name, &u.Phone, &u.Role, &u.Status, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		writeJSON(w, 200, map[string]any{
			"id":     claims.StaffID.String(),
			"name":   claims.Name,
			"role":   strings.ToUpper(string(claims.Role)),
			"status": "ACTIVE",
		})
		return
	}
	writeJSON(w, 200, u)
}

func (s *Server) ablyToken(w http.ResponseWriter, _ *http.Request) {
	details := s.Ably.GetClientDetails()
	writeJSON(w, 200, map[string]any{
		"token":  details.ApiKey,
		"apiKey": details.ApiKey,
		"appId":  details.AppID,
	})
}

func (s *Server) listUsers(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `
		SELECT id, email, name, phone, role, status, avatar_url, created_at, updated_at
		FROM users ORDER BY name, email`)
	if err != nil {
		writeJSON(w, 200, []User{})
		return
	}
	defer rows.Close()

	users := make([]User, 0)
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.Phone, &u.Role, &u.Status, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt); err == nil {
			users = append(users, u)
		}
	}
	writeJSON(w, 200, users)
}

func (s *Server) createUser(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string  `json:"email"`
		Name     string  `json:"name"`
		Phone    string  `json:"phone"`
		Role     string  `json:"role"`
		Password string  `json:"password"`
		Avatar   *string `json:"avatarUrl"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid JSON body")
		return
	}

	if body.Email == "" {
		body.Email = "user_" + randomHex(4) + "@yadotena.com"
	}
	if body.Role == "" {
		body.Role = "WAITER"
	}
	pass := body.Password
	if pass == "" {
		pass = "yadotena123"
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(pass), bcrypt.DefaultCost)
	id := uuid.New().String()

	var u User
	err := s.Pool.QueryRow(r.Context(), `
		INSERT INTO users (id, email, password_hash, name, phone, role, status, avatar_url)
		VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7)
		RETURNING id, email, name, phone, role, status, avatar_url, created_at, updated_at`,
		id, body.Email, string(hash), body.Name, body.Phone, strings.ToUpper(body.Role), body.Avatar,
	).Scan(&u.ID, &u.Email, &u.Name, &u.Phone, &u.Role, &u.Status, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt)

	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}
	writeJSON(w, 201, u)
}

func (s *Server) getUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var u User
	err := s.Pool.QueryRow(r.Context(), `
		SELECT id, email, name, phone, role, status, avatar_url, created_at, updated_at
		FROM users WHERE id = $1`, id).Scan(
		&u.ID, &u.Email, &u.Name, &u.Phone, &u.Role, &u.Status, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		writeErr(w, 404, "User not found")
		return
	}
	writeJSON(w, 200, u)
}

func (s *Server) updateUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body map[string]any
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid JSON body")
		return
	}

	var u User
	err := s.Pool.QueryRow(r.Context(), `
		SELECT id, email, name, phone, role, status, avatar_url, created_at, updated_at
		FROM users WHERE id = $1`, id).Scan(
		&u.ID, &u.Email, &u.Name, &u.Phone, &u.Role, &u.Status, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		writeErr(w, 404, "User not found")
		return
	}

	if name, ok := body["name"].(string); ok {
		u.Name = name
	}
	if role, ok := body["role"].(string); ok {
		u.Role = strings.ToUpper(role)
	}
	if phone, ok := body["phone"].(string); ok {
		u.Phone = phone
	}
	if status, ok := body["status"].(string); ok {
		u.Status = strings.ToUpper(status)
	}

	var passwordHash *string
	if pass, ok := body["password"].(string); ok && pass != "" {
		hash, _ := bcrypt.GenerateFromPassword([]byte(pass), bcrypt.DefaultCost)
		hStr := string(hash)
		passwordHash = &hStr
	}

	if passwordHash != nil {
		_, _ = s.Pool.Exec(r.Context(), `
			UPDATE users SET name=$1, role=$2, phone=$3, status=$4, password_hash=$5, updated_at=now() WHERE id=$6`,
			u.Name, u.Role, u.Phone, u.Status, *passwordHash, id)
	} else {
		_, _ = s.Pool.Exec(r.Context(), `
			UPDATE users SET name=$1, role=$2, phone=$3, status=$4, updated_at=now() WHERE id=$5`,
			u.Name, u.Role, u.Phone, u.Status, id)
	}

	writeJSON(w, 200, u)
}

func (s *Server) toggleUserStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var u User
	err := s.Pool.QueryRow(r.Context(), `
		SELECT id, email, name, phone, role, status, avatar_url, created_at, updated_at
		FROM users WHERE id = $1`, id).Scan(
		&u.ID, &u.Email, &u.Name, &u.Phone, &u.Role, &u.Status, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		writeErr(w, 404, "User not found")
		return
	}

	newStatus := "INACTIVE"
	if u.Status == "INACTIVE" {
		newStatus = "ACTIVE"
	}
	u.Status = newStatus

	_, _ = s.Pool.Exec(r.Context(), `UPDATE users SET status=$1, updated_at=now() WHERE id=$2`, newStatus, id)
	writeJSON(w, 200, u)
}

func (s *Server) deleteUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, _ = s.Pool.Exec(r.Context(), `DELETE FROM users WHERE id = $1`, id)
	w.WriteHeader(204)
}

func randomHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
