package customers_test

import (
	"testing"

	"yadotena/internal/customers"
)

func TestClassify(t *testing.T) {
	tests := []struct {
		name        string
		totalOrders int
		totalSpent  float64
		want        string
	}{
		{name: "VIP at order threshold", totalOrders: 20, want: "VIP"},
		{name: "VIP at spending threshold", totalOrders: 1, totalSpent: 5000, want: "VIP"},
		{name: "VIP takes precedence over occasional", totalOrders: 5, totalSpent: 5000, want: "VIP"},
		{name: "occasional at upper order boundary", totalOrders: 5, totalSpent: 10, want: "OCCASIONAL"},
		{name: "regular between thresholds", totalOrders: 10, totalSpent: 100, want: "REGULAR"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := customers.Classify(tt.totalOrders, tt.totalSpent); got != tt.want {
				t.Fatalf("Classify(%d, %.2f) = %q, want %q", tt.totalOrders, tt.totalSpent, got, tt.want)
			}
		})
	}
}
