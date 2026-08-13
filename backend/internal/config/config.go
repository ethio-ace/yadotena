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
	if tigrisAccess == "" {
		tigrisAccess = "tid_ceTEvXARfEcL_wchrUqeiimBTxyXqTApG_IByTDjZMUKOXuZwd"
	}
	tigrisSecret := firstEnv("TIGRIS_STORAGE_SECRET_ACCESS_KEY", "AWS_SECRET_ACCESS_KEY")
	if tigrisSecret == "" {
		tigrisSecret = "tsec_zDAQtifbJiYk7_TZt-4wRhukkrYwxkscb_8yGlt_HgKBN1VLwOlGitrb1UTuohFa0DHuoa"
	}
	tigrisEndpoint := firstEnv("TIGRIS_STORAGE_ENDPOINT", "AWS_ENDPOINT_URL_S3")
	if tigrisEndpoint == "" {
		tigrisEndpoint = "https://t3.storage.dev"
	}
	tigrisBucket := firstEnv("STORAGE_BUCKET_NAME", "TIGRIS_BUCKET_NAME", "AWS_BUCKET_NAME")
	if tigrisBucket == "" {
		tigrisBucket = "yadotena"
	}

	ablyKey := getenv("ABLY_API_KEY", "-4Zlzg.IeXFIQ:WVUQULrxNq5--goH4SzbHOnTZ9OoXB-JcKMx5Wd2XQE")
	ablyApp := getenv("ABLY_APP_ID", "-4Zlzg")

	natsURL := getenv("NATS_URL", "tls://connect.ngs.global:4222")
	natsJWT := getenv("NATS_USER_JWT", "eyJ0eXAiOiJKV1QiLCJhbGciOiJlZDI1NTE5LW5rZXkifQ.eyJqdGkiOiJHTUZKNVpKVkhOTUFXUFFJNFhWSUlYWERVU0FQVFFLT1BLS0EzM0NZQzJCQ0k0Tlo2Q0RBIiwiaWF0IjoxNzg2NTc0NjY5LCJpc3MiOiJBQjdWSFZLQVJORjdMS1BDVVNLN0xNNENWNEdPQVM2WlJYMzQyTEFYTlNKTU5QWldFRUxMSE1SQyIsIm5hbWUiOiJDTEkiLCJzdWIiOiJVQkJCQ05FSTRENUdRSklGUEZLREdHTUtETUZFVUpONkNNMkVJVkZXU0U2TlVUTk9UUDZQVkQzUSIsIm5hdHMiOnsicHViIjp7fSwic3ViIjp7fSwic3VicyI6LTEsImRhdGEiOi0xLCJwYXlsb2FkIjotMSwiaXNzdWVyX2FjY291bnQiOiJBQjZSV1NBV1FUSEVZNkw1VjI0RTNWNUlFQ1hIQU42VkVOTjRINERNM1k3VVpMVEhWMzZYRUpNUyIsInR5cGUiOiJ1c2VyIiwidmVyc2lvbiI6Mn19.YZMK7lf5oPcmyPHaXxcBtqdq4PGM6Ym5m119oQ_TkokAQkLTvJyWYnMDmyhS_jcsX18HLvmxVeG6FbxAHfwBDg")
	natsSeed := getenv("NATS_NKEY_SEED", "SUABJKHLVB733KNVI5UAJZ4EKTDJTHU2HNYDFOAPH7HS254SMGC2AAES6E")

	pubBaseURL := getenv("PUBLIC_BASE_URL", "")
	if pubBaseURL == "" || pubBaseURL == "http://localhost:3000" {
		if getenv("APP_ENV", "development") == "production" || os.Getenv("RENDER") != "" {
			pubBaseURL = "https://yadotena.onrender.com"
		} else {
			pubBaseURL = "http://localhost:8085"
		}
	}

	return Config{
		AppEnv:         getenv("APP_ENV", "development"),
		AppPort:        port,
		DatabaseURL:    getenv("DATABASE_URL", "postgresql://neondb_owner:npg_dSkyzT5DV1vn@ep-shiny-silence-aywzao76-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"),
		RedisURL:       getenv("REDIS_URL", "rediss://default:AeQeAAIncDEzOTYxZGRiMWFhYjY0MTE0OGI0YjZkNWVjNWE2ZTZhMHAxNTgzOTg@working-adder-58398.upstash.io:6379"),
		JWTSecret:      getenv("JWT_SECRET", "dev-yadotena-secret-change-me"),
		JWTExpiry:      exp,
		MigrationsDir:  getenv("MIGRATIONS_DIR", "migrations"),
		SeedsDir:       getenv("SEEDS_DIR", "seeds"),
		RunSeeds:       getenv("RUN_SEEDS", "false") == "true",
		UploadsDir:     getenv("UPLOADS_DIR", "uploads"),
		PublicBaseURL:  pubBaseURL,
		CORSOrigins:    getenv("CORS_ALLOWED_ORIGINS", "*"),
		UploadMaxBytes: maxBytes,

		AblyAPIKey: ablyKey,
		AblyAppID:  ablyApp,

		NATSURL:      natsURL,
		NATSUserJWT:  natsJWT,
		NATSNkeySeed: natsSeed,

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
