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
	if KitchenVisible(models.OrderShopPickup, models.PayPaid, models.OrderPlaced) {
		t.Fatal("shop never kitchen visible")
	}
	if KitchenVisible(models.OrderShopDelivery, models.PayPaid, models.OrderPlaced) {
		t.Fatal("shop delivery never kitchen visible")
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
	if got := InitialPaymentStatus(models.OrderShopPickup, models.PayCash, false); got != models.PayPendingVerification {
		t.Fatalf("shop cash pending got %s", got)
	}
	if got := InitialPaymentStatus(models.OrderShopDelivery, models.PayDigital, false); got != models.PayPendingVerification {
		t.Fatalf("shop digital pending got %s", got)
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

func TestFloorCannotLeaveTerminal(t *testing.T) {
	if CanFloorTransition(models.OrderCancelled, models.OrderCompleted) {
		t.Fatal("cancelled cannot complete")
	}
	if CanFloorTransition(models.OrderCompleted, models.OrderPreparing) {
		t.Fatal("completed is terminal")
	}
}

func TestShopNeverKitchenEvenWhenPaid(t *testing.T) {
	st := InitialPaymentStatus(models.OrderShopPickup, models.PayCash, true)
	if st != models.PayPaid {
		t.Fatalf("expected paid got %s", st)
	}
	if KitchenVisible(models.OrderShopPickup, st, models.OrderPlaced) {
		t.Fatal("shop must stay out of kitchen")
	}
}

func TestValidateLineRefs(t *testing.T) {
	if err := ValidateLineRefs(false, true, false); err != nil {
		t.Fatalf("menu+menuItem ok: %v", err)
	}
	if err := ValidateLineRefs(true, false, true); err != nil {
		t.Fatalf("shop+product ok: %v", err)
	}
	if err := ValidateLineRefs(false, true, true); err == nil {
		t.Fatal("both ids should fail")
	}
	if err := ValidateLineRefs(false, false, false); err == nil {
		t.Fatal("neither id should fail")
	}
	if err := ValidateLineRefs(true, true, false); err == nil {
		t.Fatal("shop with menuItem should fail")
	}
	if err := ValidateLineRefs(false, false, true); err == nil {
		t.Fatal("cafe order with product should fail")
	}
}

func TestIsShopOrder(t *testing.T) {
	if !IsShopOrder(models.OrderShopPickup) || !IsShopOrder(models.OrderShopDelivery) {
		t.Fatal("shop types")
	}
	if IsShopOrder(models.OrderDineIn) || IsShopOrder(models.OrderPickup) {
		t.Fatal("non-shop")
	}
}
