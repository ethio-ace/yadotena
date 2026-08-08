package orders

import "yadotena/internal/models"

func DeriveTableStatus(orderStatus models.OrderStatus, payment models.PaymentStatus, hasOpen bool) string {
	switch {
	case !hasOpen:
		return "AVAILABLE"
	case orderStatus == models.OrderServed && payment != models.PayPaid:
		return "WAITING_FOR_PAYMENT"
	case orderStatus == models.OrderReady:
		return "WAITING_FOR_SERVICE"
	case orderStatus == models.OrderPreparing:
		return "PREPARING"
	case orderStatus == models.OrderPlaced || orderStatus == models.OrderConfirmed:
		return "ORDERING"
	default:
		return "OCCUPIED"
	}
}
