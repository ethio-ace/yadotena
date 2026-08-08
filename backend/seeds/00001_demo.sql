-- Yadotena demo seed (aligned with yadotena-frontend mocks)
-- Demo PIN for all staff: 1234
-- bcrypt: $2a$10$IqDd2.JsX23YvGWEfk3pP.yM874YJ/kLAR8sVHYvZHNglhfqkOX4u
-- Safe to re-run: upserts on fixed IDs.

INSERT INTO settings (
  id, cafe_name, cafe_phone, cafe_address, accepting_orders,
  cash_enabled, digital_enabled, digital_methods, public_base_url, service_charge_percent
) VALUES (
  1, 'Yadotena Cafe & Resto', '+251911234567', 'Bole Road, Addis Ababa',
  true, true, true, '["Telebirr","CBE"]'::jsonb, 'http://localhost:3000', 10
)
ON CONFLICT (id) DO UPDATE SET
  cafe_name = EXCLUDED.cafe_name,
  cafe_phone = EXCLUDED.cafe_phone,
  cafe_address = EXCLUDED.cafe_address,
  accepting_orders = EXCLUDED.accepting_orders,
  cash_enabled = EXCLUDED.cash_enabled,
  digital_enabled = EXCLUDED.digital_enabled,
  digital_methods = EXCLUDED.digital_methods,
  service_charge_percent = EXCLUDED.service_charge_percent,
  updated_at = now();

INSERT INTO staff (id, phone, pin_hash, name, email, role, is_active) VALUES
('a0000000-0000-0000-0000-000000000001', '0900000001', '$2a$10$IqDd2.JsX23YvGWEfk3pP.yM874YJ/kLAR8sVHYvZHNglhfqkOX4u', 'Alice Owner', 'owner@demo.com', 'owner', true),
('a0000000-0000-0000-0000-000000000002', '0900000002', '$2a$10$IqDd2.JsX23YvGWEfk3pP.yM874YJ/kLAR8sVHYvZHNglhfqkOX4u', 'Bob Manager', 'manager@demo.com', 'manager', true),
('a0000000-0000-0000-0000-000000000003', '0900000003', '$2a$10$IqDd2.JsX23YvGWEfk3pP.yM874YJ/kLAR8sVHYvZHNglhfqkOX4u', 'Charlie Waiter', 'waiter@demo.com', 'waiter', true),
('a0000000-0000-0000-0000-000000000004', '0900000004', '$2a$10$IqDd2.JsX23YvGWEfk3pP.yM874YJ/kLAR8sVHYvZHNglhfqkOX4u', 'Dave Chef', 'kitchen@demo.com', 'chef', true),
('a0000000-0000-0000-0000-000000000005', '0900000005', '$2a$10$IqDd2.JsX23YvGWEfk3pP.yM874YJ/kLAR8sVHYvZHNglhfqkOX4u', 'Eve Server', 'eve@demo.com', 'waiter', false)
ON CONFLICT (phone) DO UPDATE SET
  pin_hash = EXCLUDED.pin_hash,
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO categories (id, name, sort_order, is_active) VALUES
('b0000000-0000-0000-0000-000000000001', 'Fresh Dairy & Milk', 1, true),
('b0000000-0000-0000-0000-000000000002', 'Main Course', 2, true),
('b0000000-0000-0000-0000-000000000003', 'Pizza', 3, true),
('b0000000-0000-0000-0000-000000000004', 'Appetizers', 4, true),
('b0000000-0000-0000-0000-000000000005', 'Beverages', 5, true),
('b0000000-0000-0000-0000-000000000006', 'Desserts', 6, true),
('b0000000-0000-0000-0000-000000000007', 'Traditional', 7, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO menu_items (
  id, category_id, name, description, price_etb, image_url, is_available, sort_order, preparation_time_minutes
) VALUES
('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
 'Pure Farm-Fresh Cow Milk (Warm / Chilled)',
 '100% organic, pasteurized rich whole milk served fresh from local dairy farms.',
 120, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80', true, 1, 5),
('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
 'Artisanal Spiced Ergo (Organic Yogurt)',
 'Traditional fermented creamy yogurt topped with mild organic spices and freshly churned butter.',
 180, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80', true, 2, 5),
('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',
 'Signature Yadotena Cream Milkshake',
 'Ultra-thick milkshake with fresh dairy cream, Madagascar vanilla, and strawberry coulis.',
 260, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80', true, 3, 8),
('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002',
 'Classic Chicken Burger',
 'Grilled marinated chicken breast, organic lettuce, ripe tomato and secret house sauce.',
 380, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80', true, 1, 15),
('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002',
 'Prime Beef Ribeye Steak',
 'Premium cut tender beef steak with rosemary herb butter and roasted garlic mash.',
 850, 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=80', true, 2, 25),
('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000003',
 'Artisanal Margherita Pizza',
 'Stone-baked crust with San Marzano tomatoes, fresh buffalo mozzarella, and basil.',
 550, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80', true, 1, 18),
('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000004',
 'Truffle Parmesan Fries',
 'Crispy hand-cut fries tossed with white truffle oil, rosemary, and aged parmesan.',
 220, 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=800&q=80', true, 1, 8),
('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000005',
 'Signature Iced Caramel Latte',
 'Double shot Yirgacheffe espresso with silky cold milk and caramel.',
 160, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80', true, 1, 5),
('c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000006',
 'Molten Chocolate Lava Cake',
 'Warm Belgian dark chocolate cake with a molten center, served with vanilla bean gelato.',
 280, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80', true, 1, 12),
('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000007',
 'Doro Wat Platter',
 'Slow-cooked spicy chicken stew with boiled egg, served with injera.',
 420, 'https://images.unsplash.com/photo-1604329760661-e7b0c7f4f6c8?auto=format&fit=crop&w=800&q=80', true, 1, 20),
('c0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000007',
 'Beef Tibs',
 'Sautéed beef cubes with onion, rosemary, and awaze — house favorite.',
 380, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80', true, 2, 18)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_etb = EXCLUDED.price_etb,
  image_url = EXCLUDED.image_url,
  is_available = EXCLUDED.is_available,
  sort_order = EXCLUDED.sort_order,
  preparation_time_minutes = EXCLUDED.preparation_time_minutes,
  updated_at = now();

INSERT INTO cafe_tables (id, label, seats, assigned_waiter_id, is_active) VALUES
('d0000000-0000-0000-0000-000000000001', 'Table 01', 2, 'a0000000-0000-0000-0000-000000000003', true),
('d0000000-0000-0000-0000-000000000002', 'Table 02', 4, 'a0000000-0000-0000-0000-000000000003', true),
('d0000000-0000-0000-0000-000000000003', 'Table 03', 4, 'a0000000-0000-0000-0000-000000000003', true),
('d0000000-0000-0000-0000-000000000004', 'Table 04', 6, NULL, true),
('d0000000-0000-0000-0000-000000000005', 'Table 05', 2, NULL, true),
('d0000000-0000-0000-0000-000000000006', 'Table 06', 8, 'a0000000-0000-0000-0000-000000000003', true),
('d0000000-0000-0000-0000-000000000007', 'Table 07', 4, NULL, true),
('d0000000-0000-0000-0000-000000000008', 'Table 08', 2, NULL, true)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  seats = EXCLUDED.seats,
  assigned_waiter_id = EXCLUDED.assigned_waiter_id,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Clear prior demo orders/expenses (fixed demo UUIDs only) so re-seed stays clean
DELETE FROM order_items WHERE order_id IN (
  SELECT id FROM orders WHERE id IN (
    'e1000000-0000-0000-0000-000000000001',
    'e1000000-0000-0000-0000-000000000002',
    'e1000000-0000-0000-0000-000000000003',
    'e1000000-0000-0000-0000-000000000004',
    'e1000000-0000-0000-0000-000000000005',
    'e1000000-0000-0000-0000-000000000006',
    'e1000000-0000-0000-0000-000000000007',
    'e1000000-0000-0000-0000-000000000008'
  )
);
DELETE FROM payments WHERE order_id IN (
  'e1000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000002',
  'e1000000-0000-0000-0000-000000000003',
  'e1000000-0000-0000-0000-000000000004',
  'e1000000-0000-0000-0000-000000000005',
  'e1000000-0000-0000-0000-000000000006',
  'e1000000-0000-0000-0000-000000000007',
  'e1000000-0000-0000-0000-000000000008'
);
DELETE FROM orders WHERE id IN (
  'e1000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000002',
  'e1000000-0000-0000-0000-000000000003',
  'e1000000-0000-0000-0000-000000000004',
  'e1000000-0000-0000-0000-000000000005',
  'e1000000-0000-0000-0000-000000000006',
  'e1000000-0000-0000-0000-000000000007',
  'e1000000-0000-0000-0000-000000000008'
);
DELETE FROM expenses WHERE id IN (
  'f0000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000002',
  'f0000000-0000-0000-0000-000000000003'
);

-- Open dine-in: Table 06 PREPARING / unpaid (kitchen queue)
INSERT INTO orders (
  id, order_type, order_status, payment_status,
  customer_name, customer_phone, table_id, notes,
  subtotal_etb, total_etb, taken_by, created_at, updated_at
) VALUES (
  'e1000000-0000-0000-0000-000000000001', 'dine_in', 'preparing', 'unpaid',
  'Guest Table 06', '0911000001', 'd0000000-0000-0000-0000-000000000006', '',
  980, 980, 'a0000000-0000-0000-0000-000000000003',
  now() - interval '15 minutes', now() - interval '10 minutes'
);

INSERT INTO order_items (id, order_id, menu_item_id, name_snapshot, unit_price_etb, qty, note) VALUES
('e2000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Classic Chicken Burger', 380, 2, ''),
('e2000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000007', 'Truffle Parmesan Fries', 220, 1, 'Extra crispy');

INSERT INTO payments (id, order_id, method) VALUES
('e3000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'cash');

-- Takeaway PENDING / paid (waiting kitchen confirm path — already paid)
INSERT INTO orders (
  id, order_type, order_status, payment_status,
  customer_name, customer_phone, notes,
  subtotal_etb, total_etb, taken_by, created_at, updated_at
) VALUES (
  'e1000000-0000-0000-0000-000000000002', 'pickup', 'placed', 'paid',
  'Abebe Kebede', '0911234567', '',
  550, 550, NULL,
  now() - interval '5 minutes', now() - interval '5 minutes'
);

INSERT INTO order_items (id, order_id, menu_item_id, name_snapshot, unit_price_etb, qty, note) VALUES
('e2000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000006', 'Artisanal Margherita Pizza', 550, 1, '');

INSERT INTO payments (id, order_id, method, digital_method, reference, verified_by, verified_at) VALUES
('e3000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000002', 'digital', 'Telebirr', 'TB-DEMO-1043',
 'a0000000-0000-0000-0000-000000000002', now() - interval '4 minutes');

-- Open dine-in: Table 03 READY / unpaid (waiter serve)
INSERT INTO orders (
  id, order_type, order_status, payment_status,
  customer_name, customer_phone, table_id, notes,
  subtotal_etb, total_etb, taken_by, created_at, updated_at
) VALUES (
  'e1000000-0000-0000-0000-000000000003', 'dine_in', 'ready', 'unpaid',
  'Guest Table 03', '0911000003', 'd0000000-0000-0000-0000-000000000003', '',
  320, 320, 'a0000000-0000-0000-0000-000000000003',
  now() - interval '8 minutes', now() - interval '2 minutes'
);

INSERT INTO order_items (id, order_id, menu_item_id, name_snapshot, unit_price_etb, qty, note) VALUES
('e2000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000008', 'Signature Iced Caramel Latte', 160, 2, '');

INSERT INTO payments (id, order_id, method) VALUES
('e3000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000003', 'cash');

-- History: Abebe completed paid orders (REGULAR customer)
INSERT INTO orders (
  id, order_type, order_status, payment_status,
  customer_name, customer_phone, table_id, notes,
  subtotal_etb, total_etb, taken_by, created_at, updated_at
) VALUES
('e1000000-0000-0000-0000-000000000004', 'dine_in', 'completed', 'paid',
 'Abebe Kebede', '0911234567', 'd0000000-0000-0000-0000-000000000002', '', 540, 540, 'a0000000-0000-0000-0000-000000000003',
 now() - interval '2 days', now() - interval '2 days'),
('e1000000-0000-0000-0000-000000000005', 'pickup', 'completed', 'paid',
 'Abebe Kebede', '0911234567', NULL, '', 420, 420, 'a0000000-0000-0000-0000-000000000003',
 now() - interval '1 day', now() - interval '1 day');

INSERT INTO order_items (id, order_id, menu_item_id, name_snapshot, unit_price_etb, qty, note) VALUES
('e2000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'Pure Farm-Fresh Cow Milk (Warm / Chilled)', 120, 2, ''),
('e2000000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004', 'Classic Chicken Burger', 380, 1, ''),
('e2000000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000010', 'Doro Wat Platter', 420, 1, '');

INSERT INTO payments (id, order_id, method, verified_by, verified_at) VALUES
('e3000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000004', 'cash', 'a0000000-0000-0000-0000-000000000003', now() - interval '2 days'),
('e3000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000005', 'cash', 'a0000000-0000-0000-0000-000000000002', now() - interval '1 day');

-- History: Sara OCCASIONAL
INSERT INTO orders (
  id, order_type, order_status, payment_status,
  customer_name, customer_phone, delivery_address, notes,
  subtotal_etb, total_etb, taken_by, created_at, updated_at
) VALUES (
  'e1000000-0000-0000-0000-000000000006', 'delivery', 'completed', 'paid',
  'Sara Tefera', '0912345678', 'CMC, Addis Ababa', '',
  710, 710, 'a0000000-0000-0000-0000-000000000003',
  now() - interval '3 days', now() - interval '3 days'
);

INSERT INTO order_items (id, order_id, menu_item_id, name_snapshot, unit_price_etb, qty, note) VALUES
('e2000000-0000-0000-0000-000000000008', 'e1000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000006', 'Artisanal Margherita Pizza', 550, 1, ''),
('e2000000-0000-0000-0000-000000000009', 'e1000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000008', 'Signature Iced Caramel Latte', 160, 1, '');

INSERT INTO payments (id, order_id, method, digital_method, reference, verified_by, verified_at) VALUES
('e3000000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000006', 'digital', 'CBE', 'CBE-DEMO-SARA',
 'a0000000-0000-0000-0000-000000000002', now() - interval '3 days');

-- History: Dawit VIP (high spend + many orders — seed several paid completes)
INSERT INTO orders (
  id, order_type, order_status, payment_status,
  customer_name, customer_phone, table_id, notes,
  subtotal_etb, total_etb, taken_by, created_at, updated_at
) VALUES
('e1000000-0000-0000-0000-000000000007', 'dine_in', 'completed', 'paid',
 'Dawit Haile', '0913456789', 'd0000000-0000-0000-0000-000000000004', '', 1700, 1700, 'a0000000-0000-0000-0000-000000000003',
 now() - interval '1 day', now() - interval '1 day'),
('e1000000-0000-0000-0000-000000000008', 'dine_in', 'completed', 'paid',
 'Dawit Haile', '0913456789', 'd0000000-0000-0000-0000-000000000005', '', 1130, 1130, 'a0000000-0000-0000-0000-000000000003',
 now() - interval '12 hours', now() - interval '12 hours');

INSERT INTO order_items (id, order_id, menu_item_id, name_snapshot, unit_price_etb, qty, note) VALUES
('e2000000-0000-0000-0000-000000000010', 'e1000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000005', 'Prime Beef Ribeye Steak', 850, 2, ''),
('e2000000-0000-0000-0000-000000000011', 'e1000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000005', 'Prime Beef Ribeye Steak', 850, 1, ''),
('e2000000-0000-0000-0000-000000000012', 'e1000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000009', 'Molten Chocolate Lava Cake', 280, 1, '');

INSERT INTO payments (id, order_id, method, verified_by, verified_at) VALUES
('e3000000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000007', 'cash', 'a0000000-0000-0000-0000-000000000003', now() - interval '1 day'),
('e3000000-0000-0000-0000-000000000008', 'e1000000-0000-0000-0000-000000000008', 'cash', 'a0000000-0000-0000-0000-000000000003', now() - interval '12 hours');

-- Extra VIP history rows (completed paid) to push Dawit over VIP thresholds
INSERT INTO orders (id, order_type, order_status, payment_status, customer_name, customer_phone, subtotal_etb, total_etb, taken_by, created_at, updated_at)
SELECT
  ('e1000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid,
  'pickup', 'completed', 'paid',
  'Dawit Haile', '0913456789',
  380, 380,
  'a0000000-0000-0000-0000-000000000003',
  now() - (n || ' days')::interval,
  now() - (n || ' days')::interval
FROM generate_series(9, 28) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_items (id, order_id, menu_item_id, name_snapshot, unit_price_etb, qty, note)
SELECT
  ('e2000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid,
  ('e1000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid,
  'c0000000-0000-0000-0000-000000000004',
  'Classic Chicken Burger', 380, 1, ''
FROM generate_series(9, 28) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO payments (id, order_id, method, verified_by, verified_at)
SELECT
  ('e3000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid,
  ('e1000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid,
  'cash',
  'a0000000-0000-0000-0000-000000000002',
  now() - (n || ' days')::interval
FROM generate_series(9, 28) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO expenses (id, amount, category, description, expense_date, payment_method, recorded_by) VALUES
('f0000000-0000-0000-0000-000000000001', 16500.00, 'Ingredients', 'Weekly fresh beef & chicken supply', CURRENT_DATE - 2, 'Bank Transfer', 'a0000000-0000-0000-0000-000000000002'),
('f0000000-0000-0000-0000-000000000002', 4800.50, 'Utilities', 'Monthly commercial electricity bill', CURRENT_DATE - 5, 'Telebirr', 'a0000000-0000-0000-0000-000000000001'),
('f0000000-0000-0000-0000-000000000003', 3500.00, 'Equipment', 'Espresso machine maintenance', CURRENT_DATE - 1, 'Cash', 'a0000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO UPDATE SET
  amount = EXCLUDED.amount,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  expense_date = EXCLUDED.expense_date,
  payment_method = EXCLUDED.payment_method,
  recorded_by = EXCLUDED.recorded_by,
  deleted_at = NULL,
  updated_at = now();
