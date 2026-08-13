-- Yadotena Milk & Foods Comprehensive 3-Month Production Seed Data
-- Default password for all seeded users: 1234
-- Bcrypt hash: $2a$10$IqDd2.JsX23YvGWEfk3pP.yM874YJ/kLAR8sVHYvZHNglhfqkOX4u

-- ============================================================================
-- 1. RESTAURANT SETTINGS
-- ============================================================================
INSERT INTO restaurant_settings (id, restaurant_name, phone, address, service_charge_percent, vat_percent, guest_wifi_ssid, guest_wifi_password)
VALUES (1, 'Yadotena Milk & Foods', '+251 91 123 4567', 'Bole Road, Near Friendship Mall, Addis Ababa', 10.00, 15.00, 'Yadotena_Milk_5G', 'Yadotena2026')
ON CONFLICT (id) DO UPDATE SET
  restaurant_name = EXCLUDED.restaurant_name,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  service_charge_percent = EXCLUDED.service_charge_percent,
  vat_percent = EXCLUDED.vat_percent,
  guest_wifi_ssid = EXCLUDED.guest_wifi_ssid,
  guest_wifi_password = EXCLUDED.guest_wifi_password,
  updated_at = now();

-- ============================================================================
-- 2. USERS (At least 2 for EVERY role: OWNER, MANAGER, WAITER, CHEF, CUSTOMER)
-- ============================================================================
INSERT INTO users (id, email, password_hash, name, phone, role, status, avatar_url, created_at) VALUES
-- OWNER (2 Users)
('10000000-0000-0000-0000-000000000001', 'owner@yadotena.com', '$2a$10$IqDd2.JsX23YvGWEfk3pP.yM874YJ/kLAR8sVHYvZHNglhfqkOX4u', 'Alemayehu Tadesse', '0911000001', 'OWNER', 'ACTIVE', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', now() - interval '100 days'),
('10000000-0000-0000-0000-000000000002', 'owner2@yadotena.com', '$2a$10$IqDd2.JsX23YvGWEfk3pP.yM874YJ/kLAR8sVHYvZHNglhfqkOX4u', 'Bethlehem Worku', '0911000002', 'OWNER', 'ACTIVE', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', now() - interval '100 days'),

-- MANAGER (2 Users)
('10000000-0000-0000-0000-000000000003', 'manager@yadotena.com', '$2a$10$IqDd2.JsX23YvGWEfk3pP.yM874YJ/kLAR8sVHYvZHNglhfqkOX4u', 'Kassahun Bekele', '0911000003', 'MANAGER', 'ACTIVE', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', now() - interval '95 days'),
('10000000-0000-0000-0000-000000000004', 'manager2@yadotena.com', '$2a$10$IqDd2.JsX23YvGWEfk3pP.yM874YJ/kLAR8sVHYvZHNglhfqkOX4u', 'Meron Hailu', '0911000004', 'MANAGER', 'ACTIVE', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', now() - interval '95 days'),

-- WAITER (2 Users)
('10000000-0000-0000-0000-000000000005', 'waiter@yadotena.com', '$2a$10$IqDd2.JsX23YvGWEfk3pP.yM874YJ/kLAR8sVHYvZHNglhfqkOX4u', 'Charlie Tesfaye', '0911000005', 'WAITER', 'ACTIVE', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', now() - interval '90 days'),
('10000000-0000-0000-0000-000000000006', 'waiter2@yadotena.com', '$2a$10$IqDd2.JsX23YvGWEfk3pP.yM874YJ/kLAR8sVHYvZHNglhfqkOX4u', 'Solomon Alemu', '0911000006', 'WAITER', 'ACTIVE', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', now() - interval '90 days'),

-- CHEF (2 Users)
('10000000-0000-0000-0000-000000000007', 'chef@yadotena.com', '$2a$10$IqDd2.JsX23YvGWEfk3pP.yM874YJ/kLAR8sVHYvZHNglhfqkOX4u', 'Dawit Chef', '0911000007', 'CHEF', 'ACTIVE', 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150', now() - interval '90 days'),
('10000000-0000-0000-0000-000000000008', 'chef2@yadotena.com', '$2a$10$IqDd2.JsX23YvGWEfk3pP.yM874YJ/kLAR8sVHYvZHNglhfqkOX4u', 'Hanna Zewde', '0911000008', 'CHEF', 'ACTIVE', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=150', now() - interval '90 days'),

-- CUSTOMER (2 Users)
('10000000-0000-0000-0000-000000000009', 'customer1@yadotena.com', '$2a$10$IqDd2.JsX23YvGWEfk3pP.yM874YJ/kLAR8sVHYvZHNglhfqkOX4u', 'Abebe Kebede', '0911234567', 'CUSTOMER', 'ACTIVE', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150', now() - interval '85 days'),
('10000000-0000-0000-0000-000000000010', 'customer2@yadotena.com', '$2a$10$IqDd2.JsX23YvGWEfk3pP.yM874YJ/kLAR8sVHYvZHNglhfqkOX4u', 'Sara Tefera', '0912345678', 'CUSTOMER', 'ACTIVE', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', now() - interval '85 days'),

-- Legacy demo alias accounts
('10000000-0000-0000-0000-000000000011', 'owner@demo.com', '$2a$10$IqDd2.JsX23YvGWEfk3pP.yM874YJ/kLAR8sVHYvZHNglhfqkOX4u', 'Alice Owner', '0900000001', 'OWNER', 'ACTIVE', NULL, now() - interval '100 days'),
('10000000-0000-0000-0000-000000000012', 'manager@demo.com', '$2a$10$IqDd2.JsX23YvGWEfk3pP.yM874YJ/kLAR8sVHYvZHNglhfqkOX4u', 'Bob Manager', '0900000002', 'MANAGER', 'ACTIVE', NULL, now() - interval '100 days'),
('10000000-0000-0000-0000-000000000013', 'waiter@demo.com', '$2a$10$IqDd2.JsX23YvGWEfk3pP.yM874YJ/kLAR8sVHYvZHNglhfqkOX4u', 'Charlie Waiter', '0900000003', 'WAITER', 'ACTIVE', NULL, now() - interval '100 days'),
('10000000-0000-0000-0000-000000000014', 'kitchen@demo.com', '$2a$10$IqDd2.JsX23YvGWEfk3pP.yM874YJ/kLAR8sVHYvZHNglhfqkOX4u', 'Dave Chef', '0900000004', 'CHEF', 'ACTIVE', NULL, now() - interval '100 days')
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = now();

-- ============================================================================
-- 3. MENU CATEGORIES
-- ============================================================================
INSERT INTO menu_categories (id, name, icon, description, sort_order, is_active) VALUES
('cat-dairy', 'Fresh Dairy & Yadotena Milk', '🥛', 'Pure organic cow milk, spiced ergo yogurt, fresh cream & milkshakes', 1, true),
('cat-traditional', 'Ethiopian Traditional Specials', '🥘', 'Authentic slow-cooked Ethiopian stews, doro wat, tibs & beyaynetu', 2, true),
('cat-breakfast', 'Traditional Breakfast & Fitfit', '🥐', 'Morning delights: Chechebsa, Yadotena Special Fitfit, Kinche & Ful', 3, true),
('cat-mains', 'Main Course & Gourmet Grills', '🥩', 'Prime beef steak, grilled chicken, sizzlers & special platters', 4, true),
('cat-pizza', 'Artisanal Wood-Fired Pizza', '🍕', 'Hand-stretched sourdough pizzas baked in stone oven', 5, true),
('cat-beverages', 'Specialty Coffees & Juices', '☕', 'Ethiopian Yirgacheffe coffee, espresso, layered smoothies & fresh juices', 6, true),
('cat-appetizers', 'Appetizers & Starters', '🍟', 'Crispy truffle fries, sambusa, chicken wings & garlic bread', 7, true),
('cat-desserts', 'Pastries & Desserts', '🍰', 'Decadent lava cake, baklava, tiramisu & artisanal gelato', 8, true),
('cat-shop', 'Shop & Farm Groceries', '🛒', 'Fresh farm dairy packs, pure honey, butter, ayib & specialty roasts', 9, true),
('cat-825f2906', 'yene', '🥚', 'Custom traditional favorites and artisanal extras', 10, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- ============================================================================
-- 4. MENU ITEMS
-- ============================================================================
INSERT INTO menu_items (id, name, description, price, category_id, image, available, preparation_time, dietary_tags) VALUES
-- User Requested Specials
('m-b1d731ff', 'Special Macchiato', 'Rich espresso with steamed milk foam', 80.00, 'cat-beverages', 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80', true, 15, '[]'::jsonb),
('m-12b3a693', 'egg', 'hjklm', 1000.00, 'cat-825f2906', 'https://t3.storage.dev/yadotena/media/2026/08/4dd495f3-ecd6-4caf-87ce-a39a76418a47.webp', true, 15, '["Spicy","Popular"]'::jsonb),

-- Dairy
('item-milk-01', 'Pure Farm-Fresh Cow Milk (Warm / Chilled)', '100% organic, pasteurized rich whole milk served fresh from local dairy farms.', 120.00, 'cat-dairy', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80', true, 5, '["Organic","Dairy"]'::jsonb),
('item-milk-02', 'Artisanal Spiced Ergo (Organic Yogurt)', 'Traditional fermented creamy yogurt topped with mild organic spices and freshly churned butter.', 180.00, 'cat-dairy', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80', true, 5, '["Organic","Vegetarian"]'::jsonb),
('item-milk-03', 'Signature Yadotena Cream Milkshake', 'Ultra-thick milkshake with fresh dairy cream, Madagascar vanilla, and strawberry coulis.', 260.00, 'cat-dairy', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80', true, 8, '["Sweet"]'::jsonb),

-- Traditional
('item-trad-01', 'Special Doro Wat Platter', 'Slow-cooked organic chicken stew simmered in berbere spice, served with hard-boiled egg & fresh injera.', 550.00, 'cat-traditional', 'https://images.unsplash.com/photo-1604329760661-e7b0c7f4f6c8?auto=format&fit=crop&w=800&q=80', true, 20, '["Spicy","Authentic"]'::jsonb),
('item-trad-02', 'Sizzling Beef Tibs Special', 'Tender sautéed beef cubes with red onions, rosemary, jalapeños, and awaze dip.', 480.00, 'cat-traditional', 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80', true, 18, '["Popular"]'::jsonb),
('item-trad-03', 'Grand Fasting Beyaynetu Platter', 'Colorful assortment of 8 traditional vegan dishes including Shiro, Misir, Gomen, and Kik Alicha.', 360.00, 'cat-traditional', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80', true, 15, '["Vegan","Fasting"]'::jsonb),
('item-trad-04', 'Shiro Tegabino with Spiced Kibe', 'Rich, bubbling chickpea stew served in a traditional clay pot with spiced clarified butter.', 280.00, 'cat-traditional', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80', true, 12, '["Vegetarian","Hot"]'::jsonb),

-- Breakfast
('item-brk-01', 'Special Chechebsa with Honey & Ergo', 'Shredded flatbread tossed in spiced kibe & berbere, served with wild honey and cool ergo.', 240.00, 'cat-breakfast', 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=800&q=80', true, 10, '["Favorite"]'::jsonb),
('item-brk-02', 'Yadotena House Fitfit (Beef / Lamb)', 'Crispy torn injera soaked in rich spiced meat broth, green peppers, and clarified butter.', 320.00, 'cat-breakfast', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80', true, 12, '["Hearty"]'::jsonb),

-- Mains
('item-main-01', 'Prime Ribeye Steak with Herb Mash', 'Aged beef ribeye steak grilled to order, served with rosemary herb butter and garlic mashed potatoes.', 890.00, 'cat-mains', 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=80', true, 25, '["Chef Special"]'::jsonb),
('item-main-02', 'Classic Chicken Burger & Chips', 'Charbroiled chicken breast, smoked cheese, crisp lettuce, ripe tomato, and house truffle sauce.', 420.00, 'cat-mains', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80', true, 15, '["Popular"]'::jsonb),

-- Pizza
('item-pizza-01', 'Artisanal Margherita Pizza', 'Wood-fired crust with San Marzano tomatoes, fresh buffalo mozzarella, and basil.', 580.00, 'cat-pizza', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80', true, 18, '["Vegetarian"]'::jsonb),
('item-pizza-02', 'Yadotena Meat Lovers Special Pizza', 'Pepperoni, ground beef, chicken sausage, mozzarella, and house chili drizzle.', 680.00, 'cat-pizza', 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80', true, 20, '["Spicy"]'::jsonb),

-- Beverages
('item-bev-01', 'Signature Iced Caramel Latte', 'Double shot Yirgacheffe espresso with silky cold milk and artisanal caramel.', 180.00, 'cat-beverages', 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80', true, 5, '["Coffee"]'::jsonb),
('item-bev-02', 'Fresh Layered Mango-Avocado Juice', 'Thick organic mango and avocado layers topped with lime twist.', 190.00, 'cat-beverages', 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=800&q=80', true, 5, '["Fresh"]'::jsonb),

-- Appetizers & Desserts
('item-app-01', 'Truffle Parmesan Fries', 'Hand-cut potato fries tossed in white truffle oil, sea salt, and aged parmesan.', 250.00, 'cat-appetizers', 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=800&q=80', true, 8, '["Crispy"]'::jsonb),
('item-des-01', 'Molten Chocolate Lava Cake', 'Warm dark chocolate cake with a molten chocolate core, served with vanilla gelato.', 320.00, 'cat-desserts', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80', true, 12, '["Dessert"]'::jsonb),

-- Shop & Groceries Items
('shop-milk-1l', 'Fresh Whole Milk (1 Liter)', 'Daily farm-fresh, pasteurized whole cow milk in eco-glass bottle.', 60.00, 'cat-shop', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80', true, 5, '["Fresh","Organic"]'::jsonb),
('shop-ergo-500g', 'Artisanal Spiced Ergo (500g)', 'Traditional fermented Ethiopian yogurt infused with cardamom & black seed.', 90.00, 'cat-shop', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80', true, 5, '["Organic"]'::jsonb),
('shop-honey-1kg', 'Ethiopian Wild Organic Honey (1kg)', '100% pure raw forest honey harvested from Lalibela highlands.', 450.00, 'cat-shop', 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=800&q=80', true, 5, '["Pure"]'::jsonb),
('shop-cheese-250g', 'Pasteurized Cottage Cheese / Ayib (250g)', 'Creamy homemade Ayib cheese, perfect with mitmita and spinach.', 180.00, 'cat-shop', 'https://images.unsplash.com/photo-1552767059-ce182ead8c1b?auto=format&fit=crop&w=800&q=80', true, 5, '["Dairy"]'::jsonb),
('shop-butter-500g', 'Fresh Farm Butter / Kibbeh (500g)', 'Churned fresh cow butter from Debre Zeit dairy co-op.', 320.00, 'cat-shop', 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=800&q=80', true, 5, '["Farm Fresh"]'::jsonb),
('shop-ghee-1kg', 'Spiced Clarified Butter / Niter Kibbeh (1kg)', 'Traditional clarified butter slow-infused with korarima, koseret & garlic.', 650.00, 'cat-shop', 'https://images.unsplash.com/photo-1627483262268-9c2b5b2834b5?auto=format&fit=crop&w=800&q=80', true, 5, '["Traditional"]'::jsonb),
('shop-coffee-500g', 'Yirgacheffe Roast Coffee Beans (500g)', 'Single-origin floral & citrus notes, freshly roasted in house.', 350.00, 'cat-shop', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=800&q=80', true, 5, '["Coffee"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  category_id = EXCLUDED.category_id,
  image = EXCLUDED.image,
  available = EXCLUDED.available,
  preparation_time = EXCLUDED.preparation_time,
  dietary_tags = EXCLUDED.dietary_tags,
  updated_at = now();

-- Custom Addons
INSERT INTO menu_item_addons (id, menu_item_id, name, price) VALUES
('add-6f162163', 'm-12b3a693', 'enjera', 50.00)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price;

-- ============================================================================
-- 5. TABLES
-- ============================================================================
INSERT INTO tables (id, name, capacity, status, qr_token) VALUES
('tbl-01', 'Table 01 (Indoor Window)', 2, 'AVAILABLE', 'qr_tbl_01_token_8a92'),
('tbl-02', 'Table 02 (Indoor Window)', 4, 'OCCUPIED', 'qr_tbl_02_token_3f41'),
('tbl-03', 'Table 03 (Central Dining)', 4, 'OCCUPIED', 'qr_tbl_03_token_9b12'),
('tbl-04', 'Table 04 (VIP Lounge)', 6, 'RESERVED', 'qr_tbl_04_token_5c77'),
('tbl-05', 'Table 05 (Garden Terrace)', 2, 'AVAILABLE', 'qr_tbl_05_token_1e34'),
('tbl-06', 'Table 06 (Garden Terrace)', 8, 'OCCUPIED', 'qr_tbl_06_token_7d88'),
('tbl-07', 'Table 07 (Balcony View)', 4, 'AVAILABLE', 'qr_tbl_07_token_2f99'),
('tbl-08', 'Table 08 (Family Booth)', 6, 'DIRTY', 'qr_tbl_08_token_4e66'),
('tbl-09', 'Table 09 (Private Corner)', 4, 'AVAILABLE', 'qr_tbl_09_token_6b22'),
('tbl-10', 'Table 10 (Executive Suite)', 10, 'AVAILABLE', 'qr_tbl_10_token_0a11')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  capacity = EXCLUDED.capacity,
  status = EXCLUDED.status,
  qr_token = EXCLUDED.qr_token,
  updated_at = now();

-- ============================================================================
-- 6. CUSTOMER PROFILES
-- ============================================================================
INSERT INTO customers (id, name, phone, email, total_orders, total_spent, last_order_date, created_at) VALUES
('cust-001', 'Abebe Kebede', '0911234567', 'customer1@yadotena.com', 24, 14250.00, now() - interval '2 hours', now() - interval '90 days'),
('cust-002', 'Sara Tefera', '0912345678', 'customer2@yadotena.com', 18, 11800.00, now() - interval '1 day', now() - interval '85 days'),
('cust-003', 'Dawit Haile', '0913456789', 'dawit.h@gmail.com', 32, 28900.00, now() - interval '4 hours', now() - interval '88 days'),
('cust-004', 'Tigist Assefa', '0914567890', 'tigist.a@yahoo.com', 12, 7400.00, now() - interval '3 days', now() - interval '70 days'),
('cust-005', 'Yonas Girma', '0915678901', 'yonas.g@outlook.com', 15, 9600.00, now() - interval '2 days', now() - interval '65 days'),
('cust-006', 'Hellen Workneh', '0916789012', 'hellen.w@gmail.com', 8, 4800.00, now() - interval '5 days', now() - interval '50 days')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  total_orders = EXCLUDED.total_orders,
  total_spent = EXCLUDED.total_spent,
  last_order_date = EXCLUDED.last_order_date;

-- ============================================================================
-- 7. 90-DAY HISTORICAL ORDERS & PAYMENTS (Simulates 3 Months of Operation)
-- ============================================================================
DELETE FROM order_items WHERE order_id LIKE 'ord-hist-%' OR order_id LIKE 'ord-live-%';
DELETE FROM payments WHERE order_id LIKE 'ord-hist-%' OR order_id LIKE 'ord-live-%';
DELETE FROM orders WHERE id LIKE 'ord-hist-%' OR id LIKE 'ord-live-%';

-- 120 Historic Orders spanning past 90 days
INSERT INTO orders (id, type, status, payment_status, table_id, customer_name, customer_phone, subtotal, tax, service_charge, total, created_at, updated_at)
SELECT
  'ord-hist-' || lpad(n::text, 4, '0'),
  CASE WHEN n % 4 = 0 THEN 'DELIVERY' WHEN n % 3 = 0 THEN 'TAKEAWAY' ELSE 'DINE_IN' END,
  'COMPLETED',
  'PAID',
  CASE WHEN n % 4 = 0 THEN NULL ELSE 'tbl-0' || ((n % 8) + 1)::text END,
  CASE (n % 5)
    WHEN 0 THEN 'Abebe Kebede'
    WHEN 1 THEN 'Sara Tefera'
    WHEN 2 THEN 'Dawit Haile'
    WHEN 3 THEN 'Tigist Assefa'
    ELSE 'Yonas Girma'
  END,
  CASE (n % 5)
    WHEN 0 THEN '0911234567'
    WHEN 1 THEN '0912345678'
    WHEN 2 THEN '0913456789'
    WHEN 3 THEN '0914567890'
    ELSE '0915678901'
  END,
  700.00 + (n % 10) * 120.00,
  (700.00 + (n % 10) * 120.00) * 0.15,
  (700.00 + (n % 10) * 120.00) * 0.10,
  (700.00 + (n % 10) * 120.00) * 1.25,
  now() - ((90 - (n % 90)) || ' days')::interval - ((n % 12) || ' hours')::interval,
  now() - ((90 - (n % 90)) || ' days')::interval - ((n % 12) || ' hours')::interval
FROM generate_series(1, 120) AS n
ON CONFLICT (id) DO NOTHING;

-- Order Items for Historic Orders
INSERT INTO order_items (id, order_id, menu_item_id, name, price, quantity, special_instructions)
SELECT
  'item-hist-' || lpad(n::text, 4, '0'),
  'ord-hist-' || lpad(n::text, 4, '0'),
  CASE (n % 6)
    WHEN 0 THEN 'item-trad-01'
    WHEN 1 THEN 'item-trad-02'
    WHEN 2 THEN 'item-main-01'
    WHEN 3 THEN 'item-pizza-01'
    WHEN 4 THEN 'item-brk-01'
    ELSE 'item-milk-01'
  END,
  CASE (n % 6)
    WHEN 0 THEN 'Special Doro Wat Platter'
    WHEN 1 THEN 'Sizzling Beef Tibs Special'
    WHEN 2 THEN 'Prime Ribeye Steak with Herb Mash'
    WHEN 3 THEN 'Artisanal Margherita Pizza'
    WHEN 4 THEN 'Special Chechebsa with Honey & Ergo'
    ELSE 'Pure Farm-Fresh Cow Milk (Warm / Chilled)'
  END,
  350.00 + (n % 5) * 80.00,
  (n % 3) + 1,
  'Served hot and fresh'
FROM generate_series(1, 120) AS n
ON CONFLICT (id) DO NOTHING;

-- Payments for Historic Orders
INSERT INTO payments (id, order_id, method, amount, status, transaction_ref, created_at)
SELECT
  gen_random_uuid(),
  'ord-hist-' || lpad(n::text, 4, '0'),
  CASE WHEN n % 3 = 0 THEN 'TELEBIRR' WHEN n % 3 = 1 THEN 'CBE_BIRR' ELSE 'CASH' END,
  (700.00 + (n % 10) * 120.00) * 1.25,
  'PAID',
  'TXN-90D-' || lpad(n::text, 6, '0'),
  now() - ((90 - (n % 90)) || ' days')::interval
FROM generate_series(1, 120) AS n
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. CURRENT LIVE ORDERS (Active Kitchen & Waiter Workflows)
-- ============================================================================
INSERT INTO orders (id, type, status, payment_status, table_id, customer_name, customer_phone, subtotal, tax, service_charge, total, created_at, updated_at) VALUES
('ord-live-0001', 'DINE_IN', 'PREPARING', 'PENDING', 'tbl-02', 'Guest Table 02', '0911000001', 810.00, 121.50, 81.00, 1012.50, now() - interval '15 minutes', now() - interval '10 minutes'),
('ord-live-0002', 'DINE_IN', 'READY', 'PAID', 'tbl-03', 'Guest Table 03', '0911000003', 660.00, 99.00, 66.00, 825.00, now() - interval '20 minutes', now() - interval '5 minutes'),
('ord-live-0003', 'TAKEAWAY', 'PENDING', 'PAID', NULL, 'Abebe Kebede', '0911234567', 830.00, 124.50, 0.00, 954.50, now() - interval '5 minutes', now() - interval '5 minutes'),
('ord-live-0004', 'DINE_IN', 'SERVED', 'PENDING', 'tbl-06', 'Dawit Haile', '0913456789', 1210.00, 181.50, 121.00, 1512.50, now() - interval '45 minutes', now() - interval '10 minutes')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  payment_status = EXCLUDED.payment_status,
  updated_at = now();

INSERT INTO order_items (id, order_id, menu_item_id, name, price, quantity, special_instructions) VALUES
('item-live-001', 'ord-live-0001', 'item-trad-01', 'Special Doro Wat Platter', 550.00, 1, 'Extra spicy berbere'),
('item-live-002', 'ord-live-0001', 'item-milk-03', 'Signature Yadotena Cream Milkshake', 260.00, 1, 'Cold with extra cream'),
('item-live-003', 'ord-live-0002', 'item-trad-02', 'Sizzling Beef Tibs Special', 480.00, 1, 'Medium well'),
('item-live-004', 'ord-live-0002', 'item-bev-01', 'Signature Iced Caramel Latte', 180.00, 1, 'Less sugar'),
('item-live-005', 'ord-live-0003', 'item-pizza-01', 'Artisanal Margherita Pizza', 580.00, 1, 'Cut into 8 slices'),
('item-live-006', 'ord-live-0003', 'item-app-01', 'Truffle Parmesan Fries', 250.00, 1, 'Extra crispy'),
('item-live-007', 'ord-live-0004', 'item-main-01', 'Prime Ribeye Steak with Herb Mash', 890.00, 1, 'Medium rare'),
('item-live-008', 'ord-live-0004', 'item-des-01', 'Molten Chocolate Lava Cake', 320.00, 1, 'Warm with gelato')
ON CONFLICT (id) DO NOTHING;

INSERT INTO payments (id, order_id, method, amount, status, transaction_ref, created_at) VALUES
(gen_random_uuid(), 'ord-live-0002', 'TELEBIRR', 825.00, 'PAID', 'TB-LIVE-88219', now() - interval '18 minutes'),
(gen_random_uuid(), 'ord-live-0003', 'CBE_BIRR', 954.50, 'PAID', 'CBE-LIVE-44102', now() - interval '4 minutes')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 9. 3-MONTH OPERATIONAL EXPENSES
-- ============================================================================
DELETE FROM expenses WHERE id LIKE 'exp-%';

INSERT INTO expenses (id, amount, category, description, date, payment_method, created_at) VALUES
('exp-m1-01', 85000.00, 'Rent', 'Monthly Commercial Building Rent (Bole Branch)', CURRENT_DATE - 85, 'Bank Transfer', now() - interval '85 days'),
('exp-m1-02', 42000.00, 'Ingredients', 'Bulk Wholesale Farm Milk & Beef Supply', CURRENT_DATE - 80, 'Bank Transfer', now() - interval '80 days'),
('exp-m1-03', 14500.00, 'Utilities', 'Commercial Electricity & Water Utilities', CURRENT_DATE - 75, 'Telebirr', now() - interval '75 days'),
('exp-m1-04', 68000.00, 'Salaries', 'Staff Payroll Month 1 (Waiters, Chefs, Baristas)', CURRENT_DATE - 60, 'Bank Transfer', now() - interval '60 days'),

('exp-m2-01', 85000.00, 'Rent', 'Monthly Commercial Building Rent (Bole Branch)', CURRENT_DATE - 55, 'Bank Transfer', now() - interval '55 days'),
('exp-m2-02', 48500.00, 'Ingredients', 'Fresh Poultry, Spices, Dairy & Produce Procurement', CURRENT_DATE - 50, 'Bank Transfer', now() - interval '50 days'),
('exp-m2-03', 15200.00, 'Utilities', 'Commercial Electricity & Water Utilities', CURRENT_DATE - 45, 'Telebirr', now() - interval '45 days'),
('exp-m2-04', 8500.00, 'Maintenance', 'Espresso Machine Servicing & Wood Oven Maintenance', CURRENT_DATE - 40, 'Cash', now() - interval '40 days'),
('exp-m2-05', 72000.00, 'Salaries', 'Staff Payroll Month 2', CURRENT_DATE - 30, 'Bank Transfer', now() - interval '30 days'),

('exp-m3-01', 85000.00, 'Rent', 'Monthly Commercial Building Rent (Bole Branch)', CURRENT_DATE - 25, 'Bank Transfer', now() - interval '25 days'),
('exp-m3-02', 51000.00, 'Ingredients', 'Weekly Whole Milk, Beef & Produce Delivery', CURRENT_DATE - 15, 'Bank Transfer', now() - interval '15 days'),
('exp-m3-03', 16800.00, 'Utilities', 'Commercial Electricity, Water & Fiber Internet', CURRENT_DATE - 10, 'Telebirr', now() - interval '10 days'),
('exp-m3-04', 12400.00, 'Supplies', 'Eco-friendly Takeaway Boxes & Branded Cups', CURRENT_DATE - 5, 'Cash', now() - interval '5 days'),
('exp-m3-05', 74000.00, 'Salaries', 'Staff Payroll Month 3', CURRENT_DATE - 2, 'Bank Transfer', now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 10. SERVICE REQUESTS
-- ============================================================================
DELETE FROM service_requests WHERE id LIKE 'sr-%';

INSERT INTO service_requests (id, table_id, type, status, notes, created_at, resolved_at) VALUES
('sr-001', 'tbl-02', 'WAITER', 'RESOLVED', 'Requested extra water glasses', now() - interval '1 hour', now() - interval '55 minutes'),
('sr-002', 'tbl-03', 'BILL', 'RESOLVED', 'Requesting bill split for Telebirr', now() - interval '30 minutes', now() - interval '25 minutes'),
('sr-003', 'tbl-06', 'ASSISTANCE', 'PENDING', 'Need extra napkins and awaze dip', now() - interval '8 minutes', NULL),
('sr-004', 'tbl-08', 'CLEANING', 'PENDING', 'Table needs sanitizing and clearing', now() - interval '3 minutes', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 11. REVIEWS & RATINGS
-- ============================================================================
DELETE FROM reviews WHERE id LIKE 'rev-%';

INSERT INTO reviews (id, order_id, customer_name, rating, comment, created_at) VALUES
('rev-001', 'ord-hist-0005', 'Abebe Kebede', 5, 'The Doro Wat was absolutely sensational! Tastes just like home-cooked meal.', now() - interval '80 days'),
('rev-002', 'ord-hist-0012', 'Sara Tefera', 5, 'Best iced caramel latte in Bole. Yadotena fresh milk makes all the difference!', now() - interval '65 days'),
('rev-003', 'ord-hist-0028', 'Dawit Haile', 5, 'Prime Ribeye cooked to absolute perfection. Excellent service from Solomon.', now() - interval '40 days'),
('rev-004', 'ord-hist-0045', 'Tigist Assefa', 4, 'Fast delivery, pizza was still steaming hot. Will order again!', now() - interval '20 days'),
('rev-005', 'ord-hist-0090', 'Yonas Girma', 5, 'Amazing Chechebsa and organic spiced ergo. Unbeatable quality!', now() - interval '5 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 12. DINING SESSIONS
-- ============================================================================
INSERT INTO dining_sessions (id, table_id, session_code, status, started_at) VALUES
(gen_random_uuid(), 'tbl-02', 'SES-TBL-02', 'ACTIVE', now() - interval '45 minutes'),
(gen_random_uuid(), 'tbl-03', 'SES-TBL-03', 'ACTIVE', now() - interval '30 minutes'),
(gen_random_uuid(), 'tbl-06', 'SES-TBL-06', 'ACTIVE', now() - interval '50 minutes')
ON CONFLICT DO NOTHING;
