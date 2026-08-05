-- Índices de rendimiento.
-- La app corre con TypeORM synchronize:false, por lo que los @Index declarados
-- en las entidades NO se crean solos: hay que aplicarlos aquí.

-- Bitácora de asociado: AssociatesService.history(id) filtra por associate_id
-- y ordena por created_at. Sin este índice hace seq scan y se degrada con el
-- tiempo (crece con cada campo editado de cada asociado).
CREATE INDEX IF NOT EXISTS idx_associate_history_associate
  ON associate_history (associate_id, created_at DESC);

-- Overview de dotación: cuenta/lista entregas por status (PENDING) y por
-- status + delivered_at. El índice compuesto existente (associate_id, status)
-- no sirve para un filtro por status aislado.
CREATE INDEX IF NOT EXISTS idx_deliveries_status_delivered
  ON deliveries (status, delivered_at DESC);
