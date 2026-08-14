package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"yadotena/internal/models"
)

var ErrInvalidCredentials = errors.New("invalid credentials")

type Claims struct {
	UserID  string      `json:"sub,omitempty"`
	StaffID uuid.UUID   `json:"staff_id,omitempty"`
	Role    models.Role `json:"role"`
	Name    string      `json:"name"`
	jwt.RegisteredClaims
}

func HashPIN(pin string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(pin), 10)
	return string(b), err
}

func CheckPIN(hash, pin string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pin)) == nil
}

func IssueToken(secret string, expiry time.Duration, staffID uuid.UUID, role models.Role, name string) (string, error) {
	staffIDStr := ""
	if staffID != uuid.Nil {
		staffIDStr = staffID.String()
	}
	claims := Claims{
		UserID:  staffIDStr,
		StaffID: staffID,
		Role:    role,
		Name:    name,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   staffIDStr,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString([]byte(secret))
}

func ParseToken(secret, token string) (*Claims, error) {
	parsed, err := jwt.ParseWithClaims(token, &Claims{}, func(t *jwt.Token) (any, error) {
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := parsed.Claims.(*Claims)
	if !ok || !parsed.Valid {
		return nil, ErrInvalidCredentials
	}
	if claims.UserID == "" && claims.Subject != "" {
		claims.UserID = claims.Subject
	}
	if claims.UserID == "" && claims.StaffID != uuid.Nil {
		claims.UserID = claims.StaffID.String()
	}
	if claims.StaffID == uuid.Nil && claims.UserID != "" {
		if parsedID, err := uuid.Parse(claims.UserID); err == nil {
			claims.StaffID = parsedID
		}
	}
	return claims, nil
}
