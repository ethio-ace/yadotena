package orders

import (
	"testing"

	"yadotena/internal/models"
)

func TestDeriveTableStatus(t *testing.T) {
	if DeriveTableStatus(models.OrderPlaced, models.PayUnpaid, false) != "AVAILABLE" {
		t.Fatal("no open")
	}
	if DeriveTableStatus(models.OrderServed, models.PayUnpaid, true) != "WAITING_FOR_PAYMENT" {
		t.Fatal("served unpaid")
	}
	if DeriveTableStatus(models.OrderReady, models.PayPaid, true) != "WAITING_FOR_SERVICE" {
		t.Fatal("ready")
	}
	if DeriveTableStatus(models.OrderPreparing, models.PayUnpaid, true) != "PREPARING" {
		t.Fatal("preparing")
	}
	if DeriveTableStatus(models.OrderConfirmed, models.PayUnpaid, true) != "ORDERING" {
		t.Fatal("confirmed")
	}
}
