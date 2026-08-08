package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"yadotena/internal/cache"
	"yadotena/internal/config"
	"yadotena/internal/db"
	"yadotena/internal/server"
)

func main() {
	cfg := config.Load()
	if cfg.AppEnv == "production" && (cfg.JWTSecret == "" || cfg.JWTSecret == "dev-yadotena-secret-change-me") {
		log.Fatal("JWT_SECRET must be set in production")
	}
	_ = os.MkdirAll(cfg.UploadsDir, 0o755)

	ctx := context.Background()
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer pool.Close()

	if err := db.Migrate(ctx, pool, cfg.MigrationsDir); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	if cfg.RunSeeds {
		if err := db.Seed(ctx, pool, cfg.SeedsDir); err != nil {
			log.Fatalf("seed: %v", err)
		}
	}

	rdb := cache.Connect(cfg.RedisURL)
	if rdb != nil {
		defer rdb.Close()
		log.Printf("redis: connected")
	}

	srv := server.New(cfg, pool, rdb)
	httpServer := &http.Server{
		Addr:              ":" + cfg.AppPort,
		Handler:           srv.Router(),
		ReadHeaderTimeout: 10 * time.Second,
	}
	log.Printf("yadotena api on :%s env=%s", cfg.AppPort, cfg.AppEnv)
	log.Fatal(httpServer.ListenAndServe())
}
