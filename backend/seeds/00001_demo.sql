-- ============================================================================
-- YADOTENA SEED DATA (Modernized Database-backed Categories & Catalog)
-- ============================================================================

-- 1. USERS & ROLES
INSERT INTO users (id, name, email, password_hash, role, status) VALUES
('usr-owner', 'Yadotena Owner', 'owner@yadotena.com', '$2a$10$1z0SUWV1zdVle3l7CFy2IunK.AE0kCDyyOBulcFYMWwWt8jMdOAYe', 'OWNER', 'ACTIVE'),
('usr-mgr-1', 'Abebe Manager', 'manager@yadotena.com', '$2a$10$1z0SUWV1zdVle3l7CFy2IunK.AE0kCDyyOBulcFYMWwWt8jMdOAYe', 'MANAGER', 'ACTIVE'),
('usr-waiter-1', 'Tigist Waiter', 'waiter@yadotena.com', '$2a$10$1z0SUWV1zdVle3l7CFy2IunK.AE0kCDyyOBulcFYMWwWt8jMdOAYe', 'WAITER', 'ACTIVE'),
('usr-chef-1', 'Dawit Kitchen Chef', 'chef@yadotena.com', '$2a$10$1z0SUWV1zdVle3l7CFy2IunK.AE0kCDyyOBulcFYMWwWt8jMdOAYe', 'CHEF', 'ACTIVE'),
('usr-cashier-1', 'Makeda Cashier', 'cashier@yadotena.com', '$2a$10$1z0SUWV1zdVle3l7CFy2IunK.AE0kCDyyOBulcFYMWwWt8jMdOAYe', 'CASHIER', 'ACTIVE')
ON CONFLICT (email) DO UPDATE SET
  id = EXCLUDED.id,
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = now();

-- 2. DINING TABLES
INSERT INTO tables (id, name, capacity, status, qr_token) VALUES
('t1', 'Table 1', 4, 'AVAILABLE', 'qr-t1-token'),
('t2', 'Table 2', 2, 'AVAILABLE', 'qr-t2-token'),
('t3', 'Table 3', 6, 'AVAILABLE', 'qr-t3-token'),
('t4', 'Table 4', 4, 'AVAILABLE', 'qr-t4-token'),
('t5', 'Table 5', 8, 'AVAILABLE', 'qr-t5-token'),
('t6', 'Table 6', 2, 'AVAILABLE', 'qr-t6-token')
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
('cat-traditional', 'Ethiopian Cooked Specials', '🥘', 'Freshly cooked authentic stews, Doro Wat, sizzling Tibs & Beyaynetu platters', 1, true),
('cat-breakfast', 'Cooked Breakfast & Fitfit', '🍳', 'Made-to-order morning meals: Chechebsa with Kibbeh, Beef Fitfit & Kinche', 2, true),
('cat-mains', 'Grills & Main Courses', '🥩', 'Prime beef steak, charbroiled burgers, sizzlers & chef main dishes', 3, true),
('cat-pizza', 'Artisanal Wood-Fired Pizza', '🍕', 'Freshly baked sourdough pizzas from stone oven', 4, true),
('cat-beverages', 'Brewed Coffee & Juices', '☕', 'Freshly brewed Jebena Buna, macchiatos, espresso & layered fresh fruit juices', 5, true),
('cat-appetizers', 'Starters & Appetizers', '🍟', 'Fresh hot fries, sambusa, chicken wings & crispy bites', 6, true),
('cat-desserts', 'Hot Pastries & Desserts', '🍰', 'Freshly baked lava cakes, warm pastries & artisanal desserts', 7, true),

-- Retail Shop Store Categories (Packaged Over-the-Counter Goods)
('cat-shop-coffee', 'Tomoca & Ground Coffee Packs', '☕', 'Packaged Tomoca ground coffee, roasted coffee beans & Yirgacheffe bags', 8, true),
('cat-shop-butter', 'Spiced Butter & Ayib Cheese Jars', '🧈', 'Sealed jars of traditional Ethiopian spiced butter (Niter Kibbeh) & packaged Ayib', 9, true),
('cat-shop-dairy', 'Pasteurized Farm Milk Bottles', '🥛', 'Farm-fresh pasteurized milk bottles, ergo yogurt containers & organic cream', 10, true),
('cat-shop-honey', 'Pure Mountain Honey Jars', '🍯', '100% pure wild highland forest honey in sealed glass jars', 11, true),
('cat-shop-spices', 'Berbere & Spice Pouches', '🌶️', 'Packaged authentic Berbere powder, Mitmita jars & spiced Shiro pouches', 12, true)
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

-- A. RESTAURANT MENU DISHES (Freshly Cooked & Made-to-Order Kitchen Dishes)
('item-trad-01', 'Special Doro Wat Platter', 'Freshly cooked organic chicken stew simmered in rich berbere spice, served with boiled egg & warm injera.', 550.00, 'cat-traditional', 'https://images.unsplash.com/photo-1604329760661-e7b0c7f4f6c8?auto=format&fit=crop&w=800&q=80', true, 20, '["Spicy","Authentic","Cooked"]'::jsonb),
('item-trad-02', 'Sizzling Beef Tibs Special', 'Pan-sautéed tender beef cubes with red onions, rosemary, green chili jalapeños, and awaze dip.', 480.00, 'cat-traditional', 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80', true, 18, '["Popular","Sizzling"]'::jsonb),
('item-trad-03', 'Grand Fasting Beyaynetu Platter', 'Fresh colorful assortment of 8 traditional vegan dishes including Shiro, Misir, Gomen, and Kik Alicha.', 360.00, 'cat-traditional', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80', true, 15, '["Vegan","Fasting"]'::jsonb),
('item-trad-04', 'Shiro Tegabino with Spiced Kibe', 'Bubbling hot chickpea stew served in traditional clay pot with melted spiced clarified butter.', 280.00, 'cat-traditional', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80', true, 12, '["Vegetarian","Hot"]'::jsonb),

('item-brk-01', 'Special Chechebsa with Honey & Ergo', 'Warm shredded flatbread tossed in spiced kibe & berbere, served with wild honey and cool ergo.', 240.00, 'cat-breakfast', 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=800&q=80', true, 10, '["Favorite","Cooked"]'::jsonb),
('item-brk-02', 'Yadotena House Beef Fitfit', 'Crispy torn injera soaked in rich spiced beef broth, green peppers, and clarified butter.', 320.00, 'cat-breakfast', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80', true, 12, '["Hearty"]'::jsonb),

('item-main-01', 'Prime Ribeye Steak with Herb Mash', 'Char-grilled beef ribeye steak served with rosemary herb butter and garlic mashed potatoes.', 890.00, 'cat-mains', 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=80', true, 25, '["Chef Special"]'::jsonb),
('item-main-02', 'Classic Chicken Burger & Chips', 'Charbroiled chicken breast, melted cheese, lettuce, tomato, and house truffle sauce with hot chips.', 420.00, 'cat-mains', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80', true, 15, '["Popular"]'::jsonb),

('item-pizza-01', 'Artisanal Wood-Fired Margherita', 'Freshly baked sourdough crust with San Marzano tomatoes, buffalo mozzarella, and basil.', 580.00, 'cat-pizza', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80', true, 18, '["Vegetarian"]'::jsonb),

('item-bev-01', 'Traditional Ethiopian Jebena Buna', 'Freshly roasted & brewed Ethiopian coffee served in traditional clay Jebena pot with popcorn.', 120.00, 'cat-beverages', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80', true, 10, '["Fresh Brew","Traditional"]'::jsonb),
('item-bev-02', 'Signature Double Macchiato', 'Rich double shot espresso topped with velvety steamed milk foam.', 150.00, 'cat-beverages', 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80', true, 5, '["Hot Brew"]'::jsonb),
('item-bev-03', 'Fresh Layered Mango-Avocado Juice', 'Freshly blended organic mango and avocado smoothie layers topped with lime twist.', 190.00, 'cat-beverages', 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=800&q=80', true, 5, '["Fresh Juice"]'::jsonb),

-- B. RETAIL SHOP STORE PRODUCTS (Packaged Over-the-Counter Goods)
('shop-tomoca-250g', 'Tomoca Premium Ground Coffee (250g Pack)', 'Iconic Ethiopian dark roast ground coffee by Tomoca Coffee Addis Ababa, vacuum sealed pack.', 380.00, 'cat-shop-coffee', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=800&q=80', true, 0, '["Tomoca","Packaged"]'::jsonb),
('shop-tomoca-500g', 'Tomoca Gourmet Roasted Coffee Beans (500g Bag)', 'Whole roast Ethiopian Arabica coffee beans by Tomoca, ideal for home grinding & espresso.', 690.00, 'cat-shop-coffee', 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&w=800&q=80', true, 0, '["Tomoca","Whole Beans"]'::jsonb),
('shop-yirga-250g', 'Yirgacheffe Single-Origin Ground Coffee (250g)', 'Light-medium roast ground coffee with signature jasmine floral notes & bright acidity.', 420.00, 'cat-shop-coffee', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80', true, 0, '["Specialty Coffee"]'::jsonb),

('shop-butter-1kg', 'Traditional Spiced Butter / Niter Kibbeh (1kg Glass Jar)', 'Authentic clarified Ethiopian butter simmered with Korarima & Koseret, sealed in 1kg glass jar.', 980.00, 'cat-shop-butter', 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=800&q=80', true, 0, '["Sealed Jar","Artisanal"]'::jsonb),
('shop-ayib-500g', 'Packaged Fresh Cottage Cheese / Ayib (500g Tub)', 'Farm-fresh creamy handmade white Ayib cheese packed in sealed food-grade container.', 240.00, 'cat-shop-butter', 'https://images.unsplash.com/photo-1552767059-ce182ead8c1b?auto=format&fit=crop&w=800&q=80', true, 0, '["Packaged Dairy"]'::jsonb),

('shop-milk-1l', 'Pasteurized Farm Whole Milk (1 Liter Glass Bottle)', 'Daily farm-fresh, pasteurized whole cow milk sealed in eco-friendly glass bottle.', 95.00, 'cat-shop-dairy', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80', true, 0, '["Farm Fresh"]'::jsonb),
('shop-ergo-500g', 'Artisanal Spiced Ergo Yogurt Container (500g)', 'Traditional fermented Ethiopian ergo yogurt infused with black seed in sealed tub.', 140.00, 'cat-shop-dairy', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80', true, 0, '["Fermented Dairy"]'::jsonb),

('shop-honey-1kg', 'Pure Ethiopian Wild Highland Honey (1kg Sealed Jar)', '100% pure raw unfiltered amber honey harvested from highland forest hives, glass jar.', 620.00, 'cat-shop-honey', 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=800&q=80', true, 0, '["Pure Organic"]'::jsonb),

('shop-berbere-500g', 'Authentic Sun-Dried Berbere Spice Blend (500g Pouch)', 'Hand-ground red chili pepper blend with 12 organic spices in resealable pouch.', 290.00, 'cat-shop-spices', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80', true, 0, '["Spice Pack"]'::jsonb),
('shop-shiro-500g', 'Spiced Chickpea Shiro Powder (500g Pouch)', 'Finely milled seasoned chickpea flour pouch with garlic & korarima for home cooking.', 260.00, 'cat-shop-spices', 'https://images.unsplash.com/photo-1604329760661-e7b0c7f4f6c8?auto=format&fit=crop&w=800&q=80', true, 0, '["Cooking Flour"]'::jsonb),
('shop-mitmita-250g', 'Extra Spicy Mitmita Chili Powder (250g Shaker Jar)', 'Finely ground bird-eye chili powder with korarima and sea salt in shaker jar.', 180.00, 'cat-shop-spices', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80', true, 0, '["Chili Shaker"]'::jsonb)
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
-- 5. ADDONS & MODIFIERS (Scoped to Restaurant Menu Items)
-- ============================================================================
INSERT INTO menu_item_addons (id, name, description, price, image_url, category_id, menu_item_id, is_global, is_active, sort_order) VALUES
('addon-gl-01', 'Eco Takeaway Box', 'Biodegradable food container for transport.', 25.00, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300', NULL, NULL, true, true, 1),
('addon-gl-02', 'Extra Fresh Injera', 'Soft teff sourdough injera flatbread.', 50.00, 'https://images.unsplash.com/photo-1604329760661-e7b0c7f4f6c8?w=300', NULL, NULL, true, true, 2),
('addon-cat-01', 'Extra Melted Niter Kibbeh', 'Warm spiced clarified butter topping.', 60.00, 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=300', 'cat-traditional', NULL, false, true, 1)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active;
