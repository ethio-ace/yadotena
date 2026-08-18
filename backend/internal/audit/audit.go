package audit

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ============================================================================
// TYPES
// ============================================================================

// Severity levels for audit events
type Severity string

const (
	SeverityNormal    Severity = "NORMAL"
	SeverityImportant Severity = "IMPORTANT"
	SeveritySensitive Severity = "SENSITIVE"
	SeveritySecurity  Severity = "SECURITY"
)

// Change types for field diffs
type ChangeType string

const (
	ChangeTypeUpdated  ChangeType = "UPDATED"
	ChangeTypeAdded    ChangeType = "ADDED"
	ChangeTypeRemoved  ChangeType = "REMOVED"
	ChangeTypeUnchanged ChangeType = "UNCHANGED"
)

// Entity types for audit events
type EntityType string

const (
	EntityOrder      EntityType = "ORDER"
	EntityPayment    EntityType = "PAYMENT"
	EntityMenuItem   EntityType = "MENU_ITEM"
	EntityCategory   EntityType = "MENU_CATEGORY"
	EntityAddon      EntityType = "ADDON"
	EntityStaff      EntityType = "STAFF"
	EntityExpense    EntityType = "EXPENSE"
	EntityTable      EntityType = "TABLE"
	EntitySetting    EntityType = "SETTING"
	EntityPaymentAcc EntityType = "PAYMENT_ACCOUNT"
)

// ============================================================================
// CORE STRUCTS
// ============================================================================

// Change represents a before/after field diff
type Change struct {
	Field       string     `json:"field"`
	FieldLabel  string     `json:"field_label"`
	OldValue    *string    `json:"old_value,omitempty"`
	NewValue    *string    `json:"new_value,omitempty"`
	OldValueJSON any       `json:"old_value_json,omitempty"`
	NewValueJSON any       `json:"new_value_json,omitempty"`
	ChangeType  ChangeType `json:"change_type"`
	SortOrder   int        `json:"sort_order"`
}

// Operation represents a business operation (Git commit equivalent)
type Operation struct {
	ID          uuid.UUID  `json:"id"`
	Description string     `json:"description"`
	Reason      *string    `json:"reason,omitempty"`
	ActorID     string     `json:"actor_id"`
	ActorName   string     `json:"actor_name"`
	ActorRole   string     `json:"actor_role"`
	SessionID   *string    `json:"session_id,omitempty"`
	DeviceID    *string    `json:"device_id,omitempty"`
	IPAddress   *string    `json:"ip_address,omitempty"`
	UserAgent   *string    `json:"user_agent,omitempty"`
	Status      string     `json:"status"`
	OccurredAt  time.Time  `json:"occurred_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	Metadata    map[string]any `json:"metadata,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

// Event represents an immutable business action
type Event struct {
	ID                 uuid.UUID  `json:"id"`
	OperationID        uuid.UUID  `json:"operation_id"`
	ActorID            string     `json:"actor_id"`
	ActorName          string     `json:"actor_name"`
	ActorRole          string     `json:"actor_role"`
	Action             string     `json:"action"`
	EntityType         EntityType `json:"entity_type"`
	EntityID           string     `json:"entity_id"`
	EntityName         *string    `json:"entity_name,omitempty"`
	RelatedEntityType  *string    `json:"related_entity_type,omitempty"`
	RelatedEntityID    *string    `json:"related_entity_id,omitempty"`
	RelatedEntityName  *string    `json:"related_entity_name,omitempty"`
	BeforeSnapshot     map[string]any `json:"before_snapshot,omitempty"`
	AfterSnapshot      map[string]any `json:"after_snapshot,omitempty"`
	Description        string     `json:"description"`
	Severity           Severity   `json:"severity"`
	OccurredAt         time.Time  `json:"occurred_at"`
	CreatedAt          time.Time  `json:"created_at"`
}

// EventWithChanges includes the event and its associated changes
type EventWithChanges struct {
	Event
	Changes []Change `json:"changes"`
}

// OperationWithEvents includes the operation and all its events
type OperationWithEvents struct {
	Operation
	Events []EventWithChanges `json:"events"`
}

// ============================================================================
// AUDIT LOGGER
// ============================================================================

// Logger provides audit event recording capabilities
type Logger struct {
	Pool *pgxpool.Pool
}

// NewLogger creates a new audit logger
func NewLogger(pool *pgxpool.Pool) *Logger {
	return &Logger{Pool: pool}
}

// ============================================================================
// OPERATION RECORDING
// ============================================================================

// CreateOperation creates a new business operation (Git commit equivalent)
func (l *Logger) CreateOperation(ctx context.Context, params CreateOperationParams) (*Operation, error) {
	operation := &Operation{
		ID:          uuid.New(),
		Description: params.Description,
		Reason:      params.Reason,
		ActorID:     params.ActorID,
		ActorName:   params.ActorName,
		ActorRole:   params.ActorRole,
		SessionID:   params.SessionID,
		DeviceID:    params.DeviceID,
		IPAddress:   params.IPAddress,
		UserAgent:   params.UserAgent,
		Status:      "COMPLETED",
		OccurredAt:  time.Now(),
		CreatedAt:   time.Now(),
	}
	
	if params.Metadata != nil {
		operation.Metadata = params.Metadata
	}
	
	_, err := l.Pool.Exec(ctx, `
		INSERT INTO audit_operations (
			id, description, reason, actor_id, actor_name, actor_role,
			session_id, device_id, ip_address, user_agent, status,
			occurred_at, metadata, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
		operation.ID, operation.Description, operation.Reason,
		operation.ActorID, operation.ActorName, operation.ActorRole,
		operation.SessionID, operation.DeviceID, operation.IPAddress,
		operation.UserAgent, operation.Status, operation.OccurredAt,
		operation.Metadata, operation.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create operation: %w", err)
	}
	
	return operation, nil
}

// CreateOperationParams parameters for creating an operation
type CreateOperationParams struct {
	Description string
	Reason      *string
	ActorID     string
	ActorName   string
	ActorRole   string
	SessionID   *string
	DeviceID    *string
	IPAddress   *string
	UserAgent   *string
	Metadata    map[string]any
}

// ============================================================================
// EVENT RECORDING
// ============================================================================

// RecordEvent records an audit event with optional changes
func (l *Logger) RecordEvent(ctx context.Context, params RecordEventParams) (*Event, error) {
	event := &Event{
		ID:                uuid.New(),
		OperationID:       params.OperationID,
		ActorID:           params.ActorID,
		ActorName:         params.ActorName,
		ActorRole:         params.ActorRole,
		Action:            params.Action,
		EntityType:        params.EntityType,
		EntityID:          params.EntityID,
		EntityName:        params.EntityName,
		RelatedEntityType: params.RelatedEntityType,
		RelatedEntityID:   params.RelatedEntityID,
		RelatedEntityName: params.RelatedEntityName,
		Description:       params.Description,
		Severity:          params.Severity,
		OccurredAt:        time.Now(),
		CreatedAt:         time.Now(),
	}
	
	if params.BeforeSnapshot != nil {
		event.BeforeSnapshot = params.BeforeSnapshot
	}
	if params.AfterSnapshot != nil {
		event.AfterSnapshot = params.AfterSnapshot
	}
	
	// Begin transaction
	tx, err := l.Pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)
	
	// Insert event
	_, err = tx.Exec(ctx, `
		INSERT INTO audit_events (
			id, operation_id, actor_id, actor_name, actor_role,
			action, entity_type, entity_id, entity_name,
			related_entity_type, related_entity_id, related_entity_name,
			before_snapshot, after_snapshot, description, severity,
			occurred_at, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
		event.ID, event.OperationID, event.ActorID, event.ActorName, event.ActorRole,
		event.Action, event.EntityType, event.EntityID, event.EntityName,
		event.RelatedEntityType, event.RelatedEntityID, event.RelatedEntityName,
		event.BeforeSnapshot, event.AfterSnapshot, event.Description, event.Severity,
		event.OccurredAt, event.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert event: %w", err)
	}
	
	// Insert changes if provided
	if len(params.Changes) > 0 {
		for i, change := range params.Changes {
			if change.SortOrder == 0 {
				change.SortOrder = i + 1
			}
			_, err = tx.Exec(ctx, `
				INSERT INTO audit_changes (
					event_id, field, field_label, old_value, new_value,
					old_value_json, new_value_json, change_type, sort_order, created_at
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
				event.ID, change.Field, change.FieldLabel, change.OldValue, change.NewValue,
				change.OldValueJSON, change.NewValueJSON, change.ChangeType, change.SortOrder, time.Now(),
			)
			if err != nil {
				return nil, fmt.Errorf("failed to insert change: %w", err)
			}
		}
	}
	
	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}
	
	return event, nil
}

// RecordEventParams parameters for recording an event
type RecordEventParams struct {
	OperationID       uuid.UUID
	ActorID           string
	ActorName         string
	ActorRole         string
	Action            string
	EntityType        EntityType
	EntityID          string
	EntityName        *string
	RelatedEntityType *string
	RelatedEntityID   *string
	RelatedEntityName *string
	BeforeSnapshot    map[string]any
	AfterSnapshot     map[string]any
	Description       string
	Severity          Severity
	Changes           []Change
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

// GetOperation retrieves an operation by ID
func (l *Logger) GetOperation(ctx context.Context, operationID uuid.UUID) (*Operation, error) {
	var op Operation
	err := l.Pool.QueryRow(ctx, `
		SELECT id, description, reason, actor_id, actor_name, actor_role,
			   session_id, device_id, ip_address, user_agent, status,
			   occurred_at, completed_at, metadata, created_at
		FROM audit_operations
		WHERE id = $1`, operationID).Scan(
		&op.ID, &op.Description, &op.Reason, &op.ActorID, &op.ActorName, &op.ActorRole,
		&op.SessionID, &op.DeviceID, &op.IPAddress, &op.UserAgent, &op.Status,
		&op.OccurredAt, &op.CompletedAt, &op.Metadata, &op.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get operation: %w", err)
	}
	return &op, nil
}

// GetOperationWithEvents retrieves an operation with all its events
func (l *Logger) GetOperationWithEvents(ctx context.Context, operationID uuid.UUID) (*OperationWithEvents, error) {
	op, err := l.GetOperation(ctx, operationID)
	if err != nil {
		return nil, err
	}
	
	rows, err := l.Pool.Query(ctx, `
		SELECT id, operation_id, actor_id, actor_name, actor_role,
			   action, entity_type, entity_id, entity_name,
			   related_entity_type, related_entity_id, related_entity_name,
			   before_snapshot, after_snapshot, description, severity,
			   occurred_at, created_at
		FROM audit_events
		WHERE operation_id = $1
		ORDER BY occurred_at ASC`, operationID)
	if err != nil {
		return nil, fmt.Errorf("failed to query events: %w", err)
	}
	defer rows.Close()
	
	var events []EventWithChanges
	for rows.Next() {
		var e EventWithChanges
		err := rows.Scan(
			&e.ID, &e.OperationID, &e.ActorID, &e.ActorName, &e.ActorRole,
			&e.Action, &e.EntityType, &e.EntityID, &e.EntityName,
			&e.RelatedEntityType, &e.RelatedEntityID, &e.RelatedEntityName,
			&e.BeforeSnapshot, &e.AfterSnapshot, &e.Description, &e.Severity,
			&e.OccurredAt, &e.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan event: %w", err)
		}
		
		// Get changes for this event
		changes, err := l.GetEventChanges(ctx, e.ID)
		if err != nil {
			return nil, err
		}
		e.Changes = changes
		
		events = append(events, e)
	}
	
	return &OperationWithEvents{
		Operation: *op,
		Events:    events,
	}, nil
}

// GetEventChanges retrieves all changes for an event
func (l *Logger) GetEventChanges(ctx context.Context, eventID uuid.UUID) ([]Change, error) {
	rows, err := l.Pool.Query(ctx, `
		SELECT id, event_id, field, field_label, old_value, new_value,
			   old_value_json, new_value_json, change_type, sort_order, created_at
		FROM audit_changes
		WHERE event_id = $1
		ORDER BY sort_order ASC`, eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to query changes: %w", err)
	}
	defer rows.Close()
	
	var changes []Change
	for rows.Next() {
		var c Change
		var id uuid.UUID
		var eventID uuid.UUID
		var createdAt time.Time
		err := rows.Scan(
			&id, &eventID, &c.Field, &c.FieldLabel, &c.OldValue, &c.NewValue,
			&c.OldValueJSON, &c.NewValueJSON, &c.ChangeType, &c.SortOrder, &createdAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan change: %w", err)
		}
		changes = append(changes, c)
	}
	
	return changes, nil
}

// GetEntityHistory retrieves the history of an entity
func (l *Logger) GetEntityHistory(ctx context.Context, entityType EntityType, entityID string, limit int) ([]EventWithChanges, error) {
	if limit <= 0 {
		limit = 50
	}
	
	rows, err := l.Pool.Query(ctx, `
		SELECT id, operation_id, actor_id, actor_name, actor_role,
			   action, entity_type, entity_id, entity_name,
			   related_entity_type, related_entity_id, related_entity_name,
			   before_snapshot, after_snapshot, description, severity,
			   occurred_at, created_at
		FROM audit_events
		WHERE entity_type = $1 AND entity_id = $2
		ORDER BY occurred_at DESC
		LIMIT $3`, entityType, entityID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query entity history: %w", err)
	}
	defer rows.Close()
	
	var events []EventWithChanges
	for rows.Next() {
		var e EventWithChanges
		err := rows.Scan(
			&e.ID, &e.OperationID, &e.ActorID, &e.ActorName, &e.ActorRole,
			&e.Action, &e.EntityType, &e.EntityID, &e.EntityName,
			&e.RelatedEntityType, &e.RelatedEntityID, &e.RelatedEntityName,
			&e.BeforeSnapshot, &e.AfterSnapshot, &e.Description, &e.Severity,
			&e.OccurredAt, &e.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan event: %w", err)
		}
		
		// Get changes for this event
		changes, err := l.GetEventChanges(ctx, e.ID)
		if err != nil {
			return nil, err
		}
		e.Changes = changes
		
		events = append(events, e)
	}
	
	return events, nil
}

// GetGlobalActivity retrieves recent activity across all entities
func (l *Logger) GetGlobalActivity(ctx context.Context, params GetActivityParams) ([]EventWithChanges, error) {
	query := `
		SELECT id, operation_id, actor_id, actor_name, actor_role,
			   action, entity_type, entity_id, entity_name,
			   related_entity_type, related_entity_id, related_entity_name,
			   before_snapshot, after_snapshot, description, severity,
			   occurred_at, created_at
		FROM audit_events
		WHERE 1=1`
	
	args := []any{}
	argIndex := 1
	
	// Apply filters
	if params.ActorID != nil {
		query += fmt.Sprintf(" AND actor_id = $%d", argIndex)
		args = append(args, *params.ActorID)
		argIndex++
	}
	
	if params.EntityType != nil {
		query += fmt.Sprintf(" AND entity_type = $%d", argIndex)
		args = append(args, *params.EntityType)
		argIndex++
	}
	
	if params.Severity != nil {
		query += fmt.Sprintf(" AND severity = $%d", argIndex)
		args = append(args, *params.Severity)
		argIndex++
	}
	
	if params.Since != nil {
		query += fmt.Sprintf(" AND occurred_at >= $%d", argIndex)
		args = append(args, *params.Since)
		argIndex++
	}
	
	if params.Search != nil && *params.Search != "" {
		query += fmt.Sprintf(" AND (to_tsvector('english', description) @@ plainto_tsquery('english', $%d) OR entity_name ILIKE '%%' || $%d || '%%')", argIndex, argIndex)
		args = append(args, *params.Search, *params.Search)
		argIndex++
	}
	
	query += " ORDER BY occurred_at DESC"
	
	if params.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, params.Limit)
		argIndex++
	}
	
	rows, err := l.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query activity: %w", err)
	}
	defer rows.Close()
	
	var events []EventWithChanges
	for rows.Next() {
		var e EventWithChanges
		err := rows.Scan(
			&e.ID, &e.OperationID, &e.ActorID, &e.ActorName, &e.ActorRole,
			&e.Action, &e.EntityType, &e.EntityID, &e.EntityName,
			&e.RelatedEntityType, &e.RelatedEntityID, &e.RelatedEntityName,
			&e.BeforeSnapshot, &e.AfterSnapshot, &e.Description, &e.Severity,
			&e.OccurredAt, &e.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan event: %w", err)
		}
		
		// Get changes for this event
		changes, err := l.GetEventChanges(ctx, e.ID)
		if err != nil {
			return nil, err
		}
		e.Changes = changes
		
		events = append(events, e)
	}
	
	return events, nil
}

// GetActivityParams parameters for querying activity
type GetActivityParams struct {
	ActorID    *string
	EntityType *EntityType
	Severity   *Severity
	Since      *time.Time
	Search     *string
	Limit      int
}

// GetAttentionItems retrieves items that need attention (sensitive/security events)
func (l *Logger) GetAttentionItems(ctx context.Context, since time.Time) ([]EventWithChanges, error) {
	severity := SeveritySensitive
	return l.GetGlobalActivity(ctx, GetActivityParams{
		Severity: &severity,
		Since:    &since,
		Limit:    10,
	})
}

// GetDailySummary retrieves a summary of activity for a specific day
func (l *Logger) GetDailySummary(ctx context.Context, date time.Time) (*DailySummary, error) {
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)
	
	summary := &DailySummary{
		Date:          startOfDay,
		TotalEvents:   0,
		ByCategory:    make(map[string]int),
		ByActor:       make(map[string]int),
		ByEntity:      make(map[string]int),
		BySeverity:    make(map[string]int),
	}
	
	rows, err := l.Pool.Query(ctx, `
		SELECT action, actor_name, entity_type, severity, COUNT(*)
		FROM audit_events
		WHERE occurred_at >= $1 AND occurred_at < $2
		GROUP BY action, actor_name, entity_type, severity`, startOfDay, endOfDay)
	if err != nil {
		return nil, fmt.Errorf("failed to query daily summary: %w", err)
	}
	defer rows.Close()
	
	for rows.Next() {
		var action, actorName, entityType, severity string
		var count int
		err := rows.Scan(&action, &actorName, &entityType, &severity, &count)
		if err != nil {
			return nil, fmt.Errorf("failed to scan summary row: %w", err)
		}
		
		summary.TotalEvents += count
		summary.ByCategory[action] = count
		summary.ByActor[actorName] = count
		summary.ByEntity[entityType] = count
		summary.BySeverity[severity] = count
	}
	
	return summary, nil
}

// DailySummary represents a summary of activity for a day
type DailySummary struct {
	Date         time.Time         `json:"date"`
	TotalEvents  int               `json:"total_events"`
	ByCategory   map[string]int    `json:"by_category"`
	ByActor      map[string]int    `json:"by_actor"`
	ByEntity     map[string]int    `json:"by_entity"`
	BySeverity   map[string]int    `json:"by_severity"`
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// StringPtr returns a pointer to the string value
func StringPtr(s string) *string {
	return &s
}

// IntPtr returns a pointer to the int value
func IntPtr(i int) *int {
	return &i
}

// TimePtr returns a pointer to the time value
func TimePtr(t time.Time) *time.Time {
	return &t
}

// ChangeFromField creates a Change struct for a field update
func ChangeFromField(field, fieldLabel string, oldVal, newVal any) Change {
	oldStr := fmt.Sprintf("%v", oldVal)
	newStr := fmt.Sprintf("%v", newVal)
	
	return Change{
		Field:       field,
		FieldLabel:  fieldLabel,
		OldValue:    &oldStr,
		NewValue:    &newStr,
		ChangeType:  ChangeTypeUpdated,
	}
}

// ChangeFromAddition creates a Change struct for an addition
func ChangeFromAddition(field, fieldLabel string, newVal any) Change {
	newStr := fmt.Sprintf("%v", newVal)
	
	return Change{
		Field:       field,
		FieldLabel:  fieldLabel,
		NewValue:    &newStr,
		ChangeType:  ChangeTypeAdded,
	}
}

// ChangeFromRemoval creates a Change struct for a removal
func ChangeFromRemoval(field, fieldLabel string, oldVal any) Change {
	oldStr := fmt.Sprintf("%v", oldVal)
	
	return Change{
		Field:       field,
		FieldLabel:  fieldLabel,
		OldValue:    &oldStr,
		ChangeType:  ChangeTypeRemoved,
	}
}
