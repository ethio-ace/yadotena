package orders

import (
	"testing"

	"yadotena/internal/models"
)

func TestKitchenVisible(t *testing.T) {
	if KitchenVisible(models.OrderPickup, models.PayUnpaid, models.OrderPlaced) {
		t.Fatal("pickup unpaid should hide from kitchen")
	}
	if !KitchenVisible(models.OrderPickup, models.PayPaid, models.OrderPlaced) {
		t.Fatal("pickup paid should show")
	}
	if !KitchenVisible(models.OrderDineIn, models.PayUnpaid, models.OrderPlaced) {
		t.Fatal("dine-in unpaid should show")
	}
	if KitchenVisible(models.OrderDelivery, models.PayPendingVerification, models.OrderPlaced) {
		t.Fatal("delivery pending should hide")
	}
}

func TestCanCompleteDineIn(t *testing.T) {
	if CanCompleteDineIn(models.OrderDineIn, models.PayUnpaid) {
		t.Fatal("cannot complete unpaid dine-in")
	}
	if !CanCompleteDineIn(models.OrderDineIn, models.PayPaid) {
		t.Fatal("paid dine-in completable")
	}
	if !CanCompleteDineIn(models.OrderPickup, models.PayUnpaid) {
		t.Fatal("pickup complete not gated by this helper the same way")
	}
}

func TestInitialPaymentStatus(t *testing.T) {
	if got := InitialPaymentStatus(models.OrderDineIn, models.PayCash, false); got != models.PayUnpaid {
		t.Fatalf("got %s", got)
	}
	if got := InitialPaymentStatus(models.OrderPickup, models.PayDigital, false); got != models.PayPendingVerification {
		t.Fatalf("got %s", got)
	}
	if got := InitialPaymentStatus(models.OrderDelivery, models.PayCash, true); got != models.PayPaid {
		t.Fatalf("got %s", got)
	}
}

func TestChefFromConfirmed(t *testing.T) {
	if !CanChefTransition(models.OrderConfirmed, models.OrderPreparing) {
		t.Fatal()
	}
	if !CanChefTransition(models.OrderPlaced, models.OrderPreparing) {
		t.Fatal()
	}
	if CanChefTransition(models.OrderReady, models.OrderServed) {
		t.Fatal("chef cannot serve")
	}
}

func TestFloorConfirmAndServe(t *testing.T) {
	if !CanFloorTransition(models.OrderPlaced, models.OrderConfirmed) {
		t.Fatal()
	}
	if !CanFloorTransition(models.OrderReady, models.OrderServed) {
		t.Fatal()
	}
	if !CanFloorTransition(models.OrderServed, models.OrderCompleted) {
		t.Fatal()
	}
	if CanFloorTransition(models.OrderPreparing, models.OrderServed) {
		t.Fatal("skip ready")
	}
}
