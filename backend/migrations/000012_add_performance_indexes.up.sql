CREATE INDEX IF NOT EXISTS idx_orders_table_status ON orders(table_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_dining_sessions_table_status ON dining_sessions(table_id, status);
CREATE INDEX IF NOT EXISTS idx_service_requests_table_status ON service_requests(table_id, status);
CREATE INDEX IF NOT EXISTS idx_menu_item_addons_item_id ON menu_item_addons(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
