package server

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"yadotena/internal/activity"
	"yadotena/internal/config"
	"yadotena/internal/sse"
)

type Server struct {
	Cfg   config.Config
	Pool  *pgxpool.Pool
	Log   *activity.Logger
	Hub   *sse.Hub
	Redis *redis.Client // optional Upstash; nil = no cache/rate-limit
}

func New(cfg config.Config, pool *pgxpool.Pool, rdb *redis.Client) *Server {
	hub := sse.NewHub()
	hub.AttachRedis(context.Background(), rdb)
	return &Server{
		Cfg:   cfg,
		Pool:  pool,
		Log:   &activity.Logger{Pool: pool},
		Hub:   hub,
		Redis: rdb,
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
