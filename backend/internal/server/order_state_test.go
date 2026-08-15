package server

import (
	"fmt"
	"strings"
	"testing"
)

// ValidateOrderTransition tests state progression invariants in Go logic
func ValidateOrderTransition(oldStatus, newStatus, currentPaymentStatus string) error {
	oldStatus = strings.ToUpper(oldStatus)
	newStatus = strings.ToUpper(newStatus)
	currentPaymentStatus = strings.ToUpper(currentPaymentStatus)

	if oldStatus != newStatus {
		validTransitions := map[string][]string{
			"DRAFT":     {"PENDING", "CANCELLED"},
			"PENDING":   {"PREPARING", "CANCELLED"},
			"PREPARING": {"READY", "CANCELLED"},
			"READY":     {"SERVED", "CANCELLED"},
			"SERVED":    {"COMPLETED", "CANCELLED"},
			"COMPLETED": {}, // Terminal state
			"CANCELLED": {}, // Terminal state
		}

		allowed, exists := validTransitions[oldStatus]
		if !exists {
			allowed = []string{"PENDING", "PREPARING", "READY", "SERVED", "COMPLETED", "CANCELLED"}
		}

		isAllowed := false
		for _, target := range allowed {
			if target == newStatus {
				isAllowed = true
				break
			}
		}

		if !isAllowed && oldStatus != "" {
			return fmt.Errorf("Invalid order status transition from %s to %s", oldStatus, newStatus)
		}
	}

	// Strict State Invariant: An order cannot transition to COMPLETED unless payment_status is PAID
	if newStatus == "COMPLETED" && currentPaymentStatus != "PAID" {
		return fmt.Errorf("Cannot set order status to COMPLETED when payment is UNPAID. Settle payment first.")
	}

	return nil
}

func TestOrderStateTransitions(t *testing.T) {
	tests := []struct {
		name          string
		oldStatus     string
		newStatus     string
		paymentStatus string
		expectErr     bool
	}{
		{"Valid DRAFT to PENDING", "DRAFT", "PENDING", "UNPAID", false},
		{"Valid PENDING to PREPARING", "PENDING", "PREPARING", "UNPAID", false},
		{"Valid PREPARING to READY", "PREPARING", "READY", "UNPAID", false},
		{"Valid READY to SERVED", "READY", "SERVED", "UNPAID", false},
		{"Invalid SERVED to COMPLETED when UNPAID", "SERVED", "COMPLETED", "UNPAID", true},
		{"Valid SERVED to COMPLETED when PAID", "SERVED", "COMPLETED", "PAID", false},
		{"Invalid DRAFT to READY leap", "DRAFT", "READY", "UNPAID", true},
		{"Invalid COMPLETED to PREPARING backwards", "COMPLETED", "PREPARING", "PAID", true},
		{"Valid PENDING to CANCELLED", "PENDING", "CANCELLED", "UNPAID", false},
		{"Invalid CANCELLED to READY after cancellation", "CANCELLED", "READY", "UNPAID", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateOrderTransition(tt.oldStatus, tt.newStatus, tt.paymentStatus)
			if tt.expectErr && err == nil {
				t.Errorf("Expected error for transition %s -> %s (payment: %s), got nil", tt.oldStatus, tt.newStatus, tt.paymentStatus)
			}
			if !tt.expectErr && err != nil {
				t.Errorf("Unexpected error for transition %s -> %s (payment: %s): %v", tt.oldStatus, tt.newStatus, tt.paymentStatus, err)
			}
		})
	}
}
