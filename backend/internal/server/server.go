package server

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"yadotena/internal/activity"
	"yadotena/internal/config"
	"yadotena/internal/pubsub"
	"yadotena/internal/sse"
	"yadotena/internal/storage"
)

type Server struct {
	Cfg     config.Config
	Pool    *pgxpool.Pool
	Log     *activity.Logger
	Hub     *sse.Hub
	Redis   *redis.Client
	Ably    *pubsub.AblyClient
	NATS    *pubsub.NATSClient
	Storage *storage.TigrisStorage
}

func New(cfg config.Config, pool *pgxpool.Pool, rdb *redis.Client) *Server {
	return &Server{
		Cfg:     cfg,
		Pool:    pool,
		Log:     &activity.Logger{Pool: pool},
		Hub:     sse.NewHub(),
		Redis:   rdb,
		Ably:    pubsub.NewAblyClient(cfg),
		NATS:    pubsub.NewNATSClient(cfg),
		Storage: storage.NewTigrisStorage(cfg, pool),
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func decodeJSON(r *http.Request, dst any) error {
	defer r.Body.Close()
	dec := json.NewDecoder(r.Body)
	return dec.Decode(dst)
}
