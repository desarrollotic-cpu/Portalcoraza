-- Deliveries domain

CREATE TYPE delivery_status AS ENUM ('PENDING', 'DELIVERED');

CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  associate_id UUID NOT NULL REFERENCES associates(id) ON DELETE RESTRICT,
  status delivery_status NOT NULL DEFAULT 'PENDING',
  signature_url TEXT,
  is_immutable BOOLEAN NOT NULL DEFAULT FALSE,
  delivered_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES inventory_variants(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_associate ON deliveries(associate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_details_delivery ON delivery_details(delivery_id);

CREATE TRIGGER deliveries_updated_at BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
