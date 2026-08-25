-- Dotación: almacenes Medellín / Rionegro, stock por sede, traslados.

BEGIN;

CREATE TABLE IF NOT EXISTS inventory_warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO inventory_warehouses (code, name) VALUES
  ('MEDELLIN', 'Medellín'),
  ('RIONEGRO', 'Rionegro')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

CREATE TABLE IF NOT EXISTS inventory_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES inventory_variants(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES inventory_warehouses(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (variant_id, warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_stock_warehouse ON inventory_stock (warehouse_id);

INSERT INTO inventory_stock (variant_id, warehouse_id, quantity)
SELECT v.id, w.id, 0
FROM inventory_variants v
CROSS JOIN inventory_warehouses w
ON CONFLICT (variant_id, warehouse_id) DO NOTHING;

UPDATE inventory_stock SET quantity = 0;
UPDATE inventory_variants SET stock_current = 0;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES inventory_warehouses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_warehouse ON users (warehouse_id);

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES inventory_warehouses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dest_warehouse_id UUID REFERENCES inventory_warehouses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_movements_warehouse
  ON inventory_movements (warehouse_id, created_at DESC);

ALTER TABLE inventory_movements
  ALTER COLUMN movement_type TYPE VARCHAR(12)
  USING movement_type::text;

ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES inventory_warehouses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deliveries_warehouse ON deliveries (warehouse_id);

-- Gerencia: solo ve Dotación (catálogo / movimientos / entregas)
DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.code = 'GERENCIA'
  AND p.code IN (
    'inventory.create',
    'inventory.edit',
    'inventory.move',
    'deliveries.create',
    'deliveries.sign',
    'deliveries.revert'
  );

-- Catálogo base: Camisa / Pantalón / Botas × Hombre / Mujer
INSERT INTO inventory_items (category_id, code, name, unit, low_stock_threshold)
SELECT c.id, v.code, v.name, 'und', 10
FROM inventory_categories c
CROSS JOIN (VALUES
  ('CAMISA', 'Camisa'),
  ('PANTALON', 'Pantalón'),
  ('BOTAS', 'Botas')
) AS v(code, name)
WHERE c.code = 'UNI'
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      updated_at = NOW();

INSERT INTO inventory_variants (item_id, sku, attributes, talla, color, genero, stock_current)
SELECT i.id, i.code || '-' || g.code,
  jsonb_build_object('genero', g.label),
  NULL, NULL, g.code, 0
FROM inventory_items i
CROSS JOIN (VALUES
  ('M', 'Hombre'),
  ('F', 'Mujer')
) AS g(code, label)
WHERE i.code IN ('CAMISA', 'PANTALON', 'BOTAS')
ON CONFLICT (sku) DO NOTHING;

INSERT INTO inventory_stock (variant_id, warehouse_id, quantity)
SELECT v.id, w.id, 0
FROM inventory_variants v
CROSS JOIN inventory_warehouses w
ON CONFLICT (variant_id, warehouse_id) DO NOTHING;

COMMIT;
