-- ============================================================================
-- Migration 000017: Comprehensive Audit & Activity System
-- ============================================================================
-- Implements Git-like audit trail with:
-- - Operations (correlation IDs for grouping related events)
-- - Audit events (immutable business actions)
-- - Change sets (before/after field diffs)
-- - Entity history tracking
-- - Human-readable action vocabulary
-- ============================================================================

-- ============================================================================
-- 1. OPERATIONS (Correlation IDs - Git commit equivalent)
-- ============================================================================
-- Groups related audit events into a single business operation
-- e.g., "Complete Order #10482" may generate 5 events but 1 operation
CREATE TABLE IF NOT EXISTS audit_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Human-readable operation description
    -- e.g., "Completed Order #10482", "Changed Cappuccino price"
    description TEXT NOT NULL,
    
    -- Optional reason for the operation (required for sensitive actions)
    reason TEXT,
    
    -- Actor who initiated the operation
    actor_id VARCHAR(255) NOT NULL,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    
    -- Device/session context (optional, for security audit)
    session_id TEXT,
    device_id TEXT,
    ip_address INET,
    user_agent TEXT,
    
    -- Operation status
    status TEXT NOT NULL DEFAULT 'COMPLETED', -- COMPLETED, FAILED, REVERTED
    
    -- Timestamps
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Metadata for additional context
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for operation queries
CREATE INDEX IF NOT EXISTS idx_audit_operations_actor ON audit_operations(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_operations_occurred ON audit_operations(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_operations_status ON audit_operations(status);

-- ============================================================================
-- 2. AUDIT EVENTS (Immutable business actions)
-- ============================================================================
-- Each meaningful business action creates an immutable event
-- Events are connected to operations and linked to entities
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Operation grouping (correlation ID)
    operation_id UUID NOT NULL REFERENCES audit_operations(id) ON DELETE RESTRICT,
    
    -- Actor information (denormalized for query performance)
    actor_id VARCHAR(255) NOT NULL,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    
    -- Action vocabulary (controlled set of business actions)
    action TEXT NOT NULL,
    -- Examples: ORDER_CREATED, MENU_ITEM_PRICE_CHANGED, PAYMENT_VERIFIED
    
    -- Primary entity affected
    entity_type TEXT NOT NULL, -- ORDER, PAYMENT, MENU_ITEM, EXPENSE, STAFF, etc.
    entity_id TEXT NOT NULL,   -- The ID of the entity
    entity_name TEXT,          -- Human-readable name (e.g., "Cappuccino", "Order #10482")
    
    -- Optional related entity (for linking related objects)
    related_entity_type TEXT,
    related_entity_id TEXT,
    related_entity_name TEXT,
    
    -- Before/after snapshots for critical changes (optional)
    before_snapshot JSONB,
    after_snapshot JSONB,
    
    -- Human-readable description of what happened
    description TEXT NOT NULL,
    
    -- Severity level for UI prioritization
    severity TEXT NOT NULL DEFAULT 'NORMAL',
    -- NORMAL: order created, item added
    -- IMPORTANT: price changed, payment verified
    -- SENSITIVE: payment voided, order cancelled, staff suspended
    -- SECURITY: failed login, unauthorized action
    
    -- Timestamp
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes for efficient querying
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for event queries
CREATE INDEX IF NOT EXISTS idx_audit_events_operation ON audit_events(operation_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events(action);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_occurred ON audit_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_severity ON audit_events(severity);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity_type ON audit_events(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity_name ON audit_events USING gin(to_tsvector('english', COALESCE(entity_name, '')));

-- ============================================================================
-- 3. CHANGE SETS (Before/after field diffs)
-- ============================================================================
-- Captures exactly what changed in a business action
-- Human-readable diffs instead of raw JSON
CREATE TABLE IF NOT EXISTS audit_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event this change belongs to
    event_id UUID NOT NULL REFERENCES audit_events(id) ON DELETE CASCADE,
    
    -- What field changed
    field TEXT NOT NULL, -- "price", "category", "status", "description"
    field_label TEXT NOT NULL, -- Human-readable: "Price", "Category", "Status"
    
    -- Old and new values (stored as text for display)
    old_value TEXT,
    new_value TEXT,
    
    -- For structured data, store original types
    old_value_json JSONB,
    new_value_json JSONB,
    
    -- Type of change
    change_type TEXT NOT NULL DEFAULT 'UPDATED',
    -- UPDATED: field value changed
    -- ADDED: new item/value added
    -- REMOVED: item/value removed
    -- UNCHANGED: field didn't change (for context)
    
    -- Display order
    sort_order INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for change queries
CREATE INDEX IF NOT EXISTS idx_audit_changes_event ON audit_changes(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_changes_field ON audit_changes(field);

-- ============================================================================
-- 4. ENTITY HISTORY VIEWS
-- ============================================================================
-- Materialized view for fast entity history queries
-- This powers the "View history" feature on any entity

-- Entity history summary (latest events per entity)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_entity_history AS
SELECT 
    entity_type,
    entity_id,
    MAX(occurred_at) AS last_event_at,
    COUNT(*) AS total_events,
    COUNT(*) FILTER (WHERE severity = 'SENSITIVE') AS sensitive_events,
    COUNT(*) FILTER (WHERE severity = 'SECURITY') AS security_events
FROM audit_events
GROUP BY entity_type, entity_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_entity_history ON mv_entity_history(entity_type, entity_id);

-- ============================================================================
-- 5. ACTION VOCABULARY TABLE (Reference for valid actions)
-- ============================================================================
-- Documents all valid business actions in the system
CREATE TABLE IF NOT EXISTS audit_action_vocabulary (
    action TEXT PRIMARY KEY,
    category TEXT NOT NULL, -- ORDERS, PAYMENTS, MENU, STAFF, EXPENSES, SETTINGS, SECURITY
    description TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'NORMAL',
    requires_reason BOOLEAN DEFAULT FALSE,
    requires_authorization BOOLEAN DEFAULT FALSE,
    is_sensitive BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert all defined business actions
INSERT INTO audit_action_vocabulary (action, category, description, severity, requires_reason, requires_authorization, is_sensitive) VALUES
-- Orders
('ORDER_CREATED', 'ORDERS', 'New order created', 'NORMAL', FALSE, FALSE, FALSE),
('ORDER_ITEM_ADDED', 'ORDERS', 'Item added to order', 'NORMAL', FALSE, FALSE, FALSE),
('ORDER_ITEM_REMOVED', 'ORDERS', 'Item removed from order', 'NORMAL', FALSE, FALSE, FALSE),
('ORDER_ITEM_UPDATED', 'ORDERS', 'Order item modified', 'NORMAL', FALSE, FALSE, FALSE),
('ORDER_ROUND_ADDED', 'ORDERS', 'New round appended to order', 'NORMAL', FALSE, FALSE, FALSE),
('ORDER_SENT_TO_KITCHEN', 'ORDERS', 'Order sent to kitchen', 'NORMAL', FALSE, FALSE, FALSE),
('ORDER_PREPARING', 'ORDERS', 'Kitchen started preparation', 'NORMAL', FALSE, FALSE, FALSE),
('ORDER_READY', 'ORDERS', 'Order ready for pickup/serving', 'NORMAL', FALSE, FALSE, FALSE),
('ORDER_SERVED', 'ORDERS', 'Order served to customer', 'NORMAL', FALSE, FALSE, FALSE),
('ORDER_COMPLETED', 'ORDERS', 'Order completed and paid', 'NORMAL', FALSE, FALSE, FALSE),
('ORDER_CANCELLED', 'ORDERS', 'Order cancelled', 'SENSITIVE', TRUE, TRUE, TRUE),
('ORDER_REOPENED', 'ORDERS', 'Cancelled order reopened', 'SENSITIVE', TRUE, TRUE, TRUE),

-- Payments
('PAYMENT_CREATED', 'PAYMENTS', 'Payment recorded', 'NORMAL', FALSE, FALSE, FALSE),
('PAYMENT_VERIFIED', 'PAYMENTS', 'Digital payment verified', 'IMPORTANT', FALSE, TRUE, FALSE),
('PAYMENT_REJECTED', 'PAYMENTS', 'Payment verification rejected', 'SENSITIVE', TRUE, TRUE, TRUE),
('PAYMENT_VOIDED', 'PAYMENTS', 'Payment voided', 'SENSITIVE', TRUE, TRUE, TRUE),
('PAYMENT_REFUNDED', 'PAYMENTS', 'Payment refunded', 'SENSITIVE', TRUE, TRUE, TRUE),
('PAYMENT_METHOD_CHANGED', 'PAYMENTS', 'Payment method updated', 'IMPORTANT', FALSE, TRUE, FALSE),

-- Menu
('MENU_ITEM_CREATED', 'MENU', 'New menu item created', 'IMPORTANT', FALSE, FALSE, FALSE),
('MENU_ITEM_UPDATED', 'MENU', 'Menu item details updated', 'IMPORTANT', FALSE, FALSE, FALSE),
('MENU_ITEM_PRICE_CHANGED', 'MENU', 'Menu item price changed', 'IMPORTANT', TRUE, FALSE, TRUE),
('MENU_ITEM_ARCHIVED', 'MENU', 'Menu item archived', 'IMPORTANT', FALSE, TRUE, FALSE),
('MENU_ITEM_RESTORED', 'MENU', 'Menu item restored from archive', 'IMPORTANT', FALSE, TRUE, FALSE),
('MENU_ITEM_AVAILABILITY_CHANGED', 'MENU', 'Menu item availability toggled', 'NORMAL', FALSE, FALSE, FALSE),
('MENU_CATEGORY_CREATED', 'MENU', 'New category created', 'IMPORTANT', FALSE, FALSE, FALSE),
('MENU_CATEGORY_UPDATED', 'MENU', 'Category details updated', 'IMPORTANT', FALSE, FALSE, FALSE),
('MENU_CATEGORY_REORDERED', 'MENU', 'Category display order changed', 'NORMAL', FALSE, FALSE, FALSE),

-- Addons
('ADDON_CREATED', 'MENU', 'New addon created', 'IMPORTANT', FALSE, FALSE, FALSE),
('ADDON_UPDATED', 'MENU', 'Addon details updated', 'IMPORTANT', FALSE, FALSE, FALSE),
('ADDON_PRICE_CHANGED', 'MENU', 'Addon price changed', 'IMPORTANT', TRUE, FALSE, TRUE),
('ADDON_ARCHIVED', 'MENU', 'Addon archived', 'IMPORTANT', FALSE, TRUE, FALSE),
('ADDON_ATTACHED', 'MENU', 'Addon attached to item/category', 'NORMAL', FALSE, FALSE, FALSE),
('ADDON_DETACHED', 'MENU', 'Addon detached from item/category', 'NORMAL', FALSE, FALSE, FALSE),

-- Staff
('STAFF_CREATED', 'STAFF', 'New staff member created', 'SENSITIVE', FALSE, TRUE, TRUE),
('STAFF_UPDATED', 'STAFF', 'Staff details updated', 'IMPORTANT', FALSE, FALSE, FALSE),
('STAFF_ROLE_CHANGED', 'STAFF', 'Staff role changed', 'SENSITIVE', TRUE, TRUE, TRUE),
('STAFF_SUSPENDED', 'STAFF', 'Staff account suspended', 'SENSITIVE', TRUE, TRUE, TRUE),
('STAFF_REACTIVATED', 'STAFF', 'Staff account reactivated', 'SENSITIVE', FALSE, TRUE, TRUE),
('STAFF_PIN_CHANGED', 'STAFF', 'Staff PIN changed', 'SENSITIVE', FALSE, TRUE, TRUE),

-- Expenses
('EXPENSE_CREATED', 'EXPENSES', 'Expense recorded', 'IMPORTANT', FALSE, FALSE, FALSE),
('EXPENSE_UPDATED', 'EXPENSES', 'Expense details updated', 'IMPORTANT', FALSE, FALSE, FALSE),
('EXPENSE_VOIDED', 'EXPENSES', 'Expense voided', 'SENSITIVE', TRUE, TRUE, TRUE),

-- Settings
('BUSINESS_SETTING_CHANGED', 'SETTINGS', 'Business settings updated', 'IMPORTANT', FALSE, TRUE, FALSE),
('PAYMENT_ACCOUNT_CREATED', 'SETTINGS', 'Payment account created', 'SENSITIVE', FALSE, TRUE, FALSE),
('PAYMENT_ACCOUNT_CHANGED', 'SETTINGS', 'Payment account updated', 'SENSITIVE', FALSE, TRUE, FALSE),
('PAYMENT_ACCOUNT_DISABLED', 'SETTINGS', 'Payment account disabled', 'SENSITIVE', FALSE, TRUE, FALSE),

-- Tables
('TABLE_CREATED', 'OPERATIONS', 'New table created', 'NORMAL', FALSE, FALSE, FALSE),
('TABLE_UPDATED', 'OPERATIONS', 'Table details updated', 'NORMAL', FALSE, FALSE, FALSE),
('TABLE_STATUS_CHANGED', 'OPERATIONS', 'Table status changed', 'NORMAL', FALSE, FALSE, FALSE),

-- Security
('LOGIN_SUCCESS', 'SECURITY', 'Successful login', 'NORMAL', FALSE, FALSE, FALSE),
('LOGIN_FAILED', 'SECURITY', 'Failed login attempt', 'SECURITY', FALSE, FALSE, TRUE),
('UNAUTHORIZED_ACTION', 'SECURITY', 'Unauthorized action attempted', 'SECURITY', FALSE, FALSE, TRUE)

ON CONFLICT (action) DO UPDATE SET
    description = EXCLUDED.description,
    severity = EXCLUDED.severity,
    requires_reason = EXCLUDED.requires_reason,
    requires_authorization = EXCLUDED.requires_authorization,
    is_sensitive = EXCLUDED.is_sensitive;

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to refresh entity history materialized view
CREATE OR REPLACE FUNCTION refresh_entity_history()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_entity_history;
END;
$$ LANGUAGE plpgsql;

-- Function to get entity history
CREATE OR REPLACE FUNCTION get_entity_history(
    p_entity_type TEXT,
    p_entity_id TEXT,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    event_id UUID,
    action TEXT,
    description TEXT,
    actor_name TEXT,
    actor_role TEXT,
    severity TEXT,
    occurred_at TIMESTAMPTZ,
    change_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ae.id,
        ae.action,
        ae.description,
        ae.actor_name,
        ae.actor_role,
        ae.severity,
        ae.occurred_at,
        (SELECT COUNT(*) FROM audit_changes ac WHERE ac.event_id = ae.id)
    FROM audit_events ae
    WHERE ae.entity_type = p_entity_type
      AND ae.entity_id = p_entity_id
    ORDER BY ae.occurred_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get operation details with all related events
CREATE OR REPLACE FUNCTION get_operation_details(
    p_operation_id UUID
)
RETURNS TABLE (
    event_id UUID,
    action TEXT,
    description TEXT,
    entity_type TEXT,
    entity_id TEXT,
    entity_name TEXT,
    occurred_at TIMESTAMPTZ,
    change_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ae.id,
        ae.action,
        ae.description,
        ae.entity_type,
        ae.entity_id,
        ae.entity_name,
        ae.occurred_at,
        (SELECT COUNT(*) FROM audit_changes ac WHERE ac.event_id = ae.id)
    FROM audit_events ae
    WHERE ae.operation_id = p_operation_id
    ORDER BY ae.occurred_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. AUDIT LOG PROTECTION
-- ============================================================================

-- Prevent updates to audit events (immutable)
CREATE OR REPLACE FUNCTION prevent_audit_event_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit events are immutable and cannot be updated';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_audit_event_update
    BEFORE UPDATE ON audit_events
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_event_update();

-- Prevent updates to audit changes (immutable)
CREATE OR REPLACE FUNCTION prevent_audit_change_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit changes are immutable and cannot be updated';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_audit_change_update
    BEFORE UPDATE ON audit_changes
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_change_update();

-- Prevent updates to audit operations (immutable)
CREATE OR REPLACE FUNCTION prevent_audit_operation_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit operations are immutable and cannot be updated';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_audit_operation_update
    BEFORE UPDATE ON audit_operations
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_operation_update();

-- ============================================================================
-- 8. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_events_entity_occurred 
    ON audit_events(entity_type, entity_id, occurred_at DESC);
    
CREATE INDEX IF NOT EXISTS idx_audit_events_action_occurred 
    ON audit_events(action, occurred_at DESC);
    
CREATE INDEX IF NOT EXISTS idx_audit_events_severity_occurred 
    ON audit_events(severity, occurred_at DESC);

-- Full-text search on entity names
CREATE INDEX IF NOT EXISTS idx_audit_events_entity_name_search 
    ON audit_events USING gin(to_tsvector('english', COALESCE(entity_name, '')));

-- Full-text search on descriptions
CREATE INDEX IF NOT EXISTS idx_audit_events_description_search 
    ON audit_events USING gin(to_tsvector('english', description));

-- ============================================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE audit_operations IS 'Groups related audit events into business operations (Git commit equivalent)';
COMMENT ON TABLE audit_events IS 'Immutable log of all meaningful business actions';
COMMENT ON TABLE audit_changes IS 'Before/after field diffs for human-readable change tracking';
COMMENT ON TABLE audit_action_vocabulary IS 'Controlled vocabulary of all valid business actions';

COMMENT ON COLUMN audit_events.action IS 'Controlled action vocabulary - see audit_action_vocabulary table';
COMMENT ON COLUMN audit_events.severity IS 'NORMAL, IMPORTANT, SENSITIVE, or SECURITY';
COMMENT ON COLUMN audit_changes.change_type IS 'UPDATED, ADDED, REMOVED, or UNCHANGED';

-- ============================================================================
-- 10. SAMPLE DATA FOR TESTING
-- ============================================================================

-- Create a sample operation
INSERT INTO audit_operations (id, description, reason, actor_id, actor_name, actor_role, status, occurred_at)
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Changed Cappuccino price', 'Supplier price increased', 'usr-mgr-1', 'Abebe Manager', 'MANAGER', 'COMPLETED', NOW() - INTERVAL '1 hour');

-- Create sample events for that operation
INSERT INTO audit_events (id, operation_id, actor_id, actor_name, actor_role, action, entity_type, entity_id, entity_name, description, severity, occurred_at)
VALUES 
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'usr-mgr-1', 'Abebe Manager', 'MANAGER', 
     'MENU_ITEM_PRICE_CHANGED', 'MENU_ITEM', 'item-bev-02', 'Signature Double Macchiato', 
     'Changed Cappuccino price from 120 ETB to 135 ETB', 'IMPORTANT', NOW() - INTERVAL '1 hour');

-- Create sample changes
INSERT INTO audit_changes (event_id, field, field_label, old_value, new_value, change_type, sort_order)
VALUES 
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'price', 'Price', '120 ETB', '135 ETB', 'UPDATED', 1);

-- Refresh materialized view
REFRESH MATERIALIZED VIEW mv_entity_history;
