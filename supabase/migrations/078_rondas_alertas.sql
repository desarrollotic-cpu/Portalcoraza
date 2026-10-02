-- Alertas que envía el vigilante desde la ronda GPS.

BEGIN;

CREATE TABLE IF NOT EXISTS rondas_alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  uuid_cliente UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES posts(id),
  associate_id UUID NOT NULL REFERENCES associates(id),
  tipo VARCHAR(20) NOT NULL,
  mensaje VARCHAR(400) NOT NULL DEFAULT '',
  latitud DOUBLE PRECISION,
  longitud DOUBLE PRECISION,
  fecha_hora TIMESTAMPTZ NOT NULL,
  dispositivo_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (uuid_cliente)
);
CREATE INDEX IF NOT EXISTS idx_rondas_alertas_fecha ON rondas_alertas(tenant_id, fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_rondas_alertas_post ON rondas_alertas(post_id, fecha_hora DESC);

COMMIT;
