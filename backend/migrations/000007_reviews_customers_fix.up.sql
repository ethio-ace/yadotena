-- Add unique constraint on reviews.order_id (allow null/empty for anonymous reviews)
CREATE UNIQUE INDEX IF NOT EXISTS reviews_order_id_unique 
ON reviews(order_id) WHERE order_id IS NOT NULL AND order_id != '';
