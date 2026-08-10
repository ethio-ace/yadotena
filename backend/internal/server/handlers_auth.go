package server

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"yadotena/internal/auth"
	"yadotena/internal/cache"
	"yadotena/internal/dto"
	"yadotena/internal/models"
)

func (s *Server) staffLogin(w http.ResponseWriter, r *http.Request) {
	ip := r.RemoteAddr
	if !cache.AllowRate(r.Context(), s.Redis, "rl:login:"+ip, 20, time.Minute) {
		writeErr(w, 429, "too many login attempts")
		return
	}
	var body struct {
		Phone string `json:"phone"`
		PIN   string `json:"pin"`
	}
	if err := decodeJSON(r, &body); err != nil || body.Phone == "" || body.PIN == "" {
		writeErr(w, 400, "phone and pin required")
		return
	}
	// Per-phone throttle (brute-force PIN)
	if !cache.AllowRate(r.Context(), s.Redis, "rl:login:phone:"+body.Phone, 10, time.Minute) {
		writeErr(w, 429, "too many login attempts for this phone")
		return
	}
	var id uuid.UUID
	var hash, name string
	var email *string
	var role models.Role
	var active bool
	err := s.Pool.QueryRow(r.Context(), `
		SELECT id, pin_hash, name, email, role, is_active FROM staff WHERE phone=$1`, body.Phone).
		Scan(&id, &hash, &name, &email, &role, &active)
	if err != nil || !active || !auth.CheckPIN(hash, body.PIN) {
		writeErr(w, 401, "invalid credentials")
		return
	}
	token, err := auth.IssueToken(s.Cfg.JWTSecret, s.Cfg.JWTExpiry, id, role, name)
	if err != nil {
		writeErr(w, 500, "token error")
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "yadotena_token",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(s.Cfg.JWTExpiry.Seconds()),
	})
	_ = s.Log.Write(r.Context(), &id, name, "login", "staff", id.String(), nil)
	writeJSON(w, 200, map[string]any{
		"token": token,
		"user": dto.StaffUser(models.Staff{
			ID: id, Phone: body.Phone, Name: name, Email: email, Role: role, IsActive: active,
		}),
	})
}

func (s *Server) staffMe(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	var st models.Staff
	var email, notes *string
	err := s.Pool.QueryRow(r.Context(), `
		SELECT id, phone, name, email, notes, role, is_active, created_at
		FROM staff WHERE id=$1`, c.StaffID).
		Scan(&st.ID, &st.Phone, &st.Name, &email, &notes, &st.Role, &st.IsActive, &st.CreatedAt)
	if err != nil {
		writeErr(w, 404, "not found")
		return
	}
	st.Email, st.Notes = email, notes
	writeJSON(w, 200, dto.StaffUser(st))
}

func (s *Server) staffPatchMe(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	var body struct {
		Name  *string `json:"name"`
		Email *string `json:"email"`
		Notes *string `json:"notes"`
		PIN   *string `json:"pin"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	if body.Name != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE staff SET name=$1, updated_at=now() WHERE id=$2`, *body.Name, c.StaffID)
	}
	if body.Email != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE staff SET email=$1, updated_at=now() WHERE id=$2`, *body.Email, c.StaffID)
	}
	if body.Notes != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE staff SET notes=$1, updated_at=now() WHERE id=$2`, *body.Notes, c.StaffID)
	}
	if body.PIN != nil && *body.PIN != "" {
		h, err := auth.HashPIN(*body.PIN)
		if err != nil {
			writeErr(w, 500, "hash error")
			return
		}
		_, _ = s.Pool.Exec(r.Context(), `UPDATE staff SET pin_hash=$1, updated_at=now() WHERE id=$2`, h, c.StaffID)
	}
	_ = s.Log.Write(r.Context(), &c.StaffID, c.Name, "update_profile", "staff", c.StaffID.String(), nil)
	s.staffMe(w, r)
}

func (s *Server) listStaff(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Pool.Query(r.Context(), `
		SELECT id, phone, name, email, notes, role, is_active, created_at FROM staff ORDER BY role, name`)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	defer rows.Close()
	list := make([]map[string]any, 0)
	for rows.Next() {
		var st models.Staff
		var email, notes *string
		if err := rows.Scan(&st.ID, &st.Phone, &st.Name, &email, &notes, &st.Role, &st.IsActive, &st.CreatedAt); err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		st.Email, st.Notes = email, notes
		list = append(list, dto.StaffUser(st))
	}
	writeJSON(w, 200, list)
}

func (s *Server) createStaff(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	var body struct {
		Phone string  `json:"phone"`
		PIN   string  `json:"pin"`
		Name  string  `json:"name"`
		Email *string `json:"email"`
		Notes *string `json:"notes"`
		Role  string  `json:"role"`
	}
	if err := decodeJSON(r, &body); err != nil || body.Phone == "" || body.PIN == "" || body.Name == "" {
		writeErr(w, 400, "phone, pin, name required")
		return
	}
	role, err := parseStaffRole(body.Role)
	if err != nil {
		writeErr(w, 400, "invalid role")
		return
	}
	if role == models.RoleOwner {
		writeErr(w, 403, "cannot create owner")
		return
	}
	if c.Role == models.RoleManager && role == models.RoleManager {
		writeErr(w, 403, "manager cannot create manager")
		return
	}
	h, err := auth.HashPIN(body.PIN)
	if err != nil {
		writeErr(w, 500, "hash error")
		return
	}
	var id uuid.UUID
	err = s.Pool.QueryRow(r.Context(), `
		INSERT INTO staff (phone, pin_hash, name, email, notes, role)
		VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		body.Phone, h, body.Name, body.Email, body.Notes, role).Scan(&id)
	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}
	_ = s.Log.Write(r.Context(), &c.StaffID, c.Name, "create_staff", "staff", id.String(), map[string]any{"role": role})
	writeJSON(w, 201, map[string]any{"id": id})
}

func (s *Server) patchStaff(w http.ResponseWriter, r *http.Request) {
	c := claimsFrom(r)
	id, err := uuid.Parse(chiURLParam(r, "id"))
	if err != nil {
		writeErr(w, 400, "bad id")
		return
	}
	var targetRole models.Role
	if err := s.Pool.QueryRow(r.Context(), `SELECT role FROM staff WHERE id=$1`, id).Scan(&targetRole); err != nil {
		writeErr(w, 404, "not found")
		return
	}
	if targetRole == models.RoleOwner && c.Role != models.RoleOwner {
		writeErr(w, 403, "cannot edit owner")
		return
	}
	if c.Role == models.RoleManager && targetRole == models.RoleManager {
		writeErr(w, 403, "manager cannot edit manager")
		return
	}
	var body struct {
		Name     *string `json:"name"`
		Email    *string `json:"email"`
		Phone    *string `json:"phone"`
		Notes    *string `json:"notes"`
		PIN      *string `json:"pin"`
		IsActive *bool   `json:"is_active"`
		Status   *string `json:"status"`
		Role     *string `json:"role"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	if body.IsActive == nil && body.Status != nil {
		switch *body.Status {
		case "ACTIVE":
			v := true
			body.IsActive = &v
		case "INACTIVE":
			v := false
			body.IsActive = &v
		}
	}
	var role *models.Role
	if body.Role != nil {
		parsed, err := parseStaffRole(*body.Role)
		if err != nil {
			writeErr(w, 400, "invalid role")
			return
		}
		if c.Role == models.RoleManager && (parsed == models.RoleManager || parsed == models.RoleOwner) {
			writeErr(w, 403, "manager cannot set manager or owner role")
			return
		}
		role = &parsed
	}
	if body.Name != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE staff SET name=$1, updated_at=now() WHERE id=$2`, *body.Name, id)
	}
	if body.Email != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE staff SET email=$1, updated_at=now() WHERE id=$2`, *body.Email, id)
	}
	if body.Phone != nil && *body.Phone != "" {
		_, err := s.Pool.Exec(r.Context(), `UPDATE staff SET phone=$1, updated_at=now() WHERE id=$2`, *body.Phone, id)
		if err != nil {
			writeErr(w, 400, err.Error())
			return
		}
	}
	if body.Notes != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE staff SET notes=$1, updated_at=now() WHERE id=$2`, *body.Notes, id)
	}
	if body.IsActive != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE staff SET is_active=$1, updated_at=now() WHERE id=$2`, *body.IsActive, id)
	}
	if body.PIN != nil && *body.PIN != "" {
		h, err := auth.HashPIN(*body.PIN)
		if err != nil {
			writeErr(w, 500, "hash error")
			return
		}
		_, _ = s.Pool.Exec(r.Context(), `UPDATE staff SET pin_hash=$1, updated_at=now() WHERE id=$2`, h, id)
	}
	if role != nil {
		_, _ = s.Pool.Exec(r.Context(), `UPDATE staff SET role=$1, updated_at=now() WHERE id=$2`, *role, id)
	}
	_ = s.Log.Write(r.Context(), &c.StaffID, c.Name, "update_staff", "staff", id.String(), nil)
	writeJSON(w, 200, map[string]string{"ok": "true"})
}

func chiURLParam(r *http.Request, key string) string {
	return chi.URLParam(r, key)
}

func parseStaffRole(value string) (models.Role, error) {
	role, err := dto.ParseRoleAPI(value)
	if err == nil {
		return role, nil
	}
	switch role = models.Role(value); role {
	case models.RoleOwner, models.RoleManager, models.RoleWaiter, models.RoleChef:
		return role, nil
	}
	return "", err
}
