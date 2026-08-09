package models

import (
	"time"

	"github.com/google/uuid"
)

type Role string

const (
	RoleOwner   Role = "owner"
	RoleManager Role = "manager"
	RoleWaiter  Role = "waiter"
	RoleChef    Role = "chef"
)

type OrderType string

const (
	OrderDineIn       OrderType = "dine_in"
	OrderPickup       OrderType = "pickup"
	OrderDelivery     OrderType = "delivery"
	OrderShopPickup   OrderType = "shop_pickup"
	OrderShopDelivery OrderType = "shop_delivery"
)

type OrderStatus string

const (
	OrderPlaced     OrderStatus = "placed"
	OrderConfirmed  OrderStatus = "confirmed"
	OrderPreparing  OrderStatus = "preparing"
	OrderReady      OrderStatus = "ready"
	OrderServed     OrderStatus = "served"
	OrderCompleted  OrderStatus = "completed"
	OrderCancelled  OrderStatus = "cancelled"
)

type PaymentStatus string

const (
	PayUnpaid              PaymentStatus = "unpaid"
	PayPendingVerification PaymentStatus = "pending_verification"
	PayPaid                PaymentStatus = "paid"
	PayRejected            PaymentStatus = "rejected"
)

type PaymentMethod string

const (
	PayCash    PaymentMethod = "cash"
	PayDigital PaymentMethod = "digital"
)

type Staff struct {
	ID        uuid.UUID `json:"id"`
	Phone     string    `json:"phone"`
	Name      string    `json:"name"`
	Email     *string   `json:"email,omitempty"`
	Notes     *string   `json:"notes,omitempty"`
	Role      Role      `json:"role"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

type Category struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	SortOrder int       `json:"sort_order"`
	IsActive  bool      `json:"is_active"`
}

type ProductCategory struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	SortOrder int       `json:"sort_order"`
	IsActive  bool      `json:"is_active"`
}

type Product struct {
	ID          uuid.UUID `json:"id"`
	CategoryID  uuid.UUID `json:"category_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	PriceETB    float64   `json:"price_etb"`
	ImageURL    *string   `json:"image_url,omitempty"`
	IsAvailable bool      `json:"is_available"`
	SortOrder   int       `json:"sort_order"`
}

type MenuItem struct {
	ID                     uuid.UUID `json:"id"`
	CategoryID             uuid.UUID `json:"category_id"`
	Name                   string    `json:"name"`
	Description            string    `json:"description"`
	PriceETB               float64   `json:"price_etb"`
	ImageURL               *string   `json:"image_url,omitempty"`
	IsAvailable            bool      `json:"is_available"`
	SortOrder              int       `json:"sort_order"`
	PreparationTimeMinutes int       `json:"preparation_time_minutes"`
}

type CafeTable struct {
	ID               uuid.UUID  `json:"id"`
	Label            string     `json:"label"`
	Seats            int        `json:"seats"`
	AssignedWaiterID *uuid.UUID `json:"assigned_waiter_id,omitempty"`
	IsActive         bool       `json:"is_active"`
	QRPath           string     `json:"qr_path,omitempty"`
	InUse            bool       `json:"in_use,omitempty"`
}

type Settings struct {
	CafeName             string   `json:"cafe_name"`
	CafePhone            string   `json:"cafe_phone"`
	CafeAddress          string   `json:"cafe_address"`
	AcceptingOrders      bool     `json:"accepting_orders"`
	CashEnabled          bool     `json:"cash_enabled"`
	DigitalEnabled       bool     `json:"digital_enabled"`
	DigitalMethods       []string `json:"digital_methods"`
	PublicBaseURL        string   `json:"public_base_url"`
	ServiceChargePercent float64  `json:"service_charge_percent"`
}

type OrderItem struct {
	ID           uuid.UUID  `json:"id"`
	MenuItemID   *uuid.UUID `json:"menu_item_id,omitempty"`
	ProductID    *uuid.UUID `json:"product_id,omitempty"`
	NameSnapshot string     `json:"name_snapshot"`
	UnitPriceETB float64    `json:"unit_price_etb"`
	Qty          int        `json:"qty"`
	Note         string     `json:"note"`
}

type Payment struct {
	ID            uuid.UUID      `json:"id"`
	OrderID       uuid.UUID      `json:"order_id"`
	Method        PaymentMethod  `json:"method"`
	DigitalMethod *string        `json:"digital_method,omitempty"`
	Reference     *string        `json:"reference,omitempty"`
	VerifiedBy    *uuid.UUID     `json:"verified_by,omitempty"`
	VerifiedAt    *time.Time     `json:"verified_at,omitempty"`
}

type Order struct {
	ID               uuid.UUID     `json:"id"`
	OrderNumber      int           `json:"order_number"`
	OrderType        OrderType     `json:"order_type"`
	OrderStatus      OrderStatus   `json:"order_status"`
	PaymentStatus    PaymentStatus `json:"payment_status"`
	CustomerName     string        `json:"customer_name"`
	CustomerPhone    string        `json:"customer_phone"`
	DeliveryAddress  *string       `json:"delivery_address,omitempty"`
	TableID          *uuid.UUID    `json:"table_id,omitempty"`
	TableLabel       *string       `json:"table_label,omitempty"`
	Notes            string        `json:"notes"`
	SubtotalETB      float64       `json:"subtotal_etb"`
	TaxETB           float64       `json:"tax_etb"`
	ServiceChargeETB float64       `json:"service_charge_etb"`
	DeliveryFeeETB   float64       `json:"delivery_fee_etb"`
	TotalETB         float64       `json:"total_etb"`
	TakenBy          *uuid.UUID    `json:"taken_by,omitempty"`
	CancelReason     *string       `json:"cancel_reason,omitempty"`
	Items            []OrderItem   `json:"items,omitempty"`
	Payment          *Payment      `json:"payment,omitempty"`
	CreatedAt        time.Time     `json:"created_at"`
	UpdatedAt        time.Time     `json:"updated_at"`
	KitchenVisible   bool          `json:"kitchen_visible"`
}

type ServiceRequest struct {
	ID         uuid.UUID  `json:"id"`
	TableID    uuid.UUID  `json:"table_id"`
	TableName  string     `json:"table_name"`
	Type       string     `json:"type"`
	Status     string     `json:"status"`
	Notes      string     `json:"notes"`
	CreatedAt  time.Time  `json:"created_at"`
	ResolvedAt *time.Time `json:"resolved_at,omitempty"`
	ResolvedBy *uuid.UUID `json:"resolved_by,omitempty"`
}

type Review struct {
	ID           uuid.UUID  `json:"id"`
	OrderID      *uuid.UUID `json:"order_id,omitempty"`
	CustomerName string     `json:"customer_name"`
	Rating       int        `json:"rating"`
	Comment      string     `json:"comment"`
	CreatedAt    time.Time  `json:"created_at"`
}

type Expense struct {
	ID            uuid.UUID  `json:"id"`
	Amount        float64    `json:"amount"`
	Category      string     `json:"category"`
	Description   string     `json:"description"`
	ExpenseDate   time.Time  `json:"expense_date"`
	PaymentMethod string     `json:"payment_method"`
	RecordedBy    uuid.UUID  `json:"recorded_by"`
	RecordedName  string     `json:"recorded_by_name,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	DeletedAt     *time.Time `json:"deleted_at,omitempty"`
}

type ActivityLog struct {
	ID         uuid.UUID      `json:"id"`
	ActorID    *uuid.UUID     `json:"actor_id,omitempty"`
	ActorName  *string        `json:"actor_name,omitempty"`
	Action     string         `json:"action"`
	EntityType string         `json:"entity_type"`
	EntityID   *string        `json:"entity_id,omitempty"`
	Metadata   map[string]any `json:"metadata"`
	CreatedAt  time.Time      `json:"created_at"`
}
