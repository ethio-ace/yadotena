package customers

const (
	TypeVIP        = "VIP"
	TypeRegular    = "REGULAR"
	TypeOccasional = "OCCASIONAL"
)

func Classify(totalOrders int, totalSpent float64) string {
	if totalOrders >= 20 || totalSpent >= 5000 {
		return TypeVIP
	}
	if totalOrders <= 5 {
		return TypeOccasional
	}
	return TypeRegular
}
