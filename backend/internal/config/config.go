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

	// Ably Realtime
	AblyAPIKey string
	AblyAppID  string

	// NATS Cloud (Synadia NGS)
	NATSURL      string
	NATSUserJWT  string
	NATSNkeySeed string

	// Tigris Storage (S3 Compatible)
	TigrisAccessKeyID     string
	TigrisSecretAccessKey string
	TigrisEndpoint        string
	TigrisBucket          string
}

func Load() Config {
	_ = godotenv.Load()
	exp := 24 * time.Hour
	if v := os.Getenv("JWT_EXPIRY"); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			exp = d
		}
	}
	maxBytes := int64(10 << 20) // 10MB default
	if v := os.Getenv("UPLOAD_MAX_BYTES"); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			maxBytes = n
		}
	}
	port := getenv("PORT", "")
	if port == "" {
		port = getenv("APP_PORT", "8080")
	}

	tigrisAccess := firstEnv("TIGRIS_STORAGE_ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID")
	tigrisSecret := firstEnv("TIGRIS_STORAGE_SECRET_ACCESS_KEY", "AWS_SECRET_ACCESS_KEY")
	tigrisEndpoint := firstEnv("TIGRIS_STORAGE_ENDPOINT", "AWS_ENDPOINT_URL_S3")
	if tigrisEndpoint == "" {
		tigrisEndpoint = "https://t3.storage.dev"
	}
	tigrisBucket := firstEnv("STORAGE_BUCKET_NAME", "TIGRIS_BUCKET_NAME", "AWS_BUCKET_NAME")
	if tigrisBucket == "" {
		tigrisBucket = "yadotena-media"
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
		RunSeeds:       getenv("RUN_SEEDS", "false") == "true",
		UploadsDir:     getenv("UPLOADS_DIR", "uploads"),
		PublicBaseURL:  getenv("PUBLIC_BASE_URL", "http://localhost:3000"),
		CORSOrigins:    getenv("CORS_ALLOWED_ORIGINS", "*"),
		UploadMaxBytes: maxBytes,

		AblyAPIKey: os.Getenv("ABLY_API_KEY"),
		AblyAppID:  os.Getenv("ABLY_APP_ID"),

		NATSURL:      getenv("NATS_URL", "tls://connect.ngs.global:4222"),
		NATSUserJWT:  os.Getenv("NATS_USER_JWT"),
		NATSNkeySeed: os.Getenv("NATS_NKEY_SEED"),

		TigrisAccessKeyID:     tigrisAccess,
		TigrisSecretAccessKey: tigrisSecret,
		TigrisEndpoint:        tigrisEndpoint,
		TigrisBucket:          tigrisBucket,
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
