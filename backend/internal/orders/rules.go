package orders

import "yadotena/internal/models"

// KitchenVisible returns whether chef queue should show this order.
func KitchenVisible(orderType models.OrderType, payment models.PaymentStatus, orderStatus models.OrderStatus) bool {
	if orderStatus == models.OrderCancelled || orderStatus == models.OrderCompleted {
		return false
	}
	switch orderType {
	case models.OrderPickup, models.OrderDelivery:
		return payment == models.PayPaid
	default:
		return true // dine_in
	}
}

// CanCompleteDineIn requires paid payment (or already cancelled handled elsewhere).
func CanCompleteDineIn(orderType models.OrderType, payment models.PaymentStatus) bool {
	if orderType != models.OrderDineIn {
		return true
	}
	return payment == models.PayPaid
}

// InitialPaymentStatus for a newly placed order.
func InitialPaymentStatus(orderType models.OrderType, method models.PaymentMethod, markCashPaid bool) models.PaymentStatus {
	switch orderType {
	case models.OrderDineIn:
		if method == models.PayCash && markCashPaid {
			return models.PayPaid
		}
		if method == models.PayDigital {
			return models.PayPendingVerification
		}
		return models.PayUnpaid
	default: // pickup / delivery — pay first
		if method == models.PayCash && markCashPaid {
			return models.PayPaid
		}
		if method == models.PayDigital {
			return models.PayPendingVerification
		}
		// cash not yet settled at counter for pickup/delivery
		return models.PayPendingVerification
	}
}

// CanChefTransition checks chef may move order_status.
func CanChefTransition(from, to models.OrderStatus) bool {
	switch from {
	case models.OrderPlaced, models.OrderConfirmed:
		return to == models.OrderPreparing || to == models.OrderCancelled
	case models.OrderPreparing:
		return to == models.OrderReady || to == models.OrderCancelled
	default:
		return false
	}
}

// CanFloorTransition waiter/manager floor advances.
func CanFloorTransition(from, to models.OrderStatus) bool {
	switch {
	case from == models.OrderPlaced && to == models.OrderConfirmed:
		return true
	case from == models.OrderReady && to == models.OrderServed:
		return true
	case from == models.OrderServed && to == models.OrderCompleted:
		return true
	case from == models.OrderReady && to == models.OrderCompleted:
		return true // allow skip served for takeaway/delivery handoff
	case to == models.OrderCancelled && from != models.OrderCompleted && from != models.OrderCancelled:
		return true
	case from == models.OrderPlaced && (to == models.OrderPreparing || to == models.OrderReady):
		return true
	case from == models.OrderConfirmed && (to == models.OrderPreparing || to == models.OrderReady):
		return true
	case from == models.OrderPreparing && to == models.OrderReady:
		return true
	default:
		return false
	}
}
