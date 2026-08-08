package dto

import (
	"fmt"
	"time"

	"github.com/google/uuid"

	"yadotena/internal/models"
)

func RoleAPI(role models.Role) string {
	switch role {
	case models.RoleOwner:
		return "OWNER"
	case models.RoleManager:
		return "MANAGER"
	case models.RoleWaiter:
		return "WAITER"
	case models.RoleChef:
		return "KITCHEN"
	default:
		return ""
	}
}

func ParseRoleAPI(role string) (models.Role, error) {
	switch role {
	case "OWNER":
		return models.RoleOwner, nil
	case "MANAGER":
		return models.RoleManager, nil
	case "WAITER":
		return models.RoleWaiter, nil
	case "KITCHEN":
		return models.RoleChef, nil
	default:
		return "", fmt.Errorf("unknown API role %q", role)
	}
}

func OrderStatusAPI(status models.OrderStatus) string {
	switch status {
	case models.OrderPlaced:
		return "PENDING"
	case models.OrderConfirmed:
		return "CONFIRMED"
	case models.OrderPreparing:
		return "PREPARING"
	case models.OrderReady:
		return "READY"
	case models.OrderServed:
		return "SERVED"
	case models.OrderCompleted:
		return "COMPLETED"
	case models.OrderCancelled:
		return "CANCELLED"
	default:
		return ""
	}
}

func ParseOrderStatusAPI(status string) (models.OrderStatus, error) {
	switch status {
	case "PENDING":
		return models.OrderPlaced, nil
	case "CONFIRMED":
		return models.OrderConfirmed, nil
	case "PREPARING":
		return models.OrderPreparing, nil
	case "READY":
		return models.OrderReady, nil
	case "SERVED":
		return models.OrderServed, nil
	case "COMPLETED":
		return models.OrderCompleted, nil
	case "CANCELLED":
		return models.OrderCancelled, nil
	default:
		return "", fmt.Errorf("unknown API order status %q", status)
	}
}

func OrderTypeAPI(orderType models.OrderType) string {
	switch orderType {
	case models.OrderDineIn:
		return "DINE_IN"
	case models.OrderPickup:
		return "TAKEAWAY"
	case models.OrderDelivery:
		return "DELIVERY"
	default:
		return ""
	}
}

func ParseOrderTypeAPI(orderType string) (models.OrderType, error) {
	switch orderType {
	case "DINE_IN":
		return models.OrderDineIn, nil
	case "TAKEAWAY":
		return models.OrderPickup, nil
	case "DELIVERY":
		return models.OrderDelivery, nil
	default:
		return "", fmt.Errorf("unknown API order type %q", orderType)
	}
}

func PaymentStatusAPI(status models.PaymentStatus) string {
	switch status {
	case models.PayPaid:
		return "PAID"
	case models.PayPendingVerification:
		return "PENDING_VERIFICATION"
	case models.PayRejected:
		return "REJECTED"
	default:
		return "PENDING"
	}
}

func StaffUser(staff models.Staff) map[string]any {
	email := ""
	if staff.Email != nil {
		email = *staff.Email
	}

	status := "INACTIVE"
	if staff.IsActive {
		status = "ACTIVE"
	}

	return map[string]any{
		"id":     staff.ID.String(),
		"name":   staff.Name,
		"email":  email,
		"phone":  staff.Phone,
		"role":   RoleAPI(staff.Role),
		"status": status,
	}
}

func ServiceRequestAPI(req models.ServiceRequest) map[string]any {
	out := map[string]any{
		"id":        req.ID.String(),
		"tableId":   req.TableID.String(),
		"tableName": req.TableName,
		"type":      req.Type,
		"status":    req.Status,
		"createdAt": req.CreatedAt.Format(time.RFC3339Nano),
	}
	if req.Notes != "" {
		out["notes"] = req.Notes
	}
	return out
}

func ReviewAPI(rev models.Review) map[string]any {
	return map[string]any{
		"id":           rev.ID.String(),
		"customerName": rev.CustomerName,
		"rating":       rev.Rating,
		"comment":      rev.Comment,
		"date":         rev.CreatedAt.Format(time.RFC3339Nano),
	}
}

func MenuItemAPI(item models.MenuItem, categoryName string) map[string]any {
	image := ""
	if item.ImageURL != nil {
		image = *item.ImageURL
	}

	return map[string]any{
		"id":              item.ID.String(),
		"name":            item.Name,
		"description":     item.Description,
		"price":           item.PriceETB,
		"category":        categoryName,
		"image":           image,
		"available":       item.IsAvailable,
		"preparationTime": item.PreparationTimeMinutes,
	}
}

func OrderAPI(order *models.Order) map[string]any {
	if order == nil {
		return nil
	}

	items := make([]map[string]any, 0, len(order.Items))
	for _, item := range order.Items {
		menuItemID := ""
		if item.MenuItemID != nil {
			menuItemID = item.MenuItemID.String()
		}
		items = append(items, map[string]any{
			"id":                  item.ID.String(),
			"menuItemId":          menuItemID,
			"name":                item.NameSnapshot,
			"price":               item.UnitPriceETB,
			"quantity":            item.Qty,
			"specialInstructions": item.Note,
		})
	}

	tableID := ""
	if order.TableID != nil {
		tableID = order.TableID.String()
	}
	deliveryAddress := ""
	if order.DeliveryAddress != nil {
		deliveryAddress = *order.DeliveryAddress
	}

	out := map[string]any{
		"id":              order.ID.String(),
		"type":            OrderTypeAPI(order.OrderType),
		"status":          OrderStatusAPI(order.OrderStatus),
		"paymentStatus":   PaymentStatusAPI(order.PaymentStatus),
		"items":           items,
		"subtotal":        order.SubtotalETB,
		"tax":             order.TaxETB,
		"serviceCharge":   order.ServiceChargeETB,
		"deliveryFee":     order.DeliveryFeeETB,
		"total":           order.TotalETB,
		"createdAt":       order.CreatedAt.Format(time.RFC3339Nano),
		"updatedAt":       order.UpdatedAt.Format(time.RFC3339Nano),
		"tableId":         tableID,
		"customerName":    order.CustomerName,
		"customerPhone":   order.CustomerPhone,
		"deliveryAddress": deliveryAddress,
	}
	if order.TableLabel != nil && *order.TableLabel != "" {
		out["tableName"] = *order.TableLabel
	}
	return out
}

func TableAPI(id, name string, capacity int, status string, currentOrderID *uuid.UUID) map[string]any {
	table := map[string]any{
		"id":       id,
		"name":     name,
		"capacity": capacity,
		"status":   status,
	}
	if currentOrderID != nil {
		table["currentOrderId"] = currentOrderID.String()
	}
	return table
}

func ExpenseAPI(expense models.Expense) map[string]any {
	return map[string]any{
		"id":            expense.ID.String(),
		"amount":        expense.Amount,
		"category":      expense.Category,
		"description":   expense.Description,
		"date":          expense.ExpenseDate.Format("2006-01-02"),
		"paymentMethod": expense.PaymentMethod,
		"recordedBy":    expense.RecordedBy.String(),
	}
}
