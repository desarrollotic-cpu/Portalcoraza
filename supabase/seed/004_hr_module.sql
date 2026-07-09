-- ============================================================================
-- Portal Coraza — Seed 004: Módulo Gestión Humana (HRM v2)
-- ============================================================================
-- Idempotente: seguro re-ejecutar. Complementa 001, 002 y 003.
-- Se ejecuta DESPUÉS de la migración 010_hr_module.sql.
--
-- Incluye:
--   • Roles HRM: SST, CONSULTA, COORDINADOR_OPERATIVO
--   • Permisos del módulo HRM (job_positions, work_centers, catalogs,
--     retirements, hr_documents, hr_alerts, hr_dashboard, hr_import,
--     hr_sensitive)
--   • Asignación de permisos a roles (Ley 1581: solo GERENCIA y RRHH ven
--     datos sensibles).
--   • 18 cargos base (10 críticos, 8 regulares)
--   • 5 centros de trabajo iniciales
--   • Catálogos maestros con ~90 valores predefinidos
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Roles HRM (agregar los que faltan)
-- ---------------------------------------------------------------------------
INSERT INTO roles (code, name, description) VALUES
  ('SST',                   'Salud y Seguridad en el Trabajo', 'Gestión de exámenes, cursos, pólizas y matriz de cumplimiento normativo'),
  ('COORDINADOR_OPERATIVO', 'Coordinador Operativo',            'Coordinación operativa con acceso a datos laborales sin datos sensibles'),
  ('CONSULTA',              'Consulta',                          'Acceso de solo lectura al dashboard y reportes')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2) Permisos del módulo HRM
-- ---------------------------------------------------------------------------
INSERT INTO permissions (code, name, module) VALUES
  -- Cargos (job_positions)
  ('job_positions.view',    'Ver cargos',                'hr'),
  ('job_positions.create',  'Crear cargo',               'hr'),
  ('job_positions.edit',    'Editar cargo',              'hr'),

  -- Centros de trabajo (work_centers)
  ('work_centers.view',     'Ver centros de trabajo',    'hr'),
  ('work_centers.create',   'Crear centro de trabajo',   'hr'),
  ('work_centers.edit',     'Editar centro de trabajo',  'hr'),

  -- Catálogos (EPS, FONDO_PENSION, etc.)
  ('catalogs.view',         'Ver catálogos maestros',    'hr'),
  ('catalogs.manage',       'Gestionar catálogos',       'hr'),

  -- Retiros (retirements)
  ('retirements.view',      'Ver retiros',               'hr'),
  ('retirements.create',    'Registrar retiro',          'hr'),
  ('retirements.edit',      'Editar retiro',             'hr'),
  ('retirements.readmit',   'Procesar reingreso',        'hr'),

  -- Documentos del asociado
  ('hr_documents.view',     'Ver documentos de asociado',    'hr'),
  ('hr_documents.upload',   'Cargar documentos de asociado', 'hr'),
  ('hr_documents.delete',   'Eliminar documentos de asociado','hr'),

  -- Alertas HRM
  ('hr_alerts.view',        'Ver alertas HRM',           'hr'),
  ('hr_alerts.resolve',     'Resolver alertas HRM',      'hr'),
  ('hr_alerts.run_cron',    'Ejecutar motor de alertas', 'hr'),

  -- Dashboard y export
  ('hr_dashboard.view',     'Ver dashboard HRM',         'hr'),
  ('hr_export.excel',       'Exportar reportes Excel',   'hr'),

  -- Import Excel
  ('hr_import.execute',     'Importar planillas Excel',  'hr'),

  -- Datos sensibles (Ley 1581 Colombia): raza, religión, orientación sexual
  ('hr_sensitive.view',     'Ver datos sensibles Ley 1581', 'hr'),

  -- Auditoría HRM
  ('hr_audit.view',         'Ver bitácora HRM',          'hr')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3) Asignación de permisos por rol
-- ---------------------------------------------------------------------------

-- GERENCIA: todo (acceso completo, incluidos datos sensibles)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'GERENCIA' AND p.code IN (
  'job_positions.view', 'job_positions.create', 'job_positions.edit',
  'work_centers.view', 'work_centers.create', 'work_centers.edit',
  'catalogs.view', 'catalogs.manage',
  'retirements.view', 'retirements.create', 'retirements.edit', 'retirements.readmit',
  'hr_documents.view', 'hr_documents.upload', 'hr_documents.delete',
  'hr_alerts.view', 'hr_alerts.resolve', 'hr_alerts.run_cron',
  'hr_dashboard.view', 'hr_export.excel',
  'hr_import.execute',
  'hr_sensitive.view',
  'hr_audit.view'
)
ON CONFLICT DO NOTHING;

-- RRHH: gestión completa de personal, catálogos, retiros y datos sensibles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'RRHH' AND p.code IN (
  'job_positions.view', 'job_positions.create', 'job_positions.edit',
  'work_centers.view', 'work_centers.create', 'work_centers.edit',
  'catalogs.view', 'catalogs.manage',
  'retirements.view', 'retirements.create', 'retirements.edit', 'retirements.readmit',
  'hr_documents.view', 'hr_documents.upload', 'hr_documents.delete',
  'hr_alerts.view', 'hr_alerts.resolve',
  'hr_dashboard.view', 'hr_export.excel',
  'hr_import.execute',
  'hr_sensitive.view',
  'hr_audit.view'
)
ON CONFLICT DO NOTHING;

-- SST: cumplimiento, exámenes, cursos, pólizas, alertas — pero sin editar
-- nombres/salario/estado civil y sin ver datos sensibles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'SST' AND p.code IN (
  'associates.view',
  'job_positions.view',
  'work_centers.view',
  'catalogs.view',
  'hr_documents.view', 'hr_documents.upload', 'hr_documents.delete',
  'hr_alerts.view', 'hr_alerts.resolve', 'hr_alerts.run_cron',
  'hr_dashboard.view', 'hr_export.excel'
)
ON CONFLICT DO NOTHING;

-- COORDINADOR_OPERATIVO: ver asociados, cargos, centros, dashboard — sin
-- datos sensibles ni edición
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'COORDINADOR_OPERATIVO' AND p.code IN (
  'associates.view',
  'job_positions.view',
  'work_centers.view',
  'catalogs.view',
  'hr_documents.view',
  'hr_alerts.view',
  'hr_dashboard.view'
)
ON CONFLICT DO NOTHING;

-- CONSULTA: solo dashboard y reportes agregados
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'CONSULTA' AND p.code IN (
  'hr_dashboard.view',
  'hr_export.excel'
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4) Cargos base (18): 10 críticos (frecuencia 1 año) + 8 regulares (2 años)
-- ---------------------------------------------------------------------------
INSERT INTO job_positions (name, is_critical, refresh_frequency_years, description) VALUES
  -- Críticos (reentrenamiento anual)
  ('GERENTE',                       TRUE,  1, 'Gerencia general'),
  ('TESORERO',                      TRUE,  1, 'Tesorería y finanzas'),
  ('DIR GESTION HUMANA',            TRUE,  1, 'Director de Gestión Humana'),
  ('DIR OPERATIVO',                 TRUE,  1, 'Director Operativo'),
  ('DIR COMERCIAL',                 TRUE,  1, 'Director Comercial'),
  ('COORDINADOR OPERATIVO',         TRUE,  1, 'Coordinación operativa de puestos'),
  ('ESCOLTA',                       TRUE,  1, 'Escolta con arma'),
  ('VIGIL CON ARMA',                TRUE,  1, 'Vigilante armado'),
  ('PROGRAMADOR',                   TRUE,  1, 'Programación mensual de personal'),
  ('RESPONSABLE SST',               TRUE,  1, 'Responsable de Seguridad y Salud en el Trabajo'),

  -- Regulares (reentrenamiento cada 2 años)
  ('VIGILANTE',                     FALSE, 2, 'Vigilante sin arma'),
  ('SUPERVISOR',                    FALSE, 2, 'Supervisor operativo'),
  ('RECEPCIONISTA',                 FALSE, 2, 'Recepción y atención al público'),
  ('AUX CONTABLE',                  FALSE, 2, 'Auxiliar contable'),
  ('SERVICIOS GENERALES',           FALSE, 2, 'Servicios generales'),
  ('ASISTENTE TALENTO HUMANO',      FALSE, 2, 'Asistente de Talento Humano'),
  ('AUXILIAR ADMINISTRATIVO',       FALSE, 2, 'Auxiliar administrativo'),
  ('OPERADOR DE MEDIO TECNOLOGICO', FALSE, 2, 'Operador de medios tecnológicos')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5) Centros de trabajo iniciales
-- ---------------------------------------------------------------------------
INSERT INTO work_centers (code, client_name, address, zone) VALUES
  ('01', 'Sede Administrativa Principal',          'Calle 45 # 12-34, Bogotá',   'Centro'),
  ('02', 'Puesto Zona Norte — Almacenes Éxito',    'Autopista Norte # 170-50',   'Norte'),
  ('03', 'Puesto Zona Sur — Centro Mayor',         'Calle 38 Sur # 34-60',       'Sur'),
  ('04', 'Puesto Vigilancia Tecnológica — Coraza', 'Av. El Dorado # 68b-85',     'Occidente'),
  ('05', 'Supervisión Móvil Bogotá',               'Bogotá D.C.',                'General')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6) Catálogos maestros (14 tipos, ~90 valores)
-- ---------------------------------------------------------------------------

-- EPS
INSERT INTO catalog_values (kind, value, display_order) VALUES
  ('EPS', 'SURA',                          1),
  ('EPS', 'COOSALUD',                      2),
  ('EPS', 'NUEVA EPS',                     3),
  ('EPS', 'SALUD TOTAL',                   4),
  ('EPS', 'SANITAS EPS',                   5),
  ('EPS', 'SAVIA SALUD',                   6),
  ('EPS', 'CAJACOPI',                      7),
  ('EPS', 'MUTUAL SER',                    8),
  ('EPS', 'FAMISANAR',                     9),
  ('EPS', 'ASMET SALUD',                  10),
  ('EPS', 'FOSYGA',                       11),
  ('EPS', 'EPS FAMILIAR DE COLOMBIA SAS', 12)
ON CONFLICT (kind, value) DO NOTHING;

-- Fondo de pensión
INSERT INTO catalog_values (kind, value, display_order) VALUES
  ('FONDO_PENSION', 'COLPENSIONES',              1),
  ('FONDO_PENSION', 'PROTECCION',                2),
  ('FONDO_PENSION', 'PORVENIR',                  3),
  ('FONDO_PENSION', 'COLFONDOS',                 4),
  ('FONDO_PENSION', 'HORIZONTE',                 5),
  ('FONDO_PENSION', 'PENSIONADO',                6),
  ('FONDO_PENSION', 'ING PENSIONES Y CESANTIAS', 7)
ON CONFLICT (kind, value) DO NOTHING;

-- RH (grupo sanguíneo)
INSERT INTO catalog_values (kind, value, display_order) VALUES
  ('RH', 'O+',  1), ('RH', 'O-',  2),
  ('RH', 'A+',  3), ('RH', 'A-',  4),
  ('RH', 'B+',  5), ('RH', 'B-',  6),
  ('RH', 'AB+', 7), ('RH', 'AB-', 8)
ON CONFLICT (kind, value) DO NOTHING;

-- Género
INSERT INTO catalog_values (kind, value, display_order) VALUES
  ('GENERO', 'HOMBRE',            1),
  ('GENERO', 'MUJER',             2),
  ('GENERO', 'NO BINARIO',        3),
  ('GENERO', 'TRANSGENERO',       4),
  ('GENERO', 'PREFIERO NO DECIR', 5)
ON CONFLICT (kind, value) DO NOTHING;

-- Orientación sexual (dato sensible Ley 1581)
INSERT INTO catalog_values (kind, value, display_order) VALUES
  ('ORIENTACION_SEXUAL', 'HETEROSEXUAL',      1),
  ('ORIENTACION_SEXUAL', 'HOMOSEXUAL',        2),
  ('ORIENTACION_SEXUAL', 'BISEXUAL',          3),
  ('ORIENTACION_SEXUAL', 'ASEXUAL',           4),
  ('ORIENTACION_SEXUAL', 'OTRO',              5),
  ('ORIENTACION_SEXUAL', 'PREFIERO NO DECIR', 6)
ON CONFLICT (kind, value) DO NOTHING;

-- Religión (dato sensible Ley 1581)
INSERT INTO catalog_values (kind, value, display_order) VALUES
  ('RELIGION', 'CATOLICA',          1),
  ('RELIGION', 'PROTESTANTE',       2),
  ('RELIGION', 'JUDIA',             3),
  ('RELIGION', 'MUSULMANA',         4),
  ('RELIGION', 'OTRO',              5),
  ('RELIGION', 'PREFIERO NO DECIR', 6)
ON CONFLICT (kind, value) DO NOTHING;

-- Raza / Etnia (dato sensible Ley 1581)
INSERT INTO catalog_values (kind, value, display_order) VALUES
  ('RAZA', 'MESTIZO',        1),
  ('RAZA', 'AFROCOLOMBIANO', 2),
  ('RAZA', 'INDIGENA',       3),
  ('RAZA', 'ROM',            4),
  ('RAZA', 'PALENQUERO',     5),
  ('RAZA', 'RAIZAL',         6)
ON CONFLICT (kind, value) DO NOTHING;

-- Motivo de retiro (primer nivel)
INSERT INTO catalog_values (kind, value, display_order) VALUES
  ('MOTIVO_RETIRO', 'Voluntaria',                     1),
  ('MOTIVO_RETIRO', 'Exclusion',                      2),
  ('MOTIVO_RETIRO', 'Fallecimiento',                  3),
  ('MOTIVO_RETIRO', 'Pension',                        4),
  ('MOTIVO_RETIRO', 'Demasiada presion o estres',     5),
  ('MOTIVO_RETIRO', 'Ambiente fisico de trabajo',     6),
  ('MOTIVO_RETIRO', 'Incumplimiento de lo ofrecido',  7),
  ('MOTIVO_RETIRO', 'Problemas con jefe directo',     8),
  ('MOTIVO_RETIRO', 'Falta de oportunidad',           9),
  ('MOTIVO_RETIRO', 'Falta de motivacion de grupo',  10),
  ('MOTIVO_RETIRO', 'Horario de trabajo',            11),
  ('MOTIVO_RETIRO', 'Falta de acompanamiento inicial', 12),
  ('MOTIVO_RETIRO', 'Relaciones laborales',          13),
  ('MOTIVO_RETIRO', 'Mejoras laborales',             14),
  ('MOTIVO_RETIRO', 'Necesidad economica',           15)
ON CONFLICT (kind, value) DO NOTHING;

-- Razón de retiro (segundo nivel, detalle)
INSERT INTO catalog_values (kind, value, display_order) VALUES
  ('RAZON_RETIRO', 'Baja remuneracion',                   1),
  ('RAZON_RETIRO', 'Problemas personales',                2),
  ('RAZON_RETIRO', 'Enfermedad',                          3),
  ('RAZON_RETIRO', 'Falta de reconocimiento',             4),
  ('RAZON_RETIRO', 'Cumplimiento programacion',           5),
  ('RAZON_RETIRO', 'Incumplimiento programacion',         6),
  ('RAZON_RETIRO', 'Ubicacion puesto de trabajo',         7),
  ('RAZON_RETIRO', 'Induccion/Capacitacion',              8),
  ('RAZON_RETIRO', 'Trato diferente o discriminacion',    9),
  ('RAZON_RETIRO', 'Falta de induccion/capacitacion',    10),
  ('RAZON_RETIRO', 'Otros',                              11)
ON CONFLICT (kind, value) DO NOTHING;

-- Medio de transporte
INSERT INTO catalog_values (kind, value, display_order) VALUES
  ('MEDIO_TRANSPORTE', 'A PIE',            1),
  ('MEDIO_TRANSPORTE', 'BICICLETA',        2),
  ('MEDIO_TRANSPORTE', 'MOTO',             3),
  ('MEDIO_TRANSPORTE', 'CARRO',            4),
  ('MEDIO_TRANSPORTE', 'SERVICIO PUBLICO', 5),
  ('MEDIO_TRANSPORTE', 'OTRO',             6)
ON CONFLICT (kind, value) DO NOTHING;

-- Tiempo de traslado
INSERT INTO catalog_values (kind, value, display_order) VALUES
  ('TIEMPO_TRASLADO', 'MENOS DE 10 MINUTOS',   1),
  ('TIEMPO_TRASLADO', 'DE 10 A 30 MINUTOS',    2),
  ('TIEMPO_TRASLADO', 'DE 30 MIN A 1 HORA',    3),
  ('TIEMPO_TRASLADO', 'ENTRE 1 Y 2 HORAS',     4),
  ('TIEMPO_TRASLADO', 'MAS DE 2 HORAS',        5)
ON CONFLICT (kind, value) DO NOTHING;

-- Tipo de vivienda
INSERT INTO catalog_values (kind, value, display_order) VALUES
  ('TIPO_VIVIENDA', 'PROPIA',      1),
  ('TIPO_VIVIENDA', 'ARRENDADA',   2),
  ('TIPO_VIVIENDA', 'FAMILIAR',    3),
  ('TIPO_VIVIENDA', 'COMPARTIDA',  4)
ON CONFLICT (kind, value) DO NOTHING;

-- Nivel de estudio
INSERT INTO catalog_values (kind, value, display_order) VALUES
  ('NIVEL_ESTUDIO', 'PRIMARIA',      1),
  ('NIVEL_ESTUDIO', 'BACHILLER',     2),
  ('NIVEL_ESTUDIO', 'TECNICO',       3),
  ('NIVEL_ESTUDIO', 'TECNOLOGO',     4),
  ('NIVEL_ESTUDIO', 'PROFESIONAL',   5),
  ('NIVEL_ESTUDIO', 'POSGRADO',      6)
ON CONFLICT (kind, value) DO NOTHING;

-- Rango de ingresos (SMLV = salarios mínimos legales vigentes)
INSERT INTO catalog_values (kind, value, display_order) VALUES
  ('RANGO_INGRESOS', 'MENOS DE 1 SMLV',    1),
  ('RANGO_INGRESOS', 'ENTRE 1 Y 2 SMLV',   2),
  ('RANGO_INGRESOS', 'ENTRE 2 Y 4 SMLV',   3),
  ('RANGO_INGRESOS', 'MAS DE 5 SMLV',      4)
ON CONFLICT (kind, value) DO NOTHING;
