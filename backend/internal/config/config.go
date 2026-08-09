package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv         string
	AppPort        string
	DatabaseURL    string
	RedisURL       string
	JWTSecret      string
	JWTExpiry      time.Duration
	MigrationsDir  string
	SeedsDir       string
	RunSeeds       bool
	UploadsDir     string
	PublicBaseURL  string
	CORSOrigins    string
	UploadMaxBytes int64

	R2AccountID       string
	R2AccessKeyID     string
	R2SecretAccessKey string
	R2Bucket          string
	R2PublicBaseURL   string
	R2Endpoint        string // optional override, e.g. https://ACCOUNT.r2.cloudflarestorage.com
}

func Load() Config {
	_ = godotenv.Load()
	exp := 24 * time.Hour
	if v := os.Getenv("JWT_EXPIRY"); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			exp = d
		}
	}
	maxBytes := int64(5 << 20)
	if v := os.Getenv("UPLOAD_MAX_BYTES"); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			maxBytes = n
		}
	}
	port := getenv("PORT", "")
	if port == "" {
		port = getenv("APP_PORT", "8080")
	}
	return Config{
		AppEnv:         getenv("APP_ENV", "development"),
		AppPort:        port,
		DatabaseURL:    getenv("DATABASE_URL", "postgres://yadotena:yadotena@localhost:5432/yadotena?sslmode=disable"),
		RedisURL:       getenv("REDIS_URL", ""),
		JWTSecret:      getenv("JWT_SECRET", "dev-yadotena-secret-change-me"),
		JWTExpiry:      exp,
		MigrationsDir:  getenv("MIGRATIONS_DIR", "migrations"),
		SeedsDir:       getenv("SEEDS_DIR", "seeds"),
		RunSeeds:       getenv("RUN_SEEDS", "true") == "true",
		UploadsDir:     getenv("UPLOADS_DIR", "uploads"),
		PublicBaseURL:  getenv("PUBLIC_BASE_URL", "http://localhost:3000"),
		CORSOrigins: getenv(
			"CORS_ALLOWED_ORIGINS",
			"*",
		),
		UploadMaxBytes: maxBytes,

		R2AccountID:       os.Getenv("R2_ACCOUNT_ID"),
		R2AccessKeyID:     os.Getenv("R2_ACCESS_KEY_ID"),
		R2SecretAccessKey: os.Getenv("R2_SECRET_ACCESS_KEY"),
		R2Bucket:          firstEnv("R2_BUCKET", "R2_BUCKET_NAME"),
		R2PublicBaseURL:   firstEnv("R2_PUBLIC_BASE_URL", "R2_PUBLIC_URL"),
		R2Endpoint:        os.Getenv("R2_ENDPOINT"),
	}
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func firstEnv(keys ...string) string {
	for _, k := range keys {
		if v := os.Getenv(k); v != "" {
			return v
		}
	}
	return ""
}
