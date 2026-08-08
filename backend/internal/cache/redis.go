package cache

import (
	"context"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

// Connect opens an Upstash/Redis client. Returns nil if url is empty (in-memory only mode).
func Connect(url string) *redis.Client {
	if url == "" {
		return nil
	}
	opt, err := redis.ParseURL(url)
	if err != nil {
		log.Printf("redis: invalid REDIS_URL: %v (continuing without cache)", err)
		return nil
	}
	client := redis.NewClient(opt)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("redis: ping failed: %v (continuing without cache)", err)
		_ = client.Close()
		return nil
	}
	return client
}

// AllowRate returns true if the key is under limit within window. If client is nil, always allows.
func AllowRate(ctx context.Context, client *redis.Client, key string, limit int, window time.Duration) bool {
	if client == nil || limit <= 0 {
		return true
	}
	n, err := client.Incr(ctx, key).Result()
	if err != nil {
		return true
	}
	if n == 1 {
		_ = client.Expire(ctx, key, window).Err()
	}
	return n <= int64(limit)
}
