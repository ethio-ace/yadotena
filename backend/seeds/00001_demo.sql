-- ============================================================================
-- YADOTENA SEED DATA (Staff-Only Catalog + Fresh Demo Operations)
-- ============================================================================
-- Clean reference catalog (users, tables, menu, addons) plus a small, fresh
-- set of demo orders in realistic kitchen states. Order timestamps are
-- relative to now() so the KDS timers, waiter boards, and reports always
-- look live instead of accumulating stale multi-day-old tickets.
-- ============================================================================

-- 1. USERS & ROLES (staff-only: WAITER / CHEF / MANAGER / OWNER)
INSERT INTO users (id, name, email, password_hash, role, status) VALUES
('usr-owner',   'Yadotena Owner',    'owner@yadotena.com',   '$2a$10$1z0SUWV1zdVle3l7CFy2IunK.AE0kCDyyOBulcFYMWwWt8jMdOAYe', 'OWNER',   'ACTIVE'),
('usr-mgr-1',   'Abebe Manager',     'manager@yadotena.com', '$2a$10$1z0SUWV1zdVle3l7CFy2IunK.AE0kCDyyOBulcFYMWwWt8jMdOAYe', 'MANAGER', 'ACTIVE'),
('usr-waiter-1','Tigist Waiter',     'waiter@yadotena.com',  '$2a$10$1z0SUWV1zdVle3l7CFy2IunK.AE0kCDyyOBulcFYMWwWt8jMdOAYe', 'WAITER',  'ACTIVE'),
('usr-chef-1',  'Dawit Kitchen Chef','chef@yadotena.com',    '$2a$10$1z0SUWV1zdVle3l7CFy2IunK.AE0kCDyyOBulcFYMWwWt8jMdOAYe', 'CHEF',    'ACTIVE')
ON CONFLICT (email) DO UPDATE SET
  id = EXCLUDED.id,
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = now();

-- 2. DINING TABLES
INSERT INTO tables (id, name, capacity, status, qr_token) VALUES
('t1',  'Table 01 (Indoor Window)',  2,  'AVAILABLE', 'qr-t1-token'),
('t2',  'Table 02 (Indoor Window)',  4,  'AVAILABLE', 'qr-t2-token'),
('t3',  'Table 03 (Central Dining)', 4,  'OCCUPIED',  'qr-t3-token'),
('t4',  'Table 04 (VIP Lounge)',     6,  'OCCUPIED',  'qr-t4-token'),
('t5',  'Table 05 (Garden Terrace)', 2,  'OCCUPIED',  'qr-t5-token'),
('t6',  'Table 06 (Garden Terrace)', 8,  'OCCUPIED',  'qr-t6-token'),
('t7',  'Table 07 (Balcony View)',   4,  'OCCUPIED',  'qr-t7-token'),
('t8',  'Table 08 (Family Booth)',   6,  'OCCUPIED',  'qr-t8-token'),
('t9',  'Table 09 (Private Corner)', 4,  'AVAILABLE', 'qr-t9-token'),
('t10', 'Table 10 (Executive Suite)', 10, 'AVAILABLE', 'qr-t10-token')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  capacity = EXCLUDED.capacity,
  status = EXCLUDED.status,
  updated_at = now();

-- ============================================================================
-- 3. MENU & SHOP CATEGORIES
-- ============================================================================
INSERT INTO menu_categories (id, name, icon, description, sort_order, is_active) VALUES
-- Restaurant Menu Categories (Cooked & Prepared Made-to-Order Dishes)
('cat-dairy',        'Fresh Dairy & Yadotena Milk', '🥛', 'Pure farm-fresh milk, organic yogurt, milkshakes & cheeses', 0, true),
('cat-traditional',  'Ethiopian Cooked Specials',   '🥘', 'Freshly cooked authentic stews, Doro Wat, sizzling Tibs & Beyaynetu platters', 1, true),
('cat-breakfast',    'Cooked Breakfast & Fitfit',   '🍳', 'Made-to-order morning meals: Chechebsa with Kibbeh, Beef Fitfit & Kinche', 2, true),
('cat-mains',        'Grills & Main Courses',       '🥩', 'Prime beef steak, charbroiled burgers, sizzlers & chef main dishes', 3, true),
('cat-pizza',        'Artisanal Wood-Fired Pizza',  '🍕', 'Freshly baked sourdough pizzas from stone oven', 4, true),
('cat-beverages',    'Brewed Coffee & Juices',      '☕', 'Freshly brewed Jebena Buna, macchiatos, espresso & layered fresh fruit juices', 5, true),
('cat-appetizers',   'Starters & Appetizers',       '🍟', 'Fresh hot fries, sambusa, chicken wings & crispy bites', 6, true),
('cat-desserts',     'Hot Pastries & Desserts',     '🍰', 'Freshly baked lava cakes, warm pastries & artisanal desserts', 7, true),

-- Retail Shop Store Categories (Packaged Over-the-Counter Goods)
('cat-shop',         'Shop & Farm Groceries',       '🛒', 'Farm pantry staples: fresh butter, ayib cheese & roasted coffee packs', 8, true),
('cat-shop-coffee',  'Tomoca & Ground Coffee Packs','☕', 'Packaged Tomoca ground coffee, roasted coffee beans & Yirgacheffe bags', 9, true),
('cat-shop-butter',  'Spiced Butter & Ayib Cheese Jars', '🧈', 'Sealed jars of traditional Ethiopian spiced butter (Niter Kibbeh) & packaged Ayib', 10, true),
('cat-shop-dairy',   'Pasteurized Farm Milk Bottles', '🥛', 'Farm-fresh pasteurized milk bottles, ergo yogurt containers & organic cream', 11, true),
('cat-shop-honey',   'Pure Mountain Honey Jars',    '🍯', '100% pure wild highland forest honey in sealed glass jars', 12, true),
('cat-shop-spices',  'Berbere & Spice Pouches',     '🌶️', 'Packaged authentic Berbere powder, Mitmita jars & spiced Shiro pouches', 13, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- ============================================================================
-- 4. MENU ITEMS (COOKED/PREPARED) & SHOP ITEMS (PACKAGED/RETAIL)
-- ============================================================================
INSERT INTO menu_items (id, name, description, price, category_id, image, available, preparation_time, dietary_tags) VALUES

-- A. FRESH DAIRY & YADOTENA MILK
('item-milk-01', 'Pure Farm-Fresh Cow Milk (Warm / Chilled)', '100% organic, pasteurized rich whole milk served fresh from local dairy farms.', 120.00, 'cat-dairy', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80', true, 5, '["Organic","Dairy"]'::jsonb),
('item-milk-02', 'Artisanal Spiced Ergo (Organic Yogurt)', 'Traditional fermented creamy yogurt topped with mild organic spices and freshly churned butter.', 180.00, 'cat-dairy', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80', true, 5, '["Organic","Vegetarian"]'::jsonb),
('item-milk-03', 'Signature Yadotena Cream Milkshake', 'Ultra-thick milkshake with fresh dairy cream, Madagascar vanilla, and strawberry coulis.', 260.00, 'cat-dairy', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80', true, 8, '["Sweet"]'::jsonb),

-- B. RESTAURANT MENU DISHES
('item-trad-01', 'Special Doro Wat Platter', 'Freshly cooked organic chicken stew simmered in rich berbere spice, served with boiled egg & warm injera.', 550.00, 'cat-traditional', 'https://images.unsplash.com/photo-1604329760661-e7b0c7f4f6c8?auto=format&fit=crop&w=800&q=80', true, 20, '["Spicy","Authentic","Cooked"]'::jsonb),
('item-trad-02', 'Sizzling Beef Tibs Special', 'Pan-sautéed tender beef cubes with red onions, rosemary, green chili jalapeños, and awaze dip.', 480.00, 'cat-traditional', 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80', true, 18, '["Popular","Sizzling"]'::jsonb),
('item-trad-03', 'Grand Fasting Beyaynetu Platter', 'Fresh colorful assortment of 8 traditional vegan dishes including Shiro, Misir, Gomen, and Kik Alicha.', 360.00, 'cat-traditional', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80', true, 15, '["Vegan","Fasting"]'::jsonb),
('item-trad-04', 'Shiro Tegabino with Spiced Kibe', 'Bubbling hot chickpea stew served in traditional clay pot with melted spiced clarified butter.', 280.00, 'cat-traditional', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80', true, 12, '["Vegetarian","Hot"]'::jsonb),

('item-brk-01', 'Special Chechebsa with Honey & Ergo', 'Warm shredded flatbread tossed in spiced kibe & berbere, served with wild honey and cool ergo.', 240.00, 'cat-breakfast', 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=800&q=80', true, 10, '["Favorite","Cooked"]'::jsonb),
('item-brk-02', 'Yadotena House Beef Fitfit', 'Crispy torn injera soaked in rich spiced beef broth, green peppers, and clarified butter.', 320.00, 'cat-breakfast', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80', true, 12, '["Hearty"]'::jsonb),

('item-main-01', 'Prime Ribeye Steak with Herb Mash', 'Char-grilled beef ribeye steak served with rosemary herb butter and garlic mashed potatoes.', 890.00, 'cat-mains', 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=80', true, 25, '["Chef Special"]'::jsonb),
('item-main-02', 'Classic Chicken Burger & Chips', 'Charbroiled chicken breast, melted cheese, lettuce, tomato, and house truffle sauce with hot chips.', 420.00, 'cat-mains', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80', true, 15, '["Popular"]'::jsonb),

('item-pizza-01', 'Artisanal Wood-Fired Margherita', 'Freshly baked sourdough crust with San Marzano tomatoes, buffalo mozzarella, and basil.', 580.00, 'cat-pizza', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80', true, 18, '["Vegetarian"]'::jsonb),
('item-pizza-02', 'Yadotena Meat Lovers Special Pizza', 'Pepperoni, ground beef, chicken sausage, mozzarella, and house chili drizzle.', 680.00, 'cat-pizza', 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80', true, 20, '["Spicy"]'::jsonb),

('item-bev-01', 'Traditional Ethiopian Jebena Buna', 'Freshly roasted & brewed Ethiopian coffee served in traditional clay Jebena pot with popcorn.', 120.00, 'cat-beverages', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80', true, 10, '["Fresh Brew","Traditional"]'::jsonb),
('item-bev-02', 'Signature Double Macchiato', 'Rich double shot espresso topped with velvety steamed milk foam.', 150.00, 'cat-beverages', 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80', true, 5, '["Hot Brew"]'::jsonb),
('item-bev-03', 'Fresh Layered Mango-Avocado Juice', 'Freshly blended organic mango and avocado smoothie layers topped with lime twist.', 190.00, 'cat-beverages', 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=800&q=80', true, 5, '["Fresh Juice"]'::jsonb),
('item-bev-04', 'Special Macchiato', 'Rich espresso with steamed milk foam.', 80.00, 'cat-beverages', 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80', true, 5, '["Hot Brew"]'::jsonb),

('item-app-01', 'Truffle Parmesan Fries', 'Hand-cut potato fries tossed in white truffle oil, sea salt, and aged parmesan.', 250.00, 'cat-appetizers', 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=800&q=80', true, 8, '["Crispy"]'::jsonb),
('item-des-01', 'Molten Chocolate Lava Cake', 'Warm dark chocolate cake with a molten chocolate core, served with vanilla gelato.', 320.00, 'cat-desserts', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80', true, 12, '["Dessert"]'::jsonb),

-- C. RETAIL SHOP STORE PRODUCTS (Packaged Over-the-Counter Goods)
('shop-coffee-500g', 'Roasted Yirgacheffe Coffee Beans (500g)', 'Grade 1 single-origin Ethiopian roasted coffee beans with floral notes.', 480.00, 'cat-shop', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=800&q=80', true, 5, '["Organic","Coffee"]'::jsonb),
('shop-butter-500g', 'Fresh Farm Butter / Kibbeh (500g)', 'Churned fresh cow butter from Debre Zeit dairy co-op.', 320.00, 'cat-shop', 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=800&q=80', true, 5, '["Farm Fresh"]'::jsonb),
('shop-cheese-250g', 'Pasteurized Cottage Cheese / Ayib (250g)', 'Creamy homemade Ayib cheese, perfect with mitmita and spinach.', 180.00, 'cat-shop', 'https://images.unsplash.com/photo-1552767059-ce182ead8c1b?auto=format&fit=crop&w=800&q=80', true, 5, '["Dairy"]'::jsonb),
('shop-ghee-1kg',    'Spiced Clarified Butter / Niter Kibbeh (1kg)', 'Traditional clarified butter slow-infused with korarima, koseret & garlic.', 650.00, 'cat-shop', 'https://images.unsplash.com/photo-1627483262268-9c2b5b2834b5?auto=format&fit=crop&w=800&q=80', true, 5, '["Traditional"]'::jsonb),

('shop-tomoca-250g', 'Tomoca Premium Ground Coffee (250g Pack)', 'Iconic Ethiopian dark roast ground coffee by Tomoca Coffee Addis Ababa, vacuum sealed pack.', 380.00, 'cat-shop-coffee', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=800&q=80', true, 0, '["Tomoca","Packaged"]'::jsonb),
('shop-tomoca-500g', 'Tomoca Gourmet Roasted Coffee Beans (500g Bag)', 'Whole roast Ethiopian Arabica coffee beans by Tomoca, ideal for home grinding & espresso.', 690.00, 'cat-shop-coffee', 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&w=800&q=80', true, 0, '["Tomoca","Whole Beans"]'::jsonb),
('shop-yirga-250g',  'Yirgacheffe Single-Origin Ground Coffee (250g)', 'Light-medium roast ground coffee with signature jasmine floral notes & bright acidity.', 420.00, 'cat-shop-coffee', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80', true, 0, '["Specialty Coffee"]'::jsonb),

('shop-butter-1kg',  'Traditional Spiced Butter / Niter Kibbeh (1kg Glass Jar)', 'Authentic clarified Ethiopian butter simmered with Korarima & Koseret, sealed in 1kg glass jar.', 980.00, 'cat-shop-butter', 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=800&q=80', true, 0, '["Sealed Jar","Artisanal"]'::jsonb),
('shop-ayib-500g',   'Packaged Fresh Cottage Cheese / Ayib (500g Tub)', 'Farm-fresh creamy handmade white Ayib cheese packed in sealed food-grade container.', 240.00, 'cat-shop-butter', 'https://images.unsplash.com/photo-1552767059-ce182ead8c1b?auto=format&fit=crop&w=800&q=80', true, 0, '["Packaged Dairy"]'::jsonb),

('shop-milk-1l',     'Pasteurized Farm Whole Milk (1 Liter Glass Bottle)', 'Daily farm-fresh, pasteurized whole cow milk sealed in eco-friendly glass bottle.', 95.00, 'cat-shop-dairy', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80', true, 0, '["Farm Fresh"]'::jsonb),
('shop-ergo-500g',   'Artisanal Spiced Ergo Yogurt Container (500g)', 'Traditional fermented Ethiopian ergo yogurt infused with black seed in sealed tub.', 140.00, 'cat-shop-dairy', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80', true, 0, '["Fermented Dairy"]'::jsonb),

('shop-honey-1kg',   'Pure Ethiopian Wild Highland Honey (1kg Sealed Jar)', '100% pure raw unfiltered amber honey harvested from highland forest hives, glass jar.', 620.00, 'cat-shop-honey', 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=800&q=80', true, 0, '["Pure Organic"]'::jsonb),

('shop-berbere-500g','Authentic Sun-Dried Berbere Spice Blend (500g Pouch)', 'Hand-ground red chili pepper blend with 12 organic spices in resealable pouch.', 290.00, 'cat-shop-spices', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80', true, 0, '["Spice Pack"]'::jsonb),
('shop-shiro-500g',  'Spiced Chickpea Shiro Powder (500g Pouch)', 'Finely milled seasoned chickpea flour pouch with garlic & korarima for home cooking.', 260.00, 'cat-shop-spices', 'https://images.unsplash.com/photo-1604329760661-e7b0c7f4f6c8?auto=format&fit=crop&w=800&q=80', true, 0, '["Cooking Flour"]'::jsonb),
('shop-mitmita-250g','Extra Spicy Mitmita Chili Powder (250g Shaker Jar)', 'Finely ground bird-eye chili powder with korarima and sea salt in shaker jar.', 180.00, 'cat-shop-spices', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80', true, 0, '["Chili Shaker"]'::jsonb)
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

-- ============================================================================
-- 5. ADDONS & MODIFIERS (Global, Category-Scoped, and Item-Scoped)
-- ============================================================================
INSERT INTO menu_item_addons (id, name, description, price, image_url, category_id, menu_item_id, is_global, is_active, sort_order) VALUES
-- Global addons (any item)
('addon-gl-01', 'Eco Takeaway Box', 'Biodegradable food container for transport.', 25.00, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300', NULL, NULL, true, true, 1),
('addon-gl-02', 'Extra Fresh Injera', 'Soft teff sourdough injera flatbread.', 50.00, 'https://images.unsplash.com/photo-1604329760661-e7b0c7f4f6c8?w=300', NULL, NULL, true, true, 2),

-- Category-scoped addons
('addon-cat-01', 'Extra Melted Niter Kibbeh', 'Warm spiced clarified butter topping.', 60.00, 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=300', 'cat-traditional', NULL, false, true, 1),
('addon-cat-02', 'Fresh Ayib (Cottage Cheese)', 'Cool creamy ayib cheese crumble.', 80.00, 'https://images.unsplash.com/photo-1552767059-ce182ead8c1b?w=300', 'cat-traditional', NULL, false, true, 2),
('addon-cat-03', 'Double Shot Yirgacheffe Espresso', 'Extra single-origin espresso shot.', 40.00, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=300', 'cat-beverages', NULL, false, true, 1),

-- Item-scoped addons
('addon-item-01', 'Extra Hard-Boiled Organic Egg', 'Farm-fresh hard-boiled egg for your stew.', 30.00, 'https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?w=300', NULL, 'item-trad-01', false, true, 1),
('addon-item-02', 'Extra Melted Buffalo Mozzarella', 'More creamy buffalo mozzarella on top.', 90.00, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300', NULL, 'item-pizza-01', false, true, 1),
('addon-item-03', 'Wild Forest Honey & Ergo Dip', 'Side of wild honey and cool ergo.', 70.00, 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=300', NULL, 'item-brk-01', false, true, 1)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- 6. DEMO ORDERS (Fresh, Realistic Kitchen States — timestamps relative to now)
--    Kitchen rounds: order_items carry status + round_number, so the KDS shows
--    each round independently (round 1 READY while round 2 is PREPARING).
-- ============================================================================
INSERT INTO orders (id, type, status, payment_status, table_id, customer_name, customer_phone, delivery_address, subtotal, tax, service_charge, delivery_fee, total, created_at, updated_at) VALUES
-- Fresh NEW ticket (just placed)
('ord-100007', 'DINE_IN', 'PENDING', 'PENDING', 't8', 'Helen G.', '+251 91 345 6789', NULL,
  350.00, 52.50, 35.00, 0.00, 437.50, now() - interval '1 minute', now() - interval '1 minute'),
-- Fresh NEW delivery (paid, awaiting kitchen)
('ord-100006', 'DELIVERY', 'PENDING', 'PAID', NULL, 'Abebe Kebede', '+251 91 123 4567', 'Bole Medhanialem, Addis Ababa',
  1360.00, 204.00, 136.00, 50.00, 1750.00, now() - interval '2 minutes', now() - interval '2 minutes'),
-- Round 2 of a live ticket (added later, currently cooking)
('ord-100004', 'DINE_IN', 'PREPARING', 'PENDING', 't6', 'Sara Tefera', '+251 91 234 5678', NULL,
  1390.00, 208.50, 139.00, 0.00, 1737.50, now() - interval '25 minutes', now() - interval '6 minutes'),
-- Active kitchen queue
('ord-100001', 'DINE_IN', 'PREPARING', 'PENDING', 't3', 'Dawit Haile', '+251 91 456 7890', NULL,
  1580.00, 237.00, 158.00, 0.00, 1975.00, now() - interval '12 minutes', now() - interval '8 minutes'),
('ord-100002', 'DINE_IN', 'PREPARING', 'PENDING', 't4', 'Meron Alemu', '+251 91 567 8901', NULL,
  720.00, 108.00, 72.00, 0.00, 900.00, now() - interval '9 minutes', now() - interval '5 minutes'),
('ord-100005', 'TAKEAWAY', 'PREPARING', 'PAID', NULL, 'Yonas Bekele', '+251 91 678 9012', NULL,
  470.00, 70.50, 47.00, 0.00, 587.50, now() - interval '8 minutes', now() - interval '4 minutes'),
('ord-100008', 'DINE_IN', 'PREPARING', 'PENDING', 't7', 'Hanna Tadesse', '+251 91 789 0123', NULL,
  400.00, 60.00, 40.00, 0.00, 500.00, now() - interval '11 minutes', now() - interval '6 minutes'),
-- Ready for waiter pickup
('ord-100003', 'DINE_IN', 'READY', 'PENDING', 't5', 'Kaleb Girma', '+251 91 890 1234', NULL,
  670.00, 100.50, 67.00, 0.00, 837.50, now() - interval '18 minutes', now() - interval '2 minutes'),
-- Today's completed history (settled + served)
('ord-200001', 'DINE_IN', 'COMPLETED', 'PAID', 't9', 'Ruth Solomon', '+251 91 901 2345', NULL,
  1710.00, 256.50, 171.00, 0.00, 2137.50, now() - interval '3 hours', now() - interval '2 hours'),
('ord-200002', 'DINE_IN', 'COMPLETED', 'PAID', 't10', 'Bethel Tesfaye', '+251 91 012 3456', NULL,
  680.00, 102.00, 68.00, 0.00, 850.00, now() - interval '5 hours', now() - interval '4 hours')
ON CONFLICT (id) DO UPDATE SET
  type = EXCLUDED.type,
  status = EXCLUDED.status,
  payment_status = EXCLUDED.payment_status,
  table_id = EXCLUDED.table_id,
  customer_name = EXCLUDED.customer_name,
  customer_phone = EXCLUDED.customer_phone,
  delivery_address = EXCLUDED.delivery_address,
  subtotal = EXCLUDED.subtotal,
  tax = EXCLUDED.tax,
  service_charge = EXCLUDED.service_charge,
  delivery_fee = EXCLUDED.delivery_fee,
  total = EXCLUDED.total,
  updated_at = EXCLUDED.updated_at;

INSERT INTO order_items (id, order_id, menu_item_id, name, price, quantity, special_instructions, selected_addons, round_number, status, started_at, completed_at) VALUES
-- ord-100007 (t8, NEW)
('oi-100007-1', 'ord-100007', 'item-bev-04', 'Special Macchiato', 80.00, 2, NULL, '[]'::jsonb, 1, 'PENDING', NULL, NULL),
('oi-100007-2', 'ord-100007', 'item-bev-03', 'Fresh Layered Mango-Avocado Juice', 190.00, 1, 'No ice', '[]'::jsonb, 1, 'PENDING', NULL, NULL),
-- ord-100006 (DELIVERY, NEW)
('oi-100006-1', 'ord-100006', 'item-pizza-02', 'Yadotena Meat Lovers Special Pizza', 680.00, 2, 'Cut into 8 slices', '[]'::jsonb, 1, 'PENDING', NULL, NULL),
-- ord-100004 (t6, multi-round: round 1 READY, round 2 PREPARING)
('oi-100004-1', 'ord-100004', 'item-main-01', 'Prime Ribeye Steak with Herb Mash', 890.00, 1, 'Medium rare', '[]'::jsonb, 1, 'READY', now() - interval '20 minutes', now() - interval '3 minutes'),
('oi-100004-2', 'ord-100004', 'item-milk-03', 'Signature Yadotena Cream Milkshake', 260.00, 1, NULL, '[]'::jsonb, 1, 'READY', now() - interval '20 minutes', now() - interval '3 minutes'),
('oi-100004-3', 'ord-100004', 'item-brk-01', 'Special Chechebsa with Honey & Ergo', 240.00, 1, NULL, '["addon-item-03"]'::jsonb, 2, 'PREPARING', now() - interval '3 minutes', NULL),
-- ord-100001 (t3, PREPARING)
('oi-100001-1', 'ord-100001', 'item-trad-01', 'Special Doro Wat Platter', 550.00, 2, NULL, '["addon-item-01"]'::jsonb, 1, 'PREPARING', now() - interval '8 minutes', NULL),
('oi-100001-2', 'ord-100001', 'item-trad-02', 'Sizzling Beef Tibs Special', 480.00, 1, 'Extra awaze on the side', '[]'::jsonb, 1, 'PREPARING', now() - interval '8 minutes', NULL),
-- ord-100002 (t4, PREPARING)
('oi-100002-1', 'ord-100002', 'item-trad-03', 'Grand Fasting Beyaynetu Platter', 360.00, 1, NULL, '[]'::jsonb, 1, 'PREPARING', now() - interval '5 minutes', NULL),
('oi-100002-2', 'ord-100002', 'item-milk-02', 'Artisanal Spiced Ergo (Organic Yogurt)', 180.00, 2, NULL, '[]'::jsonb, 1, 'PREPARING', now() - interval '5 minutes', NULL),
-- ord-100005 (TAKEAWAY, PREPARING)
('oi-100005-1', 'ord-100005', 'item-bev-02', 'Signature Double Macchiato', 150.00, 1, NULL, '[]'::jsonb, 1, 'PREPARING', now() - interval '4 minutes', NULL),
('oi-100005-2', 'ord-100005', 'item-des-01', 'Molten Chocolate Lava Cake', 320.00, 1, NULL, '[]'::jsonb, 1, 'PREPARING', now() - interval '4 minutes', NULL),
-- ord-100008 (t7, PREPARING)
('oi-100008-1', 'ord-100008', 'item-trad-04', 'Shiro Tegabino with Spiced Kibe', 280.00, 1, NULL, '["addon-cat-01"]'::jsonb, 1, 'PREPARING', now() - interval '6 minutes', NULL),
('oi-100008-2', 'ord-100008', 'item-bev-01', 'Traditional Ethiopian Jebena Buna', 120.00, 1, 'With popcorn', '[]'::jsonb, 1, 'PREPARING', now() - interval '6 minutes', NULL),
-- ord-100003 (t5, READY)
('oi-100003-1', 'ord-100003', 'item-main-02', 'Classic Chicken Burger & Chips', 420.00, 1, NULL, '["addon-gl-02"]'::jsonb, 1, 'READY', now() - interval '14 minutes', now() - interval '2 minutes'),
('oi-100003-2', 'ord-100003', 'item-app-01', 'Truffle Parmesan Fries', 250.00, 1, 'Extra crispy', '[]'::jsonb, 1, 'READY', now() - interval '14 minutes', now() - interval '2 minutes'),
-- ord-200001 (completed history)
('oi-200001-1', 'ord-200001', 'item-pizza-01', 'Artisanal Wood-Fired Margherita', 580.00, 2, NULL, '["addon-item-02"]'::jsonb, 1, 'SERVED', now() - interval '2 hours', now() - interval '1 hour'),
('oi-200001-2', 'ord-200001', 'item-trad-01', 'Special Doro Wat Platter', 550.00, 1, NULL, '[]'::jsonb, 1, 'SERVED', now() - interval '2 hours', now() - interval '1 hour'),
-- ord-200002 (completed history)
('oi-200002-1', 'ord-200002', 'item-milk-01', 'Pure Farm-Fresh Cow Milk (Warm / Chilled)', 120.00, 3, NULL, '[]'::jsonb, 1, 'SERVED', now() - interval '4 hours', now() - interval '3 hours'),
('oi-200002-2', 'ord-200002', 'item-brk-02', 'Yadotena House Beef Fitfit', 320.00, 1, NULL, '[]'::jsonb, 1, 'SERVED', now() - interval '4 hours', now() - interval '3 hours')
ON CONFLICT (id) DO UPDATE SET
  order_id = EXCLUDED.order_id,
  menu_item_id = EXCLUDED.menu_item_id,
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  quantity = EXCLUDED.quantity,
  special_instructions = EXCLUDED.special_instructions,
  selected_addons = EXCLUDED.selected_addons,
  round_number = EXCLUDED.round_number,
  status = EXCLUDED.status,
  started_at = EXCLUDED.started_at,
  completed_at = EXCLUDED.completed_at;

-- Normalized order_item_addons join (mirrors selected_addons for consistency)
INSERT INTO order_item_addons (order_item_id, addon_id, name, price) VALUES
('oi-100004-3', 'addon-item-03', 'Wild Forest Honey & Ergo Dip', 70.00),
('oi-100001-1', 'addon-item-01', 'Extra Hard-Boiled Organic Egg', 30.00),
('oi-100008-1', 'addon-cat-01', 'Extra Melted Niter Kibbeh', 60.00),
('oi-100003-1', 'addon-gl-02', 'Extra Fresh Injera', 50.00),
('oi-200001-1', 'addon-item-02', 'Extra Melted Buffalo Mozzarella', 90.00);

-- ============================================================================
-- 7. PAYMENTS (settled orders only)
-- ============================================================================
INSERT INTO payments (order_id, method, amount, status, transaction_ref, created_at) VALUES
('ord-100006', 'TELEBIRR', 1750.00, 'PAID', 'TXN-100006', now() - interval '2 minutes'),
('ord-100005', 'TELEBIRR', 587.50, 'PAID', 'TXN-100005', now() - interval '8 minutes'),
('ord-200001', 'CBE',      2137.50, 'PAID', 'TXN-200001', now() - interval '2 hours'),
('ord-200002', 'TELEBIRR', 850.00, 'PAID', 'TXN-200002', now() - interval '4 hours')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. DINING SESSIONS (active for occupied tables, closed for settled ones)
-- ============================================================================
INSERT INTO dining_sessions (table_id, session_code, status, started_at, closed_at) VALUES
('t3',  'T3-KD82', 'ACTIVE', now() - interval '30 minutes', NULL),
('t4',  'T4-XP31', 'ACTIVE', now() - interval '40 minutes', NULL),
('t5',  'T5-QW77', 'ACTIVE', now() - interval '50 minutes', NULL),
('t6',  'T6-MN54', 'ACTIVE', now() - interval '60 minutes', NULL),
('t7',  'T7-BH29', 'ACTIVE', now() - interval '35 minutes', NULL),
('t8',  'T8-RT66', 'ACTIVE', now() - interval '15 minutes', NULL),
('t9',  'T9-LP10', 'CLOSED', now() - interval '3 hours', now() - interval '2 hours'),
('t10', 'T10-ZC41', 'CLOSED', now() - interval '5 hours', now() - interval '4 hours')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 9. SERVICE REQUESTS
-- ============================================================================
INSERT INTO service_requests (id, table_id, type, status, notes, created_at, resolved_at) VALUES
('req-1001', 't4', 'WAITER', 'PENDING', 'Extra napkins and a bottle of water, please', now() - interval '6 minutes', NULL),
('req-1002', 't6', 'WAITER', 'RESOLVED', 'Refill the popcorn for the jebena', now() - interval '25 minutes', now() - interval '20 minutes')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 10. EXPENSES
-- ============================================================================
INSERT INTO expenses (id, amount, category, description, date, recorded_by_id, payment_method, created_at) VALUES
('exp-1001', 16500.00, 'Ingredients', 'Weekly fresh beef & chicken supply', CURRENT_DATE - 2, 'usr-mgr-1', 'Bank Transfer', now() - interval '2 days'),
('exp-1002', 4800.50, 'Utilities', 'Monthly commercial electricity bill', CURRENT_DATE - 5, 'usr-mgr-1', 'Telebirr', now() - interval '5 days'),
('exp-1003', 3500.00, 'Equipment', 'La Marzocco espresso machine maintenance', CURRENT_DATE - 1, 'usr-mgr-1', 'Cash', now() - interval '1 day')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 11. ACTIVITY LOGS (audit trail for the shift)
-- ============================================================================
INSERT INTO activity_logs (id, user_id, user_name, user_role, action, entity_type, entity_id, description, created_at) VALUES
('act-1001', 'usr-waiter-1', 'Tigist Waiter', 'WAITER', 'ORDER_CREATED', 'orders', 'ord-100007', 'Created dine-in order #100007 for Table 08', now() - interval '1 minute'),
('act-1002', 'usr-waiter-1', 'Tigist Waiter', 'WAITER', 'ORDER_CREATED', 'orders', 'ord-100006', 'Created delivery order #100006 for Abebe Kebede', now() - interval '2 minutes'),
('act-1003', 'usr-chef-1', 'Dawit Kitchen Chef', 'CHEF', 'KITCHEN_START', 'orders', 'ord-100004', 'Started preparing round 2 of order #100004', now() - interval '3 minutes'),
('act-1004', 'usr-chef-1', 'Dawit Kitchen Chef', 'CHEF', 'KITCHEN_READY', 'orders', 'ord-100003', 'Marked round 1 of order #100003 ready for pickup', now() - interval '2 minutes'),
('act-1005', 'usr-waiter-1', 'Tigist Waiter', 'WAITER', 'PAYMENT_RECEIVED', 'payments', 'ord-100005', 'Collected Telebirr payment 587.50 ETB for order #100005', now() - interval '8 minutes')
ON CONFLICT DO NOTHING;
