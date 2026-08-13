-- Recreate normalized activity_logs table for staff audit history & diff tracking
DROP TABLE IF EXISTS activity_logs CASCADE;

CREATE TABLE activity_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL DEFAULT 'system',
    user_name VARCHAR(128) NOT NULL DEFAULT 'Staff Member',
    user_role VARCHAR(32) NOT NULL DEFAULT 'WAITER',
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    prev_state JSONB DEFAULT NULL,
    next_state JSONB DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user_role ON activity_logs(user_role);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
