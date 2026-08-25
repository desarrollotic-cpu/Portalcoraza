-- Minuta Virtual MVP (7 entidades operativas).

BEGIN;

CREATE TABLE IF NOT EXISTS minuta_visitantes (
  id VARCHAR(20) PRIMARY KEY,
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  associate_id UUID REFERENCES associates(id) ON DELETE SET NULL,
  usuario TEXT NOT NULL,
  nombre_completo TEXT NOT NULL,
  cedula TEXT,
  apto_no TEXT NOT NULL,
  acompana TEXT NOT NULL DEFAULT 'No',
  vehiculo_placa TEXT,
  hora_entrada TEXT NOT NULL,
  hora_salida TIMESTAMPTZ,
  observaciones TEXT,
  estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'COMPLETADO')),
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_minuta_vis_fecha ON minuta_visitantes(fecha_registro DESC);
CREATE INDEX IF NOT EXISTS idx_minuta_vis_user ON minuta_visitantes(usuario, fecha_registro DESC);

CREATE TABLE IF NOT EXISTS minuta_correspondencia (
  id VARCHAR(20) PRIMARY KEY,
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  associate_id UUID REFERENCES associates(id) ON DELETE SET NULL,
  usuario TEXT NOT NULL,
  clase TEXT NOT NULL,
  apto_no TEXT NOT NULL,
  destinatario TEXT NOT NULL DEFAULT 'Residente',
  remitente TEXT,
  vigilante_entrega TEXT,
  fecha_entrega TIMESTAMPTZ,
  recibido_por TEXT,
  observaciones TEXT,
  estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'ENTREGADO')),
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_minuta_corr_fecha ON minuta_correspondencia(fecha_registro DESC);

CREATE TABLE IF NOT EXISTS minuta_contratistas (
  id VARCHAR(20) PRIMARY KEY,
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  associate_id UUID REFERENCES associates(id) ON DELETE SET NULL,
  usuario TEXT NOT NULL,
  nombre_completo TEXT NOT NULL,
  cedula TEXT NOT NULL,
  empresa TEXT NOT NULL,
  area_trabajo TEXT,
  hora_ingreso TEXT NOT NULL,
  hora_salida TIMESTAMPTZ,
  equipos TEXT,
  autorizado_por TEXT NOT NULL,
  observaciones TEXT,
  estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'COMPLETADO')),
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_minuta_cont_fecha ON minuta_contratistas(fecha_registro DESC);

CREATE TABLE IF NOT EXISTS minuta_domiciliarios (
  id VARCHAR(20) PRIMARY KEY,
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  associate_id UUID REFERENCES associates(id) ON DELETE SET NULL,
  usuario TEXT NOT NULL,
  empresa TEXT NOT NULL,
  tipo_pedido TEXT NOT NULL,
  apto_no TEXT NOT NULL,
  nombre_domiciliario TEXT,
  placa_moto TEXT,
  hora_llegada TEXT NOT NULL,
  hora_salida TIMESTAMPTZ,
  codigo_pedido TEXT,
  observaciones TEXT,
  estado TEXT NOT NULL DEFAULT 'ENTREGANDO' CHECK (estado IN ('ENTREGANDO', 'COMPLETADO')),
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_minuta_dom_fecha ON minuta_domiciliarios(fecha_registro DESC);

CREATE TABLE IF NOT EXISTS minuta_incidentes (
  id VARCHAR(20) PRIMARY KEY,
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  associate_id UUID REFERENCES associates(id) ON DELETE SET NULL,
  usuario TEXT NOT NULL,
  tipo TEXT NOT NULL,
  gravedad TEXT NOT NULL CHECK (gravedad IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
  ubicacion TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  personas_involucradas TEXT,
  acciones_tomadas TEXT NOT NULL DEFAULT 'Reportado a supervisión',
  reportado_a TEXT NOT NULL DEFAULT 'Supervisor',
  estado TEXT NOT NULL DEFAULT 'ABIERTO' CHECK (estado IN ('ABIERTO', 'FINALIZADO')),
  prioridad INT NOT NULL DEFAULT 4,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_minuta_inc_fecha ON minuta_incidentes(fecha_registro DESC);

CREATE TABLE IF NOT EXISTS minuta_servicio (
  id VARCHAR(20) PRIMARY KEY,
  fecha TEXT NOT NULL,
  hora TEXT NOT NULL,
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  associate_id UUID REFERENCES associates(id) ON DELETE SET NULL,
  usuario TEXT NOT NULL,
  anotaciones TEXT NOT NULL,
  novedades TEXT,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_minuta_serv_fecha ON minuta_servicio(fecha_registro DESC);

CREATE TABLE IF NOT EXISTS minuta_entrega_puesto (
  id VARCHAR(20) PRIMARY KEY,
  fecha TEXT NOT NULL,
  hora TEXT NOT NULL,
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  associate_id UUID REFERENCES associates(id) ON DELETE SET NULL,
  turno_saliente TEXT NOT NULL,
  turno_entrante TEXT NOT NULL,
  vigilante_saliente TEXT NOT NULL,
  vigilante_entrante TEXT NOT NULL,
  nombre_del_puesto TEXT NOT NULL,
  novedades TEXT,
  equipos_entregados TEXT NOT NULL DEFAULT 'Radio, Linterna',
  llaves_entregadas TEXT NOT NULL DEFAULT 'Set completo',
  observaciones TEXT,
  estado TEXT NOT NULL DEFAULT 'COMPLETADO',
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_minuta_ent_fecha ON minuta_entrega_puesto(fecha_registro DESC);

INSERT INTO permissions (code, name, module) VALUES
  ('minuta.view', 'Ver módulo Minuta Virtual (Portal)', 'minuta')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('GERENCIA', 'ADMIN', 'SUPERADMIN')
  AND p.code = 'minuta.view'
ON CONFLICT DO NOTHING;

ALTER TABLE minuta_visitantes ADD COLUMN IF NOT EXISTS registrado_por TEXT;
ALTER TABLE minuta_correspondencia ADD COLUMN IF NOT EXISTS registrado_por TEXT;
ALTER TABLE minuta_contratistas ADD COLUMN IF NOT EXISTS registrado_por TEXT;
ALTER TABLE minuta_domiciliarios ADD COLUMN IF NOT EXISTS registrado_por TEXT;
ALTER TABLE minuta_incidentes ADD COLUMN IF NOT EXISTS registrado_por TEXT;
ALTER TABLE minuta_servicio ADD COLUMN IF NOT EXISTS registrado_por TEXT;
ALTER TABLE minuta_entrega_puesto ADD COLUMN IF NOT EXISTS registrado_por TEXT;

COMMIT;
