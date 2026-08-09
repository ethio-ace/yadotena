# Graph Report - backend  (2026-08-09)

## Corpus Check
- Corpus is ~15,911 words - fits in a single context window. You may not need a graph.

## Summary
- 189 nodes · 447 edges · 13 communities detected
- Extraction: 51% EXTRACTED · 49% INFERRED · 0% AMBIGUOUS · INFERRED: 220 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Server HTTP Core|Server HTTP Core]]
- [[_COMMUNITY_Menu Tables DTO|Menu Tables DTO]]
- [[_COMMUNITY_App Config Bootstrap|App Config Bootstrap]]
- [[_COMMUNITY_Order Status Mapping|Order Status Mapping]]
- [[_COMMUNITY_Domain Models|Domain Models]]
- [[_COMMUNITY_Auth JWT PIN|Auth JWT PIN]]
- [[_COMMUNITY_Kitchen Floor Rules|Kitchen Floor Rules]]
- [[_COMMUNITY_Order Handlers|Order Handlers]]
- [[_COMMUNITY_Realtime Hub|Realtime Hub]]
- [[_COMMUNITY_Redis Rate Reviews|Redis Rate Reviews]]
- [[_COMMUNITY_Activity Logger|Activity Logger]]
- [[_COMMUNITY_Expense Classify|Expense Classify]]
- [[_COMMUNITY_Customers Handler|Customers Handler]]

## God Nodes (most connected - your core abstractions)
1. `Server` - 55 edges
2. `writeErr()` - 49 edges
3. `writeJSON()` - 44 edges
4. `claimsFrom()` - 23 edges
5. `decodeJSON()` - 21 edges
6. `chiURLParam()` - 15 edges
7. `OrderAPI()` - 13 edges
8. `Hub` - 7 edges
9. `New()` - 6 edges
10. `main()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `Load()`  [INFERRED]
  cmd/api/main.go → internal/config/config.go
- `main()` --calls--> `Migrate()`  [INFERRED]
  cmd/api/main.go → internal/db/db.go
- `main()` --calls--> `Seed()`  [INFERRED]
  cmd/api/main.go → internal/db/db.go
- `main()` --calls--> `New()`  [INFERRED]
  cmd/api/main.go → internal/server/server.go
- `main()` --calls--> `Load()`  [INFERRED]
  cmd/seed/main.go → internal/config/config.go

## Communities

### Community 0 - "Server HTTP Core"
Cohesion: 0.18
Nodes (8): HashPIN(), ExpenseAPI(), chiURLParam(), claimsFrom(), Server, decodeJSON(), writeErr(), writeJSON()

### Community 1 - "Menu Tables DTO"
Cohesion: 0.12
Nodes (6): MenuItemAPI(), TableAPI(), DeriveTableStatus(), TestDeriveTableStatus(), validateImageURL(), simpleError

### Community 2 - "App Config Bootstrap"
Cohesion: 0.14
Nodes (14): main(), Config, firstEnv(), getenv(), Load(), Connect(), Migrate(), Seed() (+6 more)

### Community 3 - "Order Status Mapping"
Cohesion: 0.18
Nodes (15): OrderAPI(), OrderStatusAPI(), OrderTypeAPI(), ParseOrderStatusAPI(), ParseOrderTypeAPI(), ParseRoleAPI(), PaymentStatusAPI(), RoleAPI() (+7 more)

### Community 4 - "Domain Models"
Cohesion: 0.12
Nodes (15): ActivityLog, CafeTable, Category, Expense, MenuItem, Order, OrderItem, OrderType (+7 more)

### Community 5 - "Auth JWT PIN"
Cohesion: 0.18
Nodes (9): CheckPIN(), IssueToken(), ParseToken(), Claims, ctxKey, bearerOrCookie(), splitOrigins(), stringsSplitComma() (+1 more)

### Community 6 - "Kitchen Floor Rules"
Cohesion: 0.23
Nodes (10): CanChefTransition(), CanCompleteDineIn(), CanFloorTransition(), InitialPaymentStatus(), KitchenVisible(), TestCanCompleteDineIn(), TestChefFromConfirmed(), TestFloorConfirmAndServe() (+2 more)

### Community 7 - "Order Handlers"
Cohesion: 0.24
Nodes (6): OrderStatus, errMsg, itoa(), parsePatchOrderStatus(), placeBody, placeItem

### Community 8 - "Realtime Hub"
Cohesion: 0.2
Nodes (2): Hub, WriteSSE()

### Community 9 - "Redis Rate Reviews"
Cohesion: 0.29
Nodes (3): AllowRate(), ReviewAPI(), ServiceRequestAPI()

### Community 10 - "Activity Logger"
Cohesion: 0.67
Nodes (2): Logger, nullIfEmpty()

### Community 11 - "Expense Classify"
Cohesion: 0.5
Nodes (2): Classify(), TestClassify()

### Community 12 - "Customers Handler"
Cohesion: 1.0
Nodes (1): customerResponse

## Knowledge Gaps
- **20 isolated node(s):** `Config`, `PaymentStatus`, `PaymentMethod`, `Staff`, `Category` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Realtime Hub`** (10 nodes): `hub.go`, `.staffStream()`, `Hub`, `.BroadcastOrder()`, `.BroadcastStaff()`, `.SubscribeOrder()`, `.SubscribeStaff()`, `.UnsubscribeOrder()`, `.UnsubscribeStaff()`, `WriteSSE()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Activity Logger`** (4 nodes): `Logger`, `nullIfEmpty()`, `.Write()`, `logger.go`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Expense Classify`** (4 nodes): `Classify()`, `TestClassify()`, `classify.go`, `classify_test.go`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Customers Handler`** (2 nodes): `handlers_customers.go`, `customerResponse`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Server` connect `Server HTTP Core` to `Menu Tables DTO`, `Domain Models`, `Auth JWT PIN`, `Order Handlers`, `Realtime Hub`, `Redis Rate Reviews`?**
  _High betweenness centrality (0.324) - this node is a cross-community bridge._
- **Why does `writeErr()` connect `Server HTTP Core` to `Menu Tables DTO`, `Auth JWT PIN`, `Order Handlers`, `Realtime Hub`, `Redis Rate Reviews`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Why does `writeJSON()` connect `Server HTTP Core` to `Menu Tables DTO`, `Domain Models`, `Auth JWT PIN`, `Order Handlers`, `Redis Rate Reviews`?**
  _High betweenness centrality (0.137) - this node is a cross-community bridge._
- **Are the 47 inferred relationships involving `writeErr()` (e.g. with `.withAuth()` and `.requireRoles()`) actually correct?**
  _`writeErr()` has 47 INFERRED edges - model-reasoned connections that need verification._
- **Are the 42 inferred relationships involving `writeJSON()` (e.g. with `.Router()` and `.staffLogin()`) actually correct?**
  _`writeJSON()` has 42 INFERRED edges - model-reasoned connections that need verification._
- **Are the 21 inferred relationships involving `claimsFrom()` (e.g. with `.staffMe()` and `.staffPatchMe()`) actually correct?**
  _`claimsFrom()` has 21 INFERRED edges - model-reasoned connections that need verification._
- **Are the 20 inferred relationships involving `decodeJSON()` (e.g. with `.staffLogin()` and `.staffPatchMe()`) actually correct?**
  _`decodeJSON()` has 20 INFERRED edges - model-reasoned connections that need verification._