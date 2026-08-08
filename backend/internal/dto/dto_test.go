package dto_test

import (
	"testing"

	"yadotena/internal/dto"
	"yadotena/internal/models"
)

func TestRoleRoundTrip(t *testing.T) {
	if dto.RoleAPI(models.RoleChef) != "KITCHEN" {
		t.Fatal()
	}
	r, err := dto.ParseRoleAPI("KITCHEN")
	if err != nil || r != models.RoleChef {
		t.Fatal(err, r)
	}
}

func TestOrderStatusMap(t *testing.T) {
	if dto.OrderStatusAPI(models.OrderPlaced) != "PENDING" {
		t.Fatal()
	}
	if dto.OrderStatusAPI(models.OrderConfirmed) != "CONFIRMED" {
		t.Fatal()
	}
	s, err := dto.ParseOrderStatusAPI("SERVED")
	if err != nil || s != models.OrderServed {
		t.Fatal()
	}
}

func TestPaymentStatusAPI(t *testing.T) {
	if dto.PaymentStatusAPI(models.PayUnpaid) != "PENDING" {
		t.Fatal()
	}
	if dto.PaymentStatusAPI(models.PayPendingVerification) != "PENDING_VERIFICATION" {
		t.Fatal()
	}
	if dto.PaymentStatusAPI(models.PayRejected) != "REJECTED" {
		t.Fatal()
	}
	if dto.PaymentStatusAPI(models.PayPaid) != "PAID" {
		t.Fatal()
	}
}

func TestOrderTypeTakeaway(t *testing.T) {
	if dto.OrderTypeAPI(models.OrderPickup) != "TAKEAWAY" {
		t.Fatal()
	}
	ot, err := dto.ParseOrderTypeAPI("TAKEAWAY")
	if err != nil || ot != models.OrderPickup {
		t.Fatal()
	}
}
