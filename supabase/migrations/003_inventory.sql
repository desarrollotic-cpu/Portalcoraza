-- Inventory domain

CREATE TYPE inventory_movement_type AS ENUM ('IN', 'OUT', 'ADJ');

CREATE TABLE IF NOT EXISTS inventory_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  low_stock_default_threshold INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES inventory_categories(id) ON DELETE RESTRICT,
  code VARCHAR(60) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  low_stock_threshold INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  sku VARCHAR(80) NOT NULL UNIQUE,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  stock_current INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES inventory_variants(id) ON DELETE RESTRICT,
  movement_type inventory_movement_type NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reason TEXT,
  reference VARCHAR(120),
  performed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_variants_item ON inventory_variants(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_variant ON inventory_movements(variant_id, created_at DESC);

CREATE TRIGGER inventory_categories_updated_at BEFORE UPDATE ON inventory_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER inventory_items_updated_at BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER inventory_variants_updated_at BEFORE UPDATE ON inventory_variants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
