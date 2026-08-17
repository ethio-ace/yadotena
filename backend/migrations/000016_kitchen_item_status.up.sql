-- Migration 000016: Per-item kitchen status (independent kitchen rounds)
--
-- The kitchen unit of work is the *round*: every order_item already carries a
-- round_number (round 1 = original order, rounds 2+ = appended later). This
-- migration gives each item its own kitchen lifecycle state so one order can
-- hold several rounds in different states at once (e.g. round 1 PREPARING while
-- round 2 just arrived PENDING) without the whole order flipping back to NEW.
--
-- The order's kitchen status becomes a derived aggregate of its items instead
-- of a hand-set value, so appending items never re-opens already-started work.

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Backfill existing rows from their parent order's kitchen status so in-flight
-- tickets keep correct round states right after deploy (all items of a
-- PREPARING order were started, all items of a SERVED order were served...).
UPDATE order_items oi
SET status = o.status,
    started_at = COALESCE(oi.started_at, now())
FROM orders o
WHERE o.id = oi.order_id
  AND o.status IN ('PREPARING', 'READY', 'SERVED');

-- Indexes for KDS column scans and per-order round lookups.
CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items (status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_status ON order_items (order_id, status);
