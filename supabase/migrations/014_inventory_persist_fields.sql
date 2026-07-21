-- Inventario Dotación: campos persistentes para motivo de entrada, observaciones y atributos de talla/color.
-- Garantiza que lo capturado en UI prevalezca en tablas (no solo en textos libres).

BEGIN;

-- Categorías base (idempotente)
INSERT INTO inventory_categories (code, name, description) VALUES
  ('UNI', 'Uniforme', 'Prendas de uniforme'),
  ('ACC', 'Accesorio', 'Accesorios de dotación')
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      updated_at = NOW();

-- Variantes: talla / color / género en columnas propias (además de attributes jsonb)
ALTER TABLE inventory_variants
  ADD COLUMN IF NOT EXISTS talla VARCHAR(40),
  ADD COLUMN IF NOT EXISTS color VARCHAR(40),
  ADD COLUMN IF NOT EXISTS genero VARCHAR(30);

-- Backfill desde attributes si existen
UPDATE inventory_variants
SET
  talla = COALESCE(talla, NULLIF(attributes->>'talla', '')),
  color = COALESCE(color, NULLIF(attributes->>'color', '')),
  genero = COALESCE(genero, NULLIF(attributes->>'genero', ''))
WHERE attributes IS NOT NULL
  AND (
    attributes ? 'talla'
    OR attributes ? 'color'
    OR attributes ? 'genero'
  );

-- Movimientos: motivo estructurado + observaciones
ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS entry_reason VARCHAR(80),
  ADD COLUMN IF NOT EXISTS observations TEXT;

-- Backfill: separar "Motivo — notas" del campo reason histórico
UPDATE inventory_movements
SET
  entry_reason = COALESCE(
    entry_reason,
    CASE
      WHEN reason IS NULL OR btrim(reason) = '' THEN NULL
      WHEN position(' — ' in reason) > 0 THEN split_part(reason, ' — ', 1)
      ELSE reason
    END
  ),
  observations = COALESCE(
    observations,
    CASE
      WHEN reason IS NOT NULL AND position(' — ' in reason) > 0
        THEN NULLIF(btrim(substring(reason from position(' — ' in reason) + 3)), '')
      ELSE NULL
    END
  )
WHERE entry_reason IS NULL OR observations IS NULL;

-- Entradas (IN) deben tener motivo de entrada
UPDATE inventory_movements
SET entry_reason = COALESCE(NULLIF(btrim(entry_reason), ''), NULLIF(btrim(reason), ''), 'Compra')
WHERE movement_type = 'IN'
  AND (entry_reason IS NULL OR btrim(entry_reason) = '');

CREATE INDEX IF NOT EXISTS idx_inventory_movements_entry_reason
  ON inventory_movements (entry_reason)
  WHERE entry_reason IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_variants_talla
  ON inventory_variants (item_id, talla);

COMMIT;
