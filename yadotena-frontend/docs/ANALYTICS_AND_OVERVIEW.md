# Yadotena Analytics & Overview — Design Document

## Overview

The owner dashboard provides a comprehensive view of café operations, financial performance, and staff productivity. All data is derived from the existing order, payment, expense, and staff tables — no new backend APIs are required for the initial implementation.

---

## 1. Business Overview Page (`/dashboard/owner`)

### Purpose
Answer: "How is my business doing right now?"

### Layout
```
┌─────────────────────────────────────────────────────────┐
│  TODAY'S SNAPSHOT                                       │
│  Revenue   Orders   Avg Ticket   Active Tables          │
│  12,450    34       366 ETB      8/12                   │
├─────────────────────────────────────────────────────────┤
│  REVENUE TREND (7d / 30d / 90d / YTD toggle)           │
│  [line chart]                                           │
├─────────────────────────────────────────────────────────┤
│  TOP ITEMS        STAFF PERFORMANCE     PAYMENT MIX     │
│  1. Doro Wot      Tigist: 28 orders    Cash: 45%        │
│  2. Latte         Sara: 22 orders      CBE: 35%         │
│  3. Avocado Toast Abebe: 18 orders     Telebirr: 20%    │
├─────────────────────────────────────────────────────────┤
│  RECENT ORDERS (live feed)                              │
│  #84K2M1  Table 04  685 ETB  12 min ago                 │
│  #A7F3C2  Takeaway  420 ETB  8 min ago                  │
└─────────────────────────────────────────────────────────┘
```

### KPI Cards (Top Row)

| Metric | Calculation | Time Frame |
|--------|------------|------------|
| **Revenue** | SUM(orders.total) WHERE paymentStatus=PAID | Today / 7d / 30d / Custom |
| **Orders** | COUNT(orders) WHERE status≠CANCELLED | Today / 7d / 30d / Custom |
| **Avg Ticket** | Revenue / Orders | Same as above |
| **Active Tables** | Tables with active orders / Total tables | Real-time |
| **Unpaid Bills** | COUNT(orders) WHERE paymentStatus≠PAID | Real-time |
| **Pending Alerts** | COUNT(serviceRequests) WHERE status=PENDING | Real-time |

### Revenue Trend Chart
- **Type**: Line chart with area fill
- **Data points**: Daily revenue for selected period
- **Toggles**: 7 days / 30 days / 90 days / Year-to-date
- **Comparison**: Optional overlay of previous period (last 7d vs prior 7d)
- **Hover**: Shows exact revenue and order count for that day

### Top Items Table
- **Sorted by**: Total quantity sold in selected period
- **Columns**: Rank, Item Name, Category, Quantity Sold, Revenue Generated
- **Filter**: By category (All / Food / Drinks / Coffee / Bakery)
- **Click**: Navigates to item detail page with full history

### Staff Performance
- **Sorted by**: Orders handled in selected period
- **Columns**: Staff Name, Role, Orders Handled, Revenue Generated, Avg Order Value
- **Filter**: By role (All / Waiters / Chefs / Managers)
- **Click**: Navigates to staff detail page

### Payment Mix
- **Type**: Donut chart
- **Segments**: By payment method (Cash, CBE Birr, Telebirr, Bank Transfer, Other)
- **Shows**: Percentage and absolute amount per method
- **Toggle**: Today / 7d / 30d

---

## 2. Analytics Hub (`/dashboard/reports`)

### Purpose
Answer: "What patterns exist in my business and where should I focus?"

### Tabs

#### A. Revenue Analytics

**Daily Revenue Heatmap**
- Calendar grid showing revenue intensity per day
- Color coding: Low (light) → High (dark)
- Click any day to see that day's breakdown

**Revenue by Hour**
- Bar chart showing revenue distribution across hours (6AM–11PM)
- Identifies peak hours and slow periods
- Useful for staffing decisions

**Revenue by Category**
- Stacked bar chart or treemap
- Shows which categories (Food, Drinks, Coffee, Bakery, Dessert) contribute most
- Trend over time (are desserts growing?)

**Revenue by Order Type**
- Comparison: Dine-in vs Takeaway vs Delivery
- Shows which channel is most profitable
- Trend over time

**Average Order Value Trend**
- Line chart showing AOV over time
- Compare by order type
- Identify if upselling strategies are working

#### B. Menu Analytics

**Item Performance Matrix**
```
                    HIGH REVENUE
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
    │  STARS             │  WORKHORSES        │
    │  High revenue      │  High revenue      │
    │  High margin       │  Low margin        │
    │  → Promote more    │  → Optimize cost   │
HIGH│                    │                    │LOW
MARGIN├────────────────────┼────────────────────┤MARGIN
    │                    │                    │
    │  PUZZLES           │  DOGS              │
    │  Low revenue       │  Low revenue       │
    │  High margin       │  Low margin        │
    │  → Market better   │  → Consider remove │
    │                    │                    │
    └────────────────────┼────────────────────┘
                         │
                    LOW REVENUE
```

**Item Velocity Report**
- Items ranked by: Orders per day, Revenue per day, Margin per day
- Trend: Is this item growing or declining?
- Seasonality: Does this item sell more on weekends?

**Addon Attachment Rate**
- Which add-ons are most frequently ordered with which items
- Revenue from add-ons alone
- Opportunities for bundle suggestions

**Category Mix Over Time**
- How the proportion of food vs drinks vs coffee changes
- Weekly and monthly trends

#### C. Operations Analytics

**Table Turnover Rate**
- Average time a table is occupied before payment
- Peak turnover vs off-peak
- Comparison across tables (which tables are most efficient?)

**Order Completion Time**
- Time from order creation to kitchen ready
- Broken down by: Item complexity, Round number, Time of day
- Target: <15 minutes for most items

**Kitchen Throughput**
- Orders completed per hour
- Peak capacity vs actual demand
- Identifies bottlenecks

**Service Request Frequency**
- How often customers call waiters
- How often bill is requested
- Average response time

#### D. Financial Analytics

**Daily P&L Summary**
```
Revenue          12,450 ETB
─────────────────────────
Cost of Goods    (estimated from menu prices)
Staff Costs      (from expense ledger)
Other Expenses   (from expense ledger)
─────────────────────────
Gross Profit     (Revenue - COGS)
Net Profit       (Revenue - All Expenses)
```

**Expense Breakdown**
- Pie chart of expenses by category
- Trend over time
- Comparison to revenue

**Payment Reconciliation**
- Total collected vs total owed
- Aging: How long bills remain unpaid
- Method breakdown with transaction references

**Cash Flow**
- Daily cash in vs cash out
- Running balance
- Outstanding payments

---

## 3. Time Frame Controls

### Quick Selectors
- **Today**: Current day (midnight to now)
- **Yesterday**: Previous full day
- **This Week**: Monday to today
- **Last Week**: Full previous week
- **This Month**: 1st to today
- **Last Month**: Full previous month
- **This Year**: Jan 1 to today

### Custom Range
- Date picker with start/end
- Minimum: 1 day
- Maximum: 365 days

### Granularity
- **Daily**: One data point per day
- **Weekly**: One data point per week
- **Monthly**: One data point per month
- **Hourly**: (for today only) One data point per hour

---

## 4. Comparison Features

### Period-over-Period
- Compare current period to previous period of same length
- Example: This week vs Last week, This month vs Last month
- Show: Revenue change (%), Order change (%), Avg ticket change (%)

### Year-over-Year
- Compare same period last year (when data available)
- Example: August 2026 vs August 2025

### Staff vs Staff
- Compare two staff members' performance
- Metrics: Orders handled, Revenue, Avg ticket, Customer satisfaction (if tracked)

### Item vs Item
- Compare two menu items' performance
- Metrics: Revenue, Quantity, Margin, Trend

---

## 5. Data Points Available

### From Orders Table
- `id`, `type` (DINE_IN, TAKEAWAY, DELIVERY)
- `status` (PENDING, PREPARING, READY, SERVED, COMPLETED, CANCELLED)
- `paymentStatus` (PENDING, PAID)
- `total`, `subtotal`, `tax`, `serviceCharge`
- `tableId`, `customerName`
- `createdAt`, `updatedAt`
- Items: `quantity`, `price`, `name`, `categoryId`, `status`
- Rounds: `roundNumber`

### From Payments Table
- `id`, `orderId`, `method`, `amount`, `transactionRef`
- `createdAt`

### From Expenses Table
- `id`, `category`, `amount`, `description`, `receiptUrl`
- `createdAt`

### From Service Requests Table
- `id`, `tableId`, `type` (WAITER, BILL), `status`, `notes`
- `createdAt`, `resolvedAt`

### From Staff Table
- `id`, `name`, `role`, `email`
- Linked to orders via `createdBy` or session

### From Menu Table
- `id`, `name`, `price`, `category`, `categoryId`, `available`
- `preparationTime`, `dietaryTags`

---

## 6. Charts & Visualizations

| Visualization | Library | Use Case |
|---------------|---------|----------|
| Line chart | Recharts/Chart.js | Revenue trend, AOV trend |
| Bar chart | Recharts/Chart.js | Revenue by hour, category comparison |
| Donut chart | Recharts/Chart.js | Payment mix, category mix |
| Heatmap | Custom grid | Daily revenue calendar |
| Table | HTML/CSS | Item performance, staff performance |
| KPI cards | Custom | Snapshot metrics |
| Sparklines | Recharts mini | Inline trend indicators |

---

## 7. Recommended Enhancements (Phase 2)

### Predictive Analytics
- Forecast tomorrow's revenue based on historical patterns
- Predict peak hours for staffing optimization
- Identify items likely to go out of stock

### Customer Insights
- Repeat customer detection (by table usage patterns)
- Average customer lifetime value
- Popular ordering times per customer segment

### Inventory Intelligence
- Ingredient usage tracking (if recipe mapping exists)
- Waste reduction insights
- Automatic reorder suggestions

### Competitive Benchmarking
- Compare performance to industry averages (if data available)
- Local market comparison (if multi-location)

### Alert System
- Revenue below threshold notification
- Unusual expense spike alert
- Staff performance drop alert
- Low stock alert

---

## 8. Implementation Priority

### Phase 1 (MVP)
1. ✅ Today's snapshot KPIs
2. ✅ Revenue trend chart (7d/30d)
3. ✅ Top items table
4. ✅ Staff performance summary
5. ✅ Payment mix chart
6. ✅ Recent orders feed

### Phase 2 (Core Analytics)
7. Revenue by hour chart
8. Revenue by category breakdown
9. Table turnover analysis
10. Order completion time tracking
11. Period-over-period comparison

### Phase 3 (Advanced)
12. Item performance matrix
13. Addon attachment analysis
14. Daily P&L summary
15. Cash flow tracking
16. Year-over-year comparison

### Phase 4 (Intelligence)
17. Predictive revenue forecasting
18. Staff scheduling optimization
19. Menu pricing recommendations
20. Customer behavior insights

---

## 9. Technical Notes

### Data Aggregation
- All aggregations should be done server-side via SQL queries
- Frontend receives pre-aggregated data, not raw orders
- Cache aggregations for 5 minutes to reduce DB load

### Real-time Updates
- KPI cards update every 30 seconds via polling or WebSocket
- Charts update on page load and period change
- Live order feed uses existing Ably connection

### Performance
- Lazy load charts below the fold
- Virtualize long lists (items, staff)
- Use React.memo for chart components
- Debounce period changes

### Export
- All tables should support CSV export
- Charts should support PNG export (via html2canvas or similar)
- PDF report generation for monthly summaries
