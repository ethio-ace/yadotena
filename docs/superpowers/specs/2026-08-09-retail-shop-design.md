# Retail shop (separate products)

**Date:** 2026-08-09  
**Status:** Approved for implementation

## Goals

1. Separate retail **products** catalog (not `menu_items`).
2. Own guest shop cart/checkout with pickup or delivery.
3. Payment same as food pickup/delivery (cash pending / digital + ref).
4. Never appear in kitchen; staff Shop queue for packing.
5. No stock tracking in v1.

## Order types

- `shop_pickup` / `shop_delivery` (API: `SHOP_PICKUP` / `SHOP_DELIVERY`)
- Tax 15%; no service charge; delivery fee 100 ETB for `shop_delivery`
- `KitchenVisible` always false for shop types

## Schema

- `product_categories`, `products`
- `order_items.product_id` nullable; `menu_item_id` nullable; exactly one set

## Surfaces

- Public: `/shop`, `/shop/checkout`; API `GET /public/products`, place via existing orders with shop types
- Staff: `/dashboard/products`, `/dashboard/shop`
