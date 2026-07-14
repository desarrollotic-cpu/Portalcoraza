-- Categorías base de inventario Dotación (Uniforme / Accesorio)
INSERT INTO inventory_categories (code, name, description) VALUES
  ('UNI', 'Uniforme', 'Prendas de uniforme'),
  ('ACC', 'Accesorio', 'Accesorios de dotación')
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      updated_at = NOW();
