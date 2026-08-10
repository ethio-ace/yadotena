package main

import (
	"context"
	"log"
	"os"
	"time"

	"yadotena/internal/config"
	"yadotena/internal/db"
)

// One-shot migrate + seed against DATABASE_URL (Neon or local).
func main() {
	cfg := config.Load()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer pool.Close()

	mig := cfg.MigrationsDir
	if mig == "" {
		mig = "migrations"
	}
	seeds := cfg.SeedsDir
	if seeds == "" {
		seeds = "seeds"
	}

	log.Printf("migrating from %s …", mig)
	if err := db.Migrate(ctx, pool, mig); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	log.Printf("seeding from %s …", seeds)
	if err := db.Seed(ctx, pool, seeds); err != nil {
		log.Fatalf("seed: %v", err)
	}

	var staff, cats, items, tables, orders, expenses, productCats, products int
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM staff`).Scan(&staff)
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM categories`).Scan(&cats)
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM menu_items`).Scan(&items)
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM cafe_tables`).Scan(&tables)
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM orders`).Scan(&orders)
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM expenses WHERE deleted_at IS NULL`).Scan(&expenses)
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM product_categories`).Scan(&productCats)
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM products`).Scan(&products)

	log.Printf("done — staff=%d categories=%d items=%d tables=%d orders=%d expenses=%d product_categories=%d products=%d",
		staff, cats, items, tables, orders, expenses, productCats, products)
	os.Exit(0)
}
