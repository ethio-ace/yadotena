package activity

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Logger struct {
	Pool *pgxpool.Pool
}

func (l *Logger) Write(ctx context.Context, actorID *uuid.UUID, actorName, action, entityType, entityID string, meta map[string]any) error {
	if meta == nil {
		meta = map[string]any{}
	}
	b, _ := json.Marshal(meta)
	var eid *string
	if entityID != "" {
		eid = &entityID
	}
	_, err := l.Pool.Exec(ctx, `
		INSERT INTO activity_logs (actor_id, actor_name, action, entity_type, entity_id, metadata)
		VALUES ($1,$2,$3,$4,$5,$6)`,
		actorID, nullIfEmpty(actorName), action, entityType, eid, b)
	return err
}

func nullIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
