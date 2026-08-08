import uuid
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.authentication.models import User, Role, UserStatus
from apps.menu.models import MenuCategory, MenuItem, MenuItemAddon
from apps.tables.models import Table, TableStatus
from apps.orders.models import Order, OrderItem, OrderStatus, OrderType, PaymentStatus
from apps.service_requests.models import ServiceRequest, ServiceRequestType, ServiceRequestStatus
from apps.payments.models import Payment, PaymentMethod
from apps.expenses.models import Expense, ExpenseCategory
from apps.customers.models import Customer
from apps.reviews.models import Review
from apps.core.models import RestaurantSetting

class Command(BaseCommand):
    help = 'Seeds initial realistic data for Yadotena Milk & Foods platform'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting Yadotena Milk & Foods data seeding...'))

        # 1. Restaurant Settings
        setting, _ = RestaurantSetting.objects.get_or_create(id=1)
        setting.restaurant_name = "Yadotena Milk & Foods"
        setting.phone = "+251 91 123 4567"
        setting.address = "Bole Road, Addis Ababa, Ethiopia"
        setting.service_charge_percent = 10.00
        setting.vat_percent = 15.00
        setting.guest_wifi_ssid = "Yadotena_Milk_5G"
        setting.guest_wifi_password = "Yadotena2026"
        setting.save()
        self.stdout.write(self.style.SUCCESS('✓ Restaurant settings configured.'))

        # 2. Users
        users_data = [
            {"email": "owner@demo.com", "name": "Alice Owner", "role": Role.OWNER, "is_superuser": True, "is_staff": True},
            {"email": "manager@demo.com", "name": "Bob Manager", "role": Role.MANAGER, "is_staff": True},
            {"email": "waiter@demo.com", "name": "Charlie Waiter", "role": Role.WAITER},
            {"email": "kitchen@demo.com", "name": "Dave Chef", "role": Role.KITCHEN},
        ]
        created_users = {}
        for u in users_data:
            user, created = User.objects.get_or_create(
                email=u["email"],
                defaults={
                    "name": u["name"],
                    "role": u["role"],
                    "status": UserStatus.ACTIVE,
                    "is_staff": u.get("is_staff", False),
                    "is_superuser": u.get("is_superuser", False)
                }
            )
            user.set_password("password123")
            user.save()
            created_users[u["role"]] = user
        self.stdout.write(self.style.SUCCESS('✓ Demo users seeded (password: password123).'))

        # 3. Categories
        categories_data = [
            {"id": "cat-0", "name": "Fresh Dairy & Milk", "icon": "🥛", "description": "Pure farm-fresh milk, organic yogurt, milkshakes & cheeses", "sort_order": 1},
            {"id": "cat-1", "name": "Main Course", "icon": "🍔", "description": "Hearty chef special main dishes and steaks", "sort_order": 2},
            {"id": "cat-2", "name": "Pizza", "icon": "🍕", "description": "Artisanal stone-baked crust pizzas", "sort_order": 3},
            {"id": "cat-3", "name": "Appetizers", "icon": "🍟", "description": "Tasty snacks, dips, and finger foods", "sort_order": 4},
            {"id": "cat-4", "name": "Beverages", "icon": "☕", "description": "Specialty Ethiopian coffee, tea, and drinks", "sort_order": 5},
            {"id": "cat-5", "name": "Desserts", "icon": "🍰", "description": "Freshly baked sweets and chocolate treats", "sort_order": 6},
            {"id": "cat-6", "name": "Traditional", "icon": "🍲", "description": "Authentic gourmet Ethiopian cuisine & platters", "sort_order": 7},
        ]
        category_objs = {}
        for c in categories_data:
            cat_obj, _ = MenuCategory.objects.update_or_create(
                id=c["id"],
                defaults={
                    "name": c["name"],
                    "icon": c["icon"],
                    "description": c["description"],
                    "sort_order": c["sort_order"],
                    "is_active": True
                }
            )
            category_objs[c["name"]] = cat_obj
        self.stdout.write(self.style.SUCCESS('✓ Menu categories seeded.'))

        # 4. Menu Items
        menu_items_data = [
            {
                "id": "m0-1",
                "name": "Pure Farm-Fresh Cow Milk (Warm / Chilled)",
                "description": "100% organic, pasteurized rich whole milk served fresh from local dairy farms.",
                "price": 120.00,
                "category": "Fresh Dairy & Milk",
                "image": "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80",
                "available": True,
                "preparation_time": 5,
                "dietary_tags": ["Organic", "Popular", "Gluten-Free"],
                "addons": [
                    {"name": "Pure Honey Drizzle", "price": 30.00},
                    {"name": "Cinnamon & Cardamom Spice", "price": 20.00},
                ]
            },
            {
                "id": "m0-2",
                "name": "Artisanal Spiced Ergo (Organic Yogurt)",
                "description": "Traditional fermented creamy yogurt topped with mild organic spices and freshly churned butter.",
                "price": 180.00,
                "category": "Fresh Dairy & Milk",
                "image": "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80",
                "available": True,
                "preparation_time": 5,
                "dietary_tags": ["Chef's Special", "Vegetarian", "Popular"],
                "addons": [
                    {"name": "Extra Pure Niter Kibbeh (Spiced Butter)", "price": 50.00},
                    {"name": "Roasted Barley / Kolo Garnish", "price": 40.00},
                ]
            },
            {
                "id": "m0-3",
                "name": "Signature Yadotena Cream Milkshake",
                "description": "Ultra-thick, rich milkshake prepared with fresh dairy cream, Madagascar vanilla, and strawberry coulis.",
                "price": 260.00,
                "category": "Fresh Dairy & Milk",
                "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80",
                "available": True,
                "preparation_time": 8,
                "dietary_tags": ["Sweet", "Popular"],
                "addons": [
                    {"name": "Whipped Dairy Cream & Cherry", "price": 40.00},
                    {"name": "Belgian Chocolate Drizzle", "price": 50.00},
                ]
            },
            {
                "id": "m1",
                "name": "Classic Chicken Burger",
                "description": "Grilled marinated chicken breast, organic lettuce, ripe tomato and secret house sauce.",
                "price": 380.00,
                "category": "Main Course",
                "image": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
                "available": True,
                "preparation_time": 15,
                "dietary_tags": ["Halal", "Popular"],
                "addons": [
                    {"name": "Extra Melted Cheese", "price": 60.00},
                    {"name": "Crispy Beef Bacon", "price": 90.00},
                    {"name": "Truffle Aioli Dip", "price": 80.00},
                ]
            },
            {
                "id": "m2",
                "name": "Prime Beef Ribeye Steak",
                "description": "Premium cut tender beef steak with rosemary herb butter and roasted garlic mash.",
                "price": 850.00,
                "category": "Main Course",
                "image": "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=80",
                "available": True,
                "preparation_time": 25,
                "dietary_tags": ["Chef's Special", "Gluten-Free", "Halal"],
                "addons": [
                    {"name": "Mushroom Peppercorn Sauce", "price": 80.00},
                    {"name": "Extra Garlic Mash", "price": 70.00},
                ]
            },
            {
                "id": "m3",
                "name": "Artisanal Margherita Pizza",
                "description": "Stone-baked Italian crust with San Marzano tomatoes, fresh buffalo mozzarella, and basil.",
                "price": 550.00,
                "category": "Pizza",
                "image": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80",
                "available": True,
                "preparation_time": 18,
                "dietary_tags": ["Vegetarian", "Popular"],
                "addons": [
                    {"name": "Extra Fresh Mozzarella", "price": 80.00},
                    {"name": "Kalamata Olives", "price": 50.00},
                ]
            },
            {
                "id": "m4",
                "name": "Special Doro Wot Platter",
                "description": "Slow-cooked organic chicken drumstick in rich berbere sauce with hard-boiled egg and fresh injera.",
                "price": 480.00,
                "category": "Traditional",
                "image": "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=800&q=80",
                "available": True,
                "preparation_time": 20,
                "dietary_tags": ["Chef's Special", "Halal", "Spicy"],
                "addons": [
                    {"name": "Extra Organic Ayib (Cottage Cheese)", "price": 50.00},
                    {"name": "Extra Injera Roll", "price": 30.00},
                ]
            },
            {
                "id": "m5",
                "name": "Single Origin Yirgacheffe Espresso",
                "description": "Freshly roasted single-origin Ethiopian coffee with jasmine notes and citrus aroma.",
                "price": 90.00,
                "category": "Beverages",
                "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80",
                "available": True,
                "preparation_time": 5,
                "dietary_tags": ["Popular", "Gluten-Free"],
                "addons": [
                    {"name": "Double Shot", "price": 40.00},
                    {"name": "Oat Milk Substitute", "price": 50.00},
                ]
            },
        ]
        created_menu_items = {}
        for m in menu_items_data:
            cat_obj = category_objs.get(m["category"])
            item, _ = MenuItem.objects.update_or_create(
                id=m["id"],
                defaults={
                    "name": m["name"],
                    "description": m["description"],
                    "price": m["price"],
                    "category": cat_obj,
                    "image": m["image"],
                    "available": m["available"],
                    "preparation_time": m["preparation_time"],
                    "dietary_tags": m["dietary_tags"],
                }
            )
            created_menu_items[m["id"]] = item
            # Create addons
            item.custom_addons.all().delete()
            for add_idx, addon in enumerate(m.get("addons", [])):
                MenuItemAddon.objects.create(
                    id=f"add-{m['id']}-{add_idx+1}",
                    menu_item=item,
                    name=addon["name"],
                    price=addon["price"]
                )
        self.stdout.write(self.style.SUCCESS('✓ Menu items and custom addons seeded.'))

        # 5. Tables
        tables_data = [
            {"id": "t1", "name": "Table 01", "capacity": 2, "status": TableStatus.AVAILABLE},
            {"id": "t2", "name": "Table 02", "capacity": 4, "status": TableStatus.OCCUPIED},
            {"id": "t3", "name": "Table 03", "capacity": 4, "status": TableStatus.PREPARING},
            {"id": "t4", "name": "Table 04", "capacity": 6, "status": TableStatus.WAITING_FOR_SERVICE},
            {"id": "t5", "name": "Table 05", "capacity": 2, "status": TableStatus.AVAILABLE},
            {"id": "t6", "name": "Table 06", "capacity": 8, "status": TableStatus.AVAILABLE},
            {"id": "t7", "name": "Table 07", "capacity": 4, "status": TableStatus.WAITING_FOR_PAYMENT},
            {"id": "t8", "name": "Table 08", "capacity": 6, "status": TableStatus.AVAILABLE},
        ]
        created_tables = {}
        for t in tables_data:
            tbl, _ = Table.objects.update_or_create(
                id=t["id"],
                defaults={
                    "name": t["name"],
                    "capacity": t["capacity"],
                    "status": t["status"],
                    "qr_token": f"token-{t['id']}-yadotena"
                }
            )
            created_tables[t["id"]] = tbl
        self.stdout.write(self.style.SUCCESS('✓ Dining tables seeded.'))

        # 6. Sample Orders
        order1, _ = Order.objects.update_or_create(
            id="ORD-1042",
            defaults={
                "type": OrderType.DINE_IN,
                "status": OrderStatus.PREPARING,
                "payment_status": PaymentStatus.PENDING,
                "table": created_tables["t3"],
                "subtotal": 560.00,
                "total": 560.00,
            }
        )
        order1.items.all().delete()
        OrderItem.objects.create(
            id="it-1",
            order=order1,
            menu_item=created_menu_items["m0-1"],
            name="Pure Farm-Fresh Cow Milk (Warm / Chilled)",
            price=120.00,
            quantity=1,
            special_instructions="Serve warm with honey on the side"
        )
        OrderItem.objects.create(
            id="it-2",
            order=order1,
            menu_item=created_menu_items["m1"],
            name="Classic Chicken Burger",
            price=380.00,
            quantity=1,
            special_instructions="No onions please",
            selected_addons=[{"name": "Extra Melted Cheese", "price": 60.00}]
        )

        order2, _ = Order.objects.update_or_create(
            id="ORD-1040",
            defaults={
                "type": OrderType.TAKEAWAY,
                "status": OrderStatus.COMPLETED,
                "payment_status": PaymentStatus.PAID,
                "customer_name": "Abebe Kebede",
                "customer_phone": "+251 91 144 5566",
                "subtotal": 850.00,
                "total": 850.00,
            }
        )
        Payment.objects.get_or_create(
            order=order2,
            defaults={
                "method": PaymentMethod.TELEBIRR,
                "amount": 850.00,
                "status": PaymentStatus.PAID,
                "transaction_ref": "TB-88492019"
            }
        )

        self.stdout.write(self.style.SUCCESS('✓ Orders and payments seeded.'))

        # 7. Service Requests
        ServiceRequest.objects.get_or_create(
            id="req-1",
            defaults={
                "table": created_tables["t4"],
                "type": ServiceRequestType.WAITER,
                "status": ServiceRequestStatus.PENDING,
                "notes": "Guest requested extra napkins and water refill"
            }
        )
        ServiceRequest.objects.get_or_create(
            id="req-2",
            defaults={
                "table": created_tables["t7"],
                "type": ServiceRequestType.BILL,
                "status": ServiceRequestStatus.PENDING,
                "notes": "Requested table bill via Telebirr"
            }
        )
        self.stdout.write(self.style.SUCCESS('✓ Service requests seeded.'))

        # 8. Operating Expenses
        expenses_data = [
            {"id": "exp-1", "amount": 12500.00, "category": ExpenseCategory.DAIRY_SUPPLIES, "description": "250L Fresh organic cow milk delivery from Sululta dairy farm"},
            {"id": "exp-2", "amount": 8400.00, "category": ExpenseCategory.KITCHEN_SUPPLIES, "description": "Organic chicken, beef ribeye cuts & fresh bakery rolls"},
            {"id": "exp-3", "amount": 3200.00, "category": ExpenseCategory.PACKAGING, "description": "Biodegradable paper takeaway cups, food boxes & paper bags"},
            {"id": "exp-4", "amount": 4500.00, "category": ExpenseCategory.UTILITIES, "description": "Monthly electricity & commercial refrigeration power"},
        ]
        for exp in expenses_data:
            Expense.objects.update_or_create(
                id=exp["id"],
                defaults={
                    "amount": exp["amount"],
                    "category": exp["category"],
                    "description": exp["description"],
                    "recorded_by": created_users.get(Role.MANAGER),
                    "payment_method": "Bank Transfer"
                }
            )
        self.stdout.write(self.style.SUCCESS('✓ Operating expenses seeded.'))

        # 9. Customers
        customers_data = [
            {"id": "c1", "name": "Abebe Kebede", "phone": "+251 91 144 5566", "email": "abebe@example.com", "total_orders": 8, "total_spent": 5420.00},
            {"id": "c2", "name": "Tigist Haile", "phone": "+251 92 333 7788", "email": "tigist@example.com", "total_orders": 5, "total_spent": 3800.00},
            {"id": "c3", "name": "Yared Mengistu", "phone": "+251 93 555 9900", "email": "yared@example.com", "total_orders": 12, "total_spent": 9850.00},
        ]
        for cust in customers_data:
            Customer.objects.update_or_create(
                id=cust["id"],
                defaults={
                    "name": cust["name"],
                    "phone": cust["phone"],
                    "email": cust["email"],
                    "total_orders": cust["total_orders"],
                    "total_spent": cust["total_spent"],
                }
            )
        self.stdout.write(self.style.SUCCESS('✓ Customers database seeded.'))

        # 10. Reviews
        Review.objects.get_or_create(
            id="rev-1",
            defaults={
                "customer_name": "Tigist H.",
                "rating": 5,
                "comment": "The fresh cow milk and spiced ergo are absolutely top tier! Best dairy café in Addis."
            }
        )
        Review.objects.get_or_create(
            id="rev-2",
            defaults={
                "customer_name": "Abebe K.",
                "rating": 5,
                "comment": "Speedy QR ordering and great burger. Will definitely come back."
            }
        )
        self.stdout.write(self.style.SUCCESS('✓ Customer reviews seeded.'))

        self.stdout.write(self.style.SUCCESS('🎉 ALL YADOTENA MILK & FOODS DATA SUCCESSFULLY SEEDED!'))
