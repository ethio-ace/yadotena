package orders

import "fmt"

// ValidateLineRefs ensures each order line is menu XOR product and matches channel.
func ValidateLineRefs(isShop, hasMenu, hasProduct bool) error {
	if hasMenu == hasProduct {
		return fmt.Errorf("each item needs exactly one of menuItemId or productId")
	}
	if isShop && !hasProduct {
		return fmt.Errorf("shop orders require productId on items")
	}
	if !isShop && !hasMenu {
		return fmt.Errorf("menu orders require menuItemId on items")
	}
	return nil
}
