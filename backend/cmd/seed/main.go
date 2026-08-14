package main

import (
	"context"
	"fmt"
	"log"

	"github.com/joho/godotenv"

	"yadotena/internal/config"
	"yadotena/internal/db"
)

func main() {
	_ = godotenv.Load(".env")
	cfg := config.Load()

	if cfg.DatabaseURL == "" {
		log.Fatal("DATABASE_URL is empty in environment or .env file")
	}

	fmt.Println("============================================================")
	fmt.Println("🚀 Yadotena Database Migration & Seeding Tool")
	fmt.Println("============================================================")
	fmt.Printf("Connecting to database: %s\n", maskConnStr(cfg.DatabaseURL))

	ctx := context.Background()
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("❌ Database connection error: %v", err)
	}
	defer pool.Close()

	fmt.Println("📡 Successfully connected to PostgreSQL!")

	fmt.Println("\n📦 Running database migrations from 'migrations/'...")
	if err := db.Migrate(ctx, pool, cfg.MigrationsDir); err != nil {
		log.Fatalf("❌ Migration error: %v", err)
	}
	fmt.Println("✅ All migrations applied successfully!")

	fmt.Println("\n🌱 Running database seed scripts from 'seeds/'...")
	if err := db.Seed(ctx, pool, cfg.SeedsDir); err != nil {
		log.Fatalf("❌ Seeding error: %v", err)
	}
	fmt.Println("✅ All seed scripts executed successfully!")

	fmt.Println("\n📊 Database Population Summary:")
	tables := []string{
		"users",
		"menu_categories",
		"menu_items",
		"menu_item_addons",
		"tables",
		"orders",
		"order_items",
		"payments",
		"activity_logs",
		"expenses",
		"dining_sessions",
		"restaurant_settings",
	}

	for _, tbl := range tables {
		var count int
		query := fmt.Sprintf("SELECT COUNT(*) FROM %s", tbl)
		err := pool.QueryRow(ctx, query).Scan(&count)
		if err != nil {
			fmt.Printf("  - %-20s : ERROR (%v)\n", tbl, err)
		} else {
			fmt.Printf("  - %-20s : %d rows\n", tbl, count)
		}
	}

	fmt.Println("============================================================")
	fmt.Println("🎉 Database successfully seeded with 3 months of real data!")
	fmt.Println("============================================================")
}

func maskConnStr(s string) string {
	if len(s) > 25 {
		return s[:15] + "..." + s[len(s)-10:]
	}
	return s
}
