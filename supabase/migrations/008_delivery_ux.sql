-- Delivery UX: puesto, observaciones, reversión

ALTER TYPE delivery_status ADD VALUE IF NOT EXISTS 'REVERTED';

ALTER TABLE deliveries
  ALTER COLUMN associate_id DROP NOT NULL;

ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES posts(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS observations TEXT,
  ADD COLUMN IF NOT EXISTS reverted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reverted_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS revert_reason TEXT;

ALTER TABLE deliveries
  DROP CONSTRAINT IF EXISTS deliveries_target_check;

ALTER TABLE deliveries
  ADD CONSTRAINT deliveries_target_check CHECK (
    (associate_id IS NOT NULL AND post_id IS NULL)
    OR (associate_id IS NULL AND post_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_deliveries_post ON deliveries(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_associate_status ON deliveries(associate_id, status);
