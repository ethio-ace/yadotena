Absolutely. Here’s a clean **MVP-level system documentation** based on everything we discussed.

# Restaurant & Café Management System — System Documentation

## 1. System Overview

The system is a web-based restaurant and café management platform designed to connect **customers, waiters, kitchen staff, managers, and owners** in one system.

The main goals are to:

* Allow customers to order food easily from their phones.
* Connect dine-in orders to specific tables.
* Allow takeaway and delivery ordering.
* Help staff receive, verify, prepare, and deliver orders.
* Help managers control daily restaurant operations.
* Help owners monitor sales, expenses, finances, and business performance.
* Provide a foundation that can later be customized for different types of restaurants and cafés.

---

# 2. User Roles

The system has five primary roles:

| Role              | Main Responsibility                                           |
| ----------------- | ------------------------------------------------------------- |
| **Customer**      | Browse menu, place orders, make payments, track orders        |
| **Waiter**        | Manage tables, receive and deliver orders, assist customers   |
| **Kitchen Staff** | Prepare orders and update preparation status                  |
| **Manager**       | Verify and manage operations, staff, menus, orders, expenses  |
| **Owner**         | Monitor business performance, finances, reports, and settings |

The system should use **role-based permissions**, meaning each user can only access functions appropriate to their role.

---

# 3. Customer

## 3.1 Dine-in Customer

A dine-in customer should **not be required to create an account**.

### Customer flow

1. Customer sits at a table.
2. Customer scans the QR code on the table.
3. System identifies:

   * Restaurant
   * Table number
   * Dining session
4. Customer sees the restaurant menu.
5. Customer selects food/drinks.
6. Customer adds items to cart.
7. Customer confirms the order.
8. Order is sent to the restaurant.
9. Customer can track the order.
10. Customer receives the food.
11. Customer can request the bill.
12. Customer completes payment.
13. Dining session is completed.

### Customer should see

* Restaurant name
* Table number
* Menu categories
* Food images
* Food names
* Descriptions
* Prices
* Available/unavailable status
* Add-ons/options
* Special instructions
* Cart
* Order summary
* Order status
* Estimated preparation time
* Request waiter
* Request bill
* Order more
* Payment information
* Feedback/rating

---

# 4. Customer Sessions

A **session-based system** should be used instead of requiring accounts for dine-in customers.

For example:

> Table 12 → Session #A82F91

All orders made from that table during the visit can belong to the same dining session.

This allows multiple customers at the same table to order without creating accounts.

### Example

Customer A orders:

* Burger
* Coke

Customer B later orders:

* Pizza
* Coffee

Both orders can belong to:

**Table 12 — Dining Session #A82F91**

This makes it possible for the restaurant to manage the complete table bill.

---

# 5. Takeaway Customer

Takeaway customers don't have a table session.

They should provide basic contact information before completing the order.

### Required information

* Customer name
* Phone number

Optional:

* Email
* Additional instructions

### Takeaway flow

**Menu → Cart → Customer information → Payment → Order confirmation → Preparation → Ready → Pickup**

The customer should receive an order/reference number.

Example:

> Order #TK-1042

The customer can use the order tracking page to check the status.

---

# 6. Delivery Customer

Delivery requires additional information.

### Required information

* Customer name
* Phone number
* Delivery address

Optional:

* Email
* Delivery instructions
* Location details

### Delivery flow

**Menu → Cart → Delivery information → Payment → Order confirmation → Preparation → Ready → Delivery → Completed**

The system should distinguish delivery orders from dine-in and takeaway orders.

---

# 7. Customer Order Tracking

The customer should have a simple tracking page.

Example:

**Order #1042**

`Order Received ✓`

`Confirmed ✓`

`Preparing ●`

`Ready`

`Completed`

For delivery:

`Order Received`

`Confirmed`

`Preparing`

`Ready`

`Out for Delivery`

`Delivered`

The customer should not need an account to view the order.

A unique order/session link or secure order token can be used to access the tracking page.

---

# 8. Waiter

The waiter is responsible for handling customers and physical restaurant operations.

## Waiter functions

### Table management

The waiter can:

* View tables
* See table numbers
* See table status
* See active dining sessions
* See whether a table has an active order
* Open/close table sessions when permitted
* Assist customers
* Receive waiter requests

### Table statuses

Example:

* Available
* Occupied
* Ordering
* Preparing
* Waiting for service
* Served
* Waiting for payment
* Cleaning

---

## Order management

The waiter can:

* View incoming orders
* View order details
* See table number
* See customer/order information
* Accept/acknowledge orders when required
* Deliver prepared food
* Mark orders as served
* Add manual orders
* Request corrections
* Cancel orders according to permission rules

The waiter should **not** automatically have access to financial reports or sensitive management functions.

---

# 9. Kitchen Staff

Kitchen staff focuses on food preparation.

The kitchen role is included in the system even if a small café doesn't have a dedicated kitchen team.

## Kitchen functions

Kitchen staff can:

* View confirmed orders
* View ordered items
* View quantities
* View special instructions
* See table/order type
* Start preparing an order
* Mark order as ready
* Report unavailable items
* See priority/order time

### Kitchen order statuses

For example:

**Confirmed → Preparing → Ready**

The kitchen shouldn't need access to:

* Financial reports
* Employee management
* Business settings
* Customer management
* Expenses

unless the manager explicitly grants permission.

---

# 10. Manager

The manager is the main operational administrator.

The manager should have broad access to the restaurant's day-to-day operations.

## 10.1 Dashboard

The manager dashboard should show:

* Today's orders
* Today's sales
* Pending orders
* Preparing orders
* Ready orders
* Completed orders
* Active tables
* Cancelled orders
* Outstanding payments
* Expenses
* Basic performance statistics

---

# 11. Manager — Order Management

The manager can:

* View all orders
* Verify incoming orders
* View order details
* Change order status
* Cancel orders
* Modify orders where permitted
* Handle failed/problematic orders
* View order history
* Search orders
* Filter orders
* View orders by:

  * Table
  * Waiter
  * Date
  * Status
  * Order type

The manager should be able to distinguish:

**Dine-in / Takeaway / Delivery**

---

# 12. Manager — Menu Management

The manager can manage the restaurant menu.

### Categories

Examples:

* Breakfast
* Main dishes
* Pizza
* Burgers
* Drinks
* Desserts

### Menu items

Each item can contain:

* Name
* Description
* Image
* Price
* Category
* Availability
* Preparation time
* Options/add-ons
* Special instructions

The manager should be able to:

* Add items
* Edit items
* Delete/deactivate items
* Change prices
* Mark items unavailable
* Organize categories

---

# 13. Manager — Table Management

The manager can:

* Create tables
* Edit tables
* Delete/deactivate tables
* Assign table numbers
* Generate QR codes
* View table status
* View active sessions
* View orders associated with tables

Each table should have a unique QR code.

Example:

**Table 01 → QR-001**

**Table 02 → QR-002**

---

# 14. Manager — Customer Management

The system should not require every customer to have an account.

However, the manager can see customer information associated with orders when available.

For example:

* Name
* Phone number
* Order history
* Order type
* Total orders
* Total spending

For dine-in customers who don't provide personal information, the system should simply associate the order with the dining session/table.

---

# 15. Manager — Expense Management

The system should allow the manager to record restaurant expenses.

Examples:

* Food ingredients
* Drinks
* Packaging
* Utilities
* Transportation
* Maintenance
* Equipment
* Salaries
* Other expenses

Each expense can contain:

* Expense category
* Amount
* Date
* Description
* Payment method
* Recorded by
* Optional attachment/receipt

---

# 16. Financial Management

The system should provide basic financial information.

### Revenue

Track:

* Daily sales
* Weekly sales
* Monthly sales
* Sales by order type
* Sales by payment method

### Expenses

Track:

* Daily expenses
* Weekly expenses
* Monthly expenses
* Expense categories

### Basic calculation

**Revenue − Expenses = Net Result**

The system should clearly distinguish between:

* Gross sales
* Discounts
* Taxes/service charges where applicable
* Refunds
* Expenses
* Net revenue/result

---

# 17. Owner

The owner has the highest level of access.

The owner focuses less on individual orders and more on **business performance and management**.

## Owner dashboard

The owner can see:

* Today's revenue
* Monthly revenue
* Total orders
* Average order value
* Expenses
* Net result
* Best-selling products
* Sales trends
* Sales by order type
* Sales by payment method
* Employee performance
* Restaurant performance

---

# 18. Owner — Reports

Reports should include:

### Sales reports

* Daily sales
* Weekly sales
* Monthly sales
* Custom date range

### Order reports

* Number of orders
* Completed orders
* Cancelled orders
* Dine-in orders
* Takeaway orders
* Delivery orders

### Product reports

* Best-selling items
* Least-selling items
* Revenue per item
* Revenue per category

### Financial reports

* Revenue
* Expenses
* Net result
* Expense breakdown

---

# 19. Order Types

The system should support three primary order types.

### 1. Dine-in

Connected to:

**Restaurant → Table → Dining Session → Order**

No customer account required.

### 2. Takeaway

Connected to:

**Restaurant → Customer → Order → Pickup**

Customer contact information required.

### 3. Delivery

Connected to:

**Restaurant → Customer → Address → Order → Delivery**

Customer contact and delivery information required.

---

# 20. Order Lifecycle

A standard order lifecycle should be:

**Pending**

↓

**Confirmed**

↓

**Preparing**

↓

**Ready**

↓

**Served / Picked Up / Out for Delivery**

↓

**Completed**

There can also be exceptional statuses:

* Cancelled
* Rejected
* Refunded
* Failed

The exact workflow can depend on the order type.

---

# 21. Payment

Payment should be associated with an order.

The system should support:

* Payment status
* Payment method
* Amount
* Transaction/reference number
* Payment date/time

Possible payment statuses:

* Pending
* Paid
* Failed
* Refunded
* Partially refunded

For external takeaway/delivery orders, **payment should be completed before the restaurant begins preparing the order**, according to the business rule discussed.

---

# 22. Notifications

The system should support notifications for important events.

### Customer

* Order confirmed
* Order preparing
* Order ready
* Delivery updates
* Payment confirmation

### Staff

* New order
* Customer requests waiter
* New delivery/takeaway order
* Order requiring attention

Notifications can eventually support:

* In-app notifications
* SMS
* WhatsApp
* Email

For the initial system, the live order-tracking page can remain the primary customer status mechanism.

---

# 23. Feedback

After an order is completed, the customer can optionally provide:

* Rating
* Comment
* Food rating
* Service rating

The manager/owner can view feedback and use it to monitor service quality.

---

# 24. Permissions

The system should use role-based access control.

| Function               | Customer | Waiter | Kitchen | Manager | Owner |
| ---------------------- | -------: | -----: | ------: | ------: | ----: |
| Browse menu            |        ✓ |      ✓ |       ✓ |       ✓ |     ✓ |
| Place order            |        ✓ |      ✓ |       — |       ✓ |     ✓ |
| View own orders        |        ✓ |      ✓ |       ✓ |       ✓ |     ✓ |
| Manage tables          |        — |      ✓ |       — |       ✓ |     ✓ |
| Prepare orders         |        — |      — |       ✓ |       ✓ |     ✓ |
| Manage orders          |      Own |      ✓ | Limited |       ✓ |     ✓ |
| Manage menu            |        — |      — |       — |       ✓ |     ✓ |
| Manage expenses        |        — |      — |       — |       ✓ |     ✓ |
| View financial reports |        — |      — |       — |       ✓ |     ✓ |
| Manage employees       |        — |      — |       — |       ✓ |     ✓ |
| Business settings      |        — |      — |       — | Limited |     ✓ |
| View business reports  |        — |      — |       — |       ✓ |     ✓ |

Permissions should eventually be configurable so different restaurants can customize staff access.

---

# 25. Core System Modules

The overall system can therefore be organized into these modules:

1. **Customer Ordering**
2. **Menu Management**
3. **Table Management**
4. **Dining Sessions**
5. **Order Management**
6. **Waiter Management**
7. **Kitchen Management**
8. **Customer Management**
9. **Payment Management**
10. **Takeaway Management**
11. **Delivery Management**
12. **Expense Management**
13. **Financial Management**
14. **Reports & Analytics**
15. **Employee/User Management**
16. **Notifications**
17. **Feedback & Reviews**
18. **Restaurant Settings**
19. **Role & Permission Management**

---

# 26. Important Design Principle

The most important architectural idea is to **separate the customer experience from the staff management system**.

The customer should see something extremely simple:

> **Scan → Browse → Order → Pay → Track**

While staff see:

> **Orders → Tables → Kitchen → Customers → Payments → Operations**

And the owner sees:

> **Sales → Expenses → Reports → Business Performance**

That separation keeps the customer interface fast and simple while still giving the restaurant powerful management tools.

---

# 27. Future Expansion

The system should be designed so additional features can be added later without rebuilding the core.

Potential future features include:

* Multiple restaurant branches
* Advanced inventory
* Supplier management
* Recipe/ingredient costing
* Staff attendance
* Payroll
* Loyalty programs
* Customer accounts
* Promotions and coupons
* Online reservations
* Delivery-driver management
* Advanced analytics
* Accounting integrations
* Multiple languages
* Multiple currencies
* Custom restaurant branding
* Mobile applications

**This gives you a solid system-level blueprint while keeping the actual first build focused on the core restaurant workflow.**
