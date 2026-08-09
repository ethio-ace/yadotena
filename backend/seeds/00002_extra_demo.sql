-- Extra demo data: more staff, menu, tables, live orders, reviews, service requests.
-- TEST CREDENTIALS (phone + PIN):
--   OWNER    0900000001 / 1234
--   MANAGER  0900000002 / 2345
--   WAITER   0900000003 / 3456
--   KITCHEN  0900000004 / 4567
--   WAITER   0900000005 / 5678  (INACTIVE)
--   WAITER   0900000006 / 6789
--   MANAGER  0900000007 / 1234
-- Customer QR table: d0000000-0000-0000-0000-000000000004 (Table 04)
-- Sample customer phones: 0911234567 (Abebe), 0912345678 (Sara), 0913456789 (Dawit VIP)

INSERT INTO staff (id, phone, pin_hash, name, email, role, is_active) VALUES
('a0000000-0000-0000-0000-000000000006', '0900000006', '$2a$10$KnTkcMu6dwYsR3fVnKnEY.GrCaa3LHaTQ3l5NitsyvXTBCtlnUUvm', 'Fiona Waiter', 'fiona@demo.com', 'waiter', true),
('a0000000-0000-0000-0000-000000000007', '0900000007', '$2a$10$Qg47GaaX3Btfh7XS1R9ddOld8COuGXlHFpw.4humVEo7pBGL4hPXK', 'Gina Ops', 'gina@demo.com', 'manager', true)
ON CONFLICT (phone) DO UPDATE SET
  pin_hash = EXCLUDED.pin_hash,
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO menu_items (
  id, category_id, name, description, price_etb, image_url, is_available, sort_order, preparation_time_minutes
) VALUES
('c0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000001',
 'Honey Butter Milk Toast',
 'Thick brioche soaked in warm milk, finished with local honey and soft butter.',
 210, 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=800&q=80', true, 4, 10),
('c0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000002',
 'Grilled Tilapia Plate',
 'Lake fish grilled with lemon, served with fries and house salad.',
 480, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80', true, 3, 22),
('c0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000003',
 'Spicy Pepperoni Pizza',
 'Crispy crust, mozzarella, hot pepperoni, and chili oil drizzle.',
 620, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80', true, 2, 18),
('c0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000004',
 'Crispy Chicken Wings (6pcs)',
 'Buffalo-glazed wings with blue cheese dip.',
 290, 'https://images.unsplash.com/photo-1527477396000-e27170b114db?auto=format&fit=crop&w=800&q=80', true, 2, 14),
('c0000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000005',
 'Fresh Mango Smoothie',
 'Ripe mango, yogurt, and a hint of mint — no ice cream fillers.',
 140, 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=800&q=80', true, 2, 5),
('c0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000005',
 'Macchiato (Single)',
 'Traditional Ethiopian macchiato with creamy foam.',
 80, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80', true, 3, 4),
('c0000000-0000-0000-0000-000000000018', 'b0000000-0000-0000-0000-000000000006',
 'Tiramisu Cup',
 'Espresso-soaked ladyfingers, mascarpone cream, cocoa dust.',
 240, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80', true, 2, 5),
('c0000000-0000-0000-0000-000000000019', 'b0000000-0000-0000-0000-000000000007',
 'Shiro Firfir',
 'Spiced chickpea stew tossed with shredded injera.',
 260, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80', true, 3, 15),
('c0000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000002',
 'Club Sandwich',
 'Triple-layer chicken, egg, tomato, and mayo — toasted.',
 320, 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80', true, 4, 12)
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
('d0000000-0000-0000-0000-000000000009', 'Table 09', 4, 'a0000000-0000-0000-0000-000000000006', true),
('d0000000-0000-0000-0000-000000000010', 'Table 10', 6, 'a0000000-0000-0000-0000-000000000006', true),
('d0000000-0000-0000-0000-000000000011', 'Patio A', 4, 'a0000000-0000-0000-0000-000000000003', true),
('d0000000-0000-0000-0000-000000000012', 'Patio B', 2, NULL, true)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  seats = EXCLUDED.seats,
  assigned_waiter_id = EXCLUDED.assigned_waiter_id,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Clean extra demo orders for re-seed
DELETE FROM order_items WHERE order_id IN (
  SELECT id FROM orders WHERE id IN (
    'e1000000-0000-0000-0000-000000000029',
    'e1000000-0000-0000-0000-000000000030',
    'e1000000-0000-0000-0000-000000000031',
    'e1000000-0000-0000-0000-000000000032'
  )
);
DELETE FROM payments WHERE order_id IN (
  'e1000000-0000-0000-0000-000000000029',
  'e1000000-0000-0000-0000-000000000030',
  'e1000000-0000-0000-0000-000000000031',
  'e1000000-0000-0000-0000-000000000032'
);
DELETE FROM orders WHERE id IN (
  'e1000000-0000-0000-0000-000000000029',
  'e1000000-0000-0000-0000-000000000030',
  'e1000000-0000-0000-0000-000000000031',
  'e1000000-0000-0000-0000-000000000032'
);
DELETE FROM service_requests WHERE id IN (
  'aa000000-0000-0000-0000-000000000001',
  'aa000000-0000-0000-0000-000000000002',
  'aa000000-0000-0000-0000-000000000003'
);
DELETE FROM reviews WHERE id IN (
  'ab000000-0000-0000-0000-000000000001',
  'ab000000-0000-0000-0000-000000000002',
  'ab000000-0000-0000-0000-000000000003',
  'ab000000-0000-0000-0000-000000000004'
);
DELETE FROM expenses WHERE id IN (
  'f0000000-0000-0000-0000-000000000004',
  'f0000000-0000-0000-0000-000000000005'
);

-- Pending digital payment verification (manager payments page)
INSERT INTO orders (
  id, order_type, order_status, payment_status,
  customer_name, customer_phone, table_id, notes,
  subtotal_etb, tax_etb, service_charge_etb, total_etb, taken_by, created_at, updated_at
) VALUES (
  'e1000000-0000-0000-0000-000000000029', 'dine_in', 'placed', 'pending_verification',
  'Helen Mekonnen', '0914567890', 'd0000000-0000-0000-0000-000000000009', 'Needs ketchup',
  560, 84, 56, 700, 'a0000000-0000-0000-0000-000000000006',
  now() - interval '3 minutes', now() - interval '3 minutes'
);

INSERT INTO order_items (id, order_id, menu_item_id, name_snapshot, unit_price_etb, qty, note) VALUES
('e2000000-0000-0000-0000-000000000029', 'e1000000-0000-0000-0000-000000000029', 'c0000000-0000-0000-0000-000000000020', 'Club Sandwich', 320, 1, ''),
('e2000000-0000-0000-0000-000000000030', 'e1000000-0000-0000-0000-000000000029', 'c0000000-0000-0000-0000-000000000016', 'Fresh Mango Smoothie', 140, 1, ''),
('e2000000-0000-0000-0000-000000000031', 'e1000000-0000-0000-0000-000000000029', 'c0000000-0000-0000-0000-000000000017', 'Macchiato (Single)', 80, 2, '');

INSERT INTO payments (id, order_id, method, digital_method, reference) VALUES
('e3000000-0000-0000-0000-000000000029', 'e1000000-0000-0000-0000-000000000029', 'digital', 'Telebirr', 'TB-PENDING-7788');

-- Kitchen: preparing delivery
INSERT INTO orders (
  id, order_type, order_status, payment_status,
  customer_name, customer_phone, delivery_address, notes,
  subtotal_etb, tax_etb, delivery_fee_etb, total_etb, taken_by, created_at, updated_at
) VALUES (
  'e1000000-0000-0000-0000-000000000030', 'delivery', 'preparing', 'paid',
  'Yonas Alemu', '0915678901', 'Kazanchis, near Hilton', '',
  620, 93, 100, 813, 'a0000000-0000-0000-0000-000000000003',
  now() - interval '12 minutes', now() - interval '8 minutes'
);

INSERT INTO order_items (id, order_id, menu_item_id, name_snapshot, unit_price_etb, qty, note) VALUES
('e2000000-0000-0000-0000-000000000032', 'e1000000-0000-0000-0000-000000000030', 'c0000000-0000-0000-0000-000000000014', 'Spicy Pepperoni Pizza', 620, 1, 'Extra chili');

INSERT INTO payments (id, order_id, method, digital_method, reference, verified_by, verified_at) VALUES
('e3000000-0000-0000-0000-000000000030', 'e1000000-0000-0000-0000-000000000030', 'digital', 'CBE', 'CBE-YONAS-991',
 'a0000000-0000-0000-0000-000000000002', now() - interval '11 minutes');

-- Ready for pickup
INSERT INTO orders (
  id, order_type, order_status, payment_status,
  customer_name, customer_phone, notes,
  subtotal_etb, tax_etb, total_etb, taken_by, created_at, updated_at
) VALUES (
  'e1000000-0000-0000-0000-000000000031', 'pickup', 'ready', 'paid',
  'Meron Tadesse', '0916789012', 'Call when ready',
  580, 87, 667, NULL,
  now() - interval '20 minutes', now() - interval '4 minutes'
);

INSERT INTO order_items (id, order_id, menu_item_id, name_snapshot, unit_price_etb, qty, note) VALUES
('e2000000-0000-0000-0000-000000000033', 'e1000000-0000-0000-0000-000000000031', 'c0000000-0000-0000-0000-000000000015', 'Crispy Chicken Wings (6pcs)', 290, 1, ''),
('e2000000-0000-0000-0000-000000000034', 'e1000000-0000-0000-0000-000000000031', 'c0000000-0000-0000-0000-000000000017', 'Macchiato (Single)', 80, 1, ''),
('e2000000-0000-0000-0000-000000000035', 'e1000000-0000-0000-0000-000000000031', 'c0000000-0000-0000-0000-000000000012', 'Honey Butter Milk Toast', 210, 1, '');

INSERT INTO payments (id, order_id, method, verified_by, verified_at) VALUES
('e3000000-0000-0000-0000-000000000031', 'e1000000-0000-0000-0000-000000000031', 'cash',
 'a0000000-0000-0000-0000-000000000003', now() - interval '19 minutes');

-- Open unpaid patio order
INSERT INTO orders (
  id, order_type, order_status, payment_status,
  customer_name, customer_phone, table_id, notes,
  subtotal_etb, tax_etb, service_charge_etb, total_etb, taken_by, created_at, updated_at
) VALUES (
  'e1000000-0000-0000-0000-000000000032', 'dine_in', 'preparing', 'unpaid',
  'Guest Patio A', '0917890123', 'd0000000-0000-0000-0000-000000000011', '',
  740, 111, 74, 925, 'a0000000-0000-0000-0000-000000000003',
  now() - interval '6 minutes', now() - interval '5 minutes'
);

INSERT INTO order_items (id, order_id, menu_item_id, name_snapshot, unit_price_etb, qty, note) VALUES
('e2000000-0000-0000-0000-000000000036', 'e1000000-0000-0000-0000-000000000032', 'c0000000-0000-0000-0000-000000000013', 'Grilled Tilapia Plate', 480, 1, ''),
('e2000000-0000-0000-0000-000000000037', 'e1000000-0000-0000-0000-000000000032', 'c0000000-0000-0000-0000-000000000019', 'Shiro Firfir', 260, 1, '');

INSERT INTO payments (id, order_id, method) VALUES
('e3000000-0000-0000-0000-000000000032', 'e1000000-0000-0000-0000-000000000032', 'cash');

INSERT INTO service_requests (id, table_id, type, status, notes, created_at) VALUES
('aa000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000004', 'WAITER', 'PENDING', 'Need water glasses', now() - interval '2 minutes'),
('aa000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000006', 'BILL', 'PENDING', '', now() - interval '1 minute'),
('aa000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 'ASSISTANCE', 'RESOLVED', 'Dropped fork', now() - interval '40 minutes')
ON CONFLICT (id) DO UPDATE SET
  type = EXCLUDED.type,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes;

UPDATE service_requests
SET resolved_at = now() - interval '35 minutes',
    resolved_by = 'a0000000-0000-0000-0000-000000000003'
WHERE id = 'aa000000-0000-0000-0000-000000000003';

INSERT INTO reviews (id, order_id, customer_name, rating, comment, created_at) VALUES
('ab000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000004', 'Abebe Kebede', 5, 'Milk was incredible — will come back weekly.', now() - interval '2 days'),
('ab000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000006', 'Sara Tefera', 4, 'Delivery a bit late but pizza was perfect.', now() - interval '3 days'),
('ab000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000007', 'Dawit Haile', 5, 'Best steak in Bole. VIP treatment!', now() - interval '1 day'),
('ab000000-0000-0000-0000-000000000004', NULL, 'Walk-in Guest', 3, 'Busy night, service was slow but food okay.', now() - interval '5 hours')
ON CONFLICT (id) DO UPDATE SET
  rating = EXCLUDED.rating,
  comment = EXCLUDED.comment,
  customer_name = EXCLUDED.customer_name;

INSERT INTO expenses (id, amount, category, description, expense_date, payment_method, recorded_by) VALUES
('f0000000-0000-0000-0000-000000000004', 2200.00, 'Supplies', 'Napkins, takeaway boxes, cups', CURRENT_DATE - 1, 'Cash', 'a0000000-0000-0000-0000-000000000007'),
('f0000000-0000-0000-0000-000000000005', 8500.00, 'Ingredients', 'Fresh dairy delivery (weekly)', CURRENT_DATE, 'Bank Transfer', 'a0000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO UPDATE SET
  amount = EXCLUDED.amount,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  expense_date = EXCLUDED.expense_date,
  payment_method = EXCLUDED.payment_method,
  recorded_by = EXCLUDED.recorded_by,
  deleted_at = NULL,
  updated_at = now();

-- Retail shop catalog (requires migration 000004)
INSERT INTO product_categories (id, name, sort_order, is_active) VALUES
('pc000000-0000-0000-0000-000000000001', 'Bottled Dairy', 1, true),
('pc000000-0000-0000-0000-000000000002', 'Pantry Packs', 2, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO products (id, category_id, name, description, price_etb, image_url, is_available, sort_order) VALUES
('pd000000-0000-0000-0000-000000000001', 'pc000000-0000-0000-0000-000000000001',
 'Fresh Whole Milk 1L', 'Farm-chilled whole milk in sealed bottle.', 95,
 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=800&q=80', true, 1),
('pd000000-0000-0000-0000-000000000002', 'pc000000-0000-0000-0000-000000000001',
 'Greek Yogurt Cup', 'Thick set yogurt, plain.', 65,
 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80', true, 2),
('pd000000-0000-0000-0000-000000000003', 'pc000000-0000-0000-0000-000000000002',
 'Honey Jar 250g', 'Local wildflower honey.', 180,
 'https://images.unsplash.com/photo-1587049352846-4a7bb135bc9d?auto=format&fit=crop&w=800&q=80', true, 1),
('pd000000-0000-0000-0000-000000000004', 'pc000000-0000-0000-0000-000000000002',
 'Butter Block 200g', 'Cultured butter for home cooking.', 140,
 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=800&q=80', true, 2)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_etb = EXCLUDED.price_etb,
  image_url = EXCLUDED.image_url,
  is_available = EXCLUDED.is_available,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
