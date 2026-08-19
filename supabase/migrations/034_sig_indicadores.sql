-- SIG-KPI MVP. Idempotente (Render bootstrap + migración 034).

CREATE TABLE IF NOT EXISTS sig_sistemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sig_objetivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema_id UUID NOT NULL REFERENCES sig_sistemas(id) ON DELETE CASCADE,
  perspectiva TEXT NOT NULL CHECK (perspectiva IN ('FINANZAS', 'CLIENTES', 'PROCESOS', 'APRENDIZAJE')),
  objetivo_texto TEXT NOT NULL,
  estrategia TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sig_indicadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  objetivo_id UUID NOT NULL REFERENCES sig_objetivos(id) ON DELETE RESTRICT,
  subsistema TEXT NOT NULL,
  proposito TEXT,
  formula TEXT,
  frecuencia TEXT NOT NULL CHECK (frecuencia IN ('MENSUAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL')),
  sentido TEXT NOT NULL CHECK (sentido IN ('ASCENDENTE', 'DESCENDENTE')),
  area TEXT NOT NULL CHECK (area IN ('GH', 'SST', 'COMERCIAL', 'OPERACIONES', 'ADMIN')),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  responsable TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sig_ind_area ON sig_indicadores(area, activo);

CREATE TABLE IF NOT EXISTS sig_resultados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicador_id UUID NOT NULL REFERENCES sig_indicadores(id) ON DELETE CASCADE,
  anio INT NOT NULL,
  periodo TEXT NOT NULL,
  meta_snapshot NUMERIC NOT NULL,
  valor_resultado NUMERIC NOT NULL,
  observaciones TEXT,
  color_semaforo TEXT NOT NULL CHECK (color_semaforo IN ('AZUL', 'VERDE', 'AMARILLO', 'ROJO')),
  seguimiento TEXT NOT NULL DEFAULT 'ABIERTO' CHECK (seguimiento IN ('ABIERTO', 'CERRADO')),
  capturado_por TEXT NOT NULL,
  fecha_captura TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (indicador_id, anio, periodo)
);
CREATE INDEX IF NOT EXISTS idx_sig_res_anio ON sig_resultados(anio, periodo);

INSERT INTO permissions (code, name, module) VALUES
  ('sig.view', 'Ver módulo SIG-KPI (Portal)', 'sig')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('GERENCIA', 'ADMIN', 'SUPERADMIN')
  AND p.code = 'sig.view'
ON CONFLICT DO NOTHING;

INSERT INTO sig_sistemas (id, nombre) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'CALIDAD'),
  ('a1000000-0000-4000-8000-000000000002', 'SST'),
  ('a1000000-0000-4000-8000-000000000003', 'BASC'),
  ('a1000000-0000-4000-8000-000000000004', 'SIG'),
  ('a1000000-0000-4000-8000-000000000005', 'RSE'),
  ('a1000000-0000-4000-8000-000000000006', 'PESV')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sig_objetivos (id, sistema_id, perspectiva, objetivo_texto, estrategia) VALUES
  ('b2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000004', 'FINANZAS', 'Sostenibilidad económica de la cooperativa', 'Control de margen, cartera y presupuesto'),
  ('b2000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'CLIENTES', 'Satisfacción y fidelización de clientes', 'Calidad del servicio y gestión comercial'),
  ('b2000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000004', 'PROCESOS', 'Eficacia del sistema integrado de gestión', 'Procesos SIG, no conformidades y acciones'),
  ('b2000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', 'APRENDIZAJE', 'Desarrollo del talento y conocimiento', 'Capacitación, clima y competencias'),
  ('b2000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000002', 'PROCESOS', 'Ambientes de trabajo seguros y saludables', 'SG-SST, accidentalidad e inspecciones'),
  ('b2000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-000000000004', 'PROCESOS', 'Operación del servicio de vigilancia', 'Programación, cobertura y novedades'),
  ('b2000000-0000-4000-8000-000000000007', 'a1000000-0000-4000-8000-000000000003', 'PROCESOS', 'Cumplimiento BASC, PESV y ambiental', 'Controles de seguridad, vialidad y RSE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sig_indicadores (id, codigo, nombre, objetivo_id, subsistema, proposito, formula, frecuencia, sentido, area, responsable) VALUES
  ('c3000000-0000-4000-8000-000000000001', 'E1', 'UTILIDAD OPERACIONAL', 'b2000000-0000-4000-8000-000000000001', 'SIG', 'Mide el resultado operativo del periodo', 'Ingresos operativos - costos operativos', 'MENSUAL', 'ASCENDENTE', 'ADMIN', 'Administrativo'),
  ('c3000000-0000-4000-8000-000000000002', 'E2', 'MARGEN DE CONTRIBUCION', 'b2000000-0000-4000-8000-000000000001', 'SIG', 'Participación del margen sobre ingresos', '(Margen / Ingresos) * 100', 'MENSUAL', 'ASCENDENTE', 'ADMIN', 'Administrativo'),
  ('c3000000-0000-4000-8000-000000000003', 'E3', 'ROTACION DE CARTERA', 'b2000000-0000-4000-8000-000000000001', 'SIG', 'Días promedio de recaudo', 'Cartera / (Ventas/365)', 'MENSUAL', 'DESCENDENTE', 'ADMIN', 'Administrativo'),
  ('c3000000-0000-4000-8000-000000000004', 'E4', 'CUMPLIMIENTO PRESUPUESTAL', 'b2000000-0000-4000-8000-000000000001', 'SIG', 'Ejecución vs presupuesto', '(Ejecutado / Presupuestado) * 100', 'MENSUAL', 'ASCENDENTE', 'ADMIN', 'Administrativo'),
  ('c3000000-0000-4000-8000-000000000005', 'H1', 'ROTACION DEL PERSONAL', 'b2000000-0000-4000-8000-000000000004', 'SIG', 'Salidas sobre planta promedio', '(Retiros / Planta promedio) * 100', 'MENSUAL', 'DESCENDENTE', 'GH', 'Gestión Humana'),
  ('c3000000-0000-4000-8000-000000000006', 'H2', 'AUSENTISMO', 'b2000000-0000-4000-8000-000000000004', 'SIG', 'Horas no laboradas sobre horas programadas', '(Horas ausentes / Horas programadas) * 100', 'MENSUAL', 'DESCENDENTE', 'GH', 'Gestión Humana'),
  ('c3000000-0000-4000-8000-000000000007', 'H3', 'CUMPLIMIENTO PLAN CAPACITACION', 'b2000000-0000-4000-8000-000000000004', 'SIG', 'Ejecución del plan de formación', '(Horas ejecutadas / Horas planificadas) * 100', 'TRIMESTRAL', 'ASCENDENTE', 'GH', 'Gestión Humana'),
  ('c3000000-0000-4000-8000-000000000008', 'H4', 'CLIMA ORGANIZACIONAL', 'b2000000-0000-4000-8000-000000000004', 'SIG', 'Resultado de encuesta de clima', 'Puntaje promedio encuesta', 'ANUAL', 'ASCENDENTE', 'GH', 'Gestión Humana'),
  ('c3000000-0000-4000-8000-000000000009', 'S1', 'FRECUENCIA DE ACCIDENTALIDAD', 'b2000000-0000-4000-8000-000000000005', 'SST', 'Accidentes de trabajo por cada 100 trabajadores', '(N° AT / N° trabajadores) * 100', 'MENSUAL', 'DESCENDENTE', 'SST', 'SST'),
  ('c3000000-0000-4000-8000-00000000000a', 'S2', 'SEVERIDAD DE ACCIDENTALIDAD', 'b2000000-0000-4000-8000-000000000005', 'SST', 'Días perdidos por accidentalidad', '(Días perdidos / N° trabajadores) * 100', 'MENSUAL', 'DESCENDENTE', 'SST', 'SST'),
  ('c3000000-0000-4000-8000-00000000000b', 'S3', 'CUMPLIMIENTO INSPECCIONES SST', 'b2000000-0000-4000-8000-000000000005', 'SST', 'Inspecciones ejecutadas vs programadas', '(Ejecutadas / Programadas) * 100', 'MENSUAL', 'ASCENDENTE', 'SST', 'SST'),
  ('c3000000-0000-4000-8000-00000000000c', 'S4', 'CIERRE DE HALLAZGOS SST', 'b2000000-0000-4000-8000-000000000005', 'SST', 'Hallazgos cerrados a tiempo', '(Cerrados / Abiertos) * 100', 'MENSUAL', 'ASCENDENTE', 'SST', 'SST'),
  ('c3000000-0000-4000-8000-00000000000d', 'S5', 'CUMPLIMIENTO SG-SST', 'b2000000-0000-4000-8000-000000000005', 'SST', 'Estándares mínimos res. 0312', 'Porcentaje de cumplimiento legal', 'TRIMESTRAL', 'ASCENDENTE', 'SST', 'SST'),
  ('c3000000-0000-4000-8000-00000000000e', 'C1', 'SATISFACCION DEL CLIENTE', 'b2000000-0000-4000-8000-000000000002', 'CALIDAD', 'Percepción del servicio', 'Promedio encuesta de satisfacción', 'TRIMESTRAL', 'ASCENDENTE', 'COMERCIAL', 'Comercial'),
  ('c3000000-0000-4000-8000-00000000000f', 'C2', 'QUEJAS Y RECLAMOS', 'b2000000-0000-4000-8000-000000000002', 'CALIDAD', 'Volumen de PQR', 'N° quejas del periodo', 'MENSUAL', 'DESCENDENTE', 'COMERCIAL', 'Comercial'),
  ('c3000000-0000-4000-8000-000000000010', 'C3', 'RETENCION DE CONTRATOS', 'b2000000-0000-4000-8000-000000000002', 'CALIDAD', 'Contratos vigentes retenidos', '(Renovados / Por vencer) * 100', 'TRIMESTRAL', 'ASCENDENTE', 'COMERCIAL', 'Comercial'),
  ('c3000000-0000-4000-8000-000000000011', 'C4', 'NUEVOS CONTRATOS', 'b2000000-0000-4000-8000-000000000002', 'CALIDAD', 'Captación comercial', 'N° contratos nuevos', 'MENSUAL', 'ASCENDENTE', 'COMERCIAL', 'Comercial'),
  ('c3000000-0000-4000-8000-000000000012', 'P1', 'CUMPLIMIENTO PROCESOS SIG', 'b2000000-0000-4000-8000-000000000003', 'SIG', 'Actividades SIG ejecutadas', '(Ejecutadas / Programadas) * 100', 'MENSUAL', 'ASCENDENTE', 'ADMIN', 'SIG'),
  ('c3000000-0000-4000-8000-000000000013', 'P2', 'NO CONFORMIDADES', 'b2000000-0000-4000-8000-000000000003', 'CALIDAD', 'NC abiertas en el periodo', 'N° no conformidades', 'MENSUAL', 'DESCENDENTE', 'ADMIN', 'SIG'),
  ('c3000000-0000-4000-8000-000000000014', 'P3', 'EFICACIA ACCIONES CORRECTIVAS', 'b2000000-0000-4000-8000-000000000003', 'CALIDAD', 'Acciones eficaces sobre cerradas', '(Eficaces / Cerradas) * 100', 'TRIMESTRAL', 'ASCENDENTE', 'ADMIN', 'SIG'),
  ('c3000000-0000-4000-8000-000000000015', 'I1', 'HORAS FORMACION', 'b2000000-0000-4000-8000-000000000004', 'SIG', 'Intensidad de capacitación', 'Horas formación / trabajador', 'MENSUAL', 'ASCENDENTE', 'GH', 'Gestión Humana'),
  ('c3000000-0000-4000-8000-000000000016', 'I2', 'COMPETENCIAS CRITICAS CUBIERTAS', 'b2000000-0000-4000-8000-000000000004', 'SIG', 'Cargos críticos con competencia', '(Cubiertos / Críticos) * 100', 'SEMESTRAL', 'ASCENDENTE', 'GH', 'Gestión Humana'),
  ('c3000000-0000-4000-8000-000000000017', 'I3', 'EVALUACION DE DESEMPEÑO', 'b2000000-0000-4000-8000-000000000004', 'SIG', 'Cobertura de evaluaciones', '(Evaluados / Planta) * 100', 'ANUAL', 'ASCENDENTE', 'GH', 'Gestión Humana'),
  ('c3000000-0000-4000-8000-000000000018', 'I4', 'INNOVACIONES IMPLEMENTADAS', 'b2000000-0000-4000-8000-000000000004', 'SIG', 'Mejoras puestas en marcha', 'N° innovaciones implementadas', 'SEMESTRAL', 'ASCENDENTE', 'ADMIN', 'SIG'),
  ('c3000000-0000-4000-8000-000000000019', 'O1', 'CUMPLIMIENTO PROGRAMACION', 'b2000000-0000-4000-8000-000000000006', 'SIG', 'Turnos cubiertos vs programados', '(Cubiertos / Programados) * 100', 'MENSUAL', 'ASCENDENTE', 'OPERACIONES', 'Operaciones'),
  ('c3000000-0000-4000-8000-00000000001a', 'O2', 'COBERTURA DE PUESTOS', 'b2000000-0000-4000-8000-000000000006', 'SIG', 'Puestos con personal asignado', '(Cubiertos / Contratados) * 100', 'MENSUAL', 'ASCENDENTE', 'OPERACIONES', 'Operaciones'),
  ('c3000000-0000-4000-8000-00000000001b', 'O3', 'NOVEDADES OPERATIVAS', 'b2000000-0000-4000-8000-000000000006', 'SIG', 'Novedades reportadas', 'N° novedades del periodo', 'MENSUAL', 'DESCENDENTE', 'OPERACIONES', 'Operaciones'),
  ('c3000000-0000-4000-8000-00000000001c', 'O4', 'TIEMPO RESPUESTA NOVEDAD', 'b2000000-0000-4000-8000-000000000006', 'SIG', 'Horas promedio de atención', 'Suma horas / N° novedades', 'MENSUAL', 'DESCENDENTE', 'OPERACIONES', 'Operaciones'),
  ('c3000000-0000-4000-8000-00000000001d', 'T1', 'CUMPLIMIENTO PESV', 'b2000000-0000-4000-8000-000000000007', 'PESV', 'Actividades del plan vial', '(Ejecutadas / Programadas) * 100', 'TRIMESTRAL', 'ASCENDENTE', 'SST', 'SST'),
  ('c3000000-0000-4000-8000-00000000001e', 'T2', 'SINIESTRALIDAD VIAL', 'b2000000-0000-4000-8000-000000000007', 'PESV', 'Accidentes viales del periodo', 'N° siniestros viales', 'MENSUAL', 'DESCENDENTE', 'SST', 'SST'),
  ('c3000000-0000-4000-8000-00000000001f', 'T3', 'CUMPLIMIENTO BASC', 'b2000000-0000-4000-8000-000000000007', 'BASC', 'Controles BASC ejecutados', '(Ejecutados / Programados) * 100', 'TRIMESTRAL', 'ASCENDENTE', 'ADMIN', 'SIG'),
  ('c3000000-0000-4000-8000-000000000020', 'T4', 'CUMPLIMIENTO SIPLAFT', 'b2000000-0000-4000-8000-000000000007', 'BASC', 'Reportes y debida diligencia', '(Ejecutados / Programados) * 100', 'MENSUAL', 'ASCENDENTE', 'ADMIN', 'Administrativo'),
  ('c3000000-0000-4000-8000-000000000021', 'T5', 'GESTION AMBIENTAL', 'b2000000-0000-4000-8000-000000000007', 'RSE', 'Actividades ambientales', '(Ejecutadas / Programadas) * 100', 'TRIMESTRAL', 'ASCENDENTE', 'ADMIN', 'SIG'),
  ('c3000000-0000-4000-8000-000000000022', 'T6', 'CONSUMO DE AGUA', 'b2000000-0000-4000-8000-000000000007', 'RSE', 'm3 consumidos', 'm3 del periodo', 'MENSUAL', 'DESCENDENTE', 'ADMIN', 'Administrativo'),
  ('c3000000-0000-4000-8000-000000000023', 'T7', 'CONSUMO DE ENERGIA', 'b2000000-0000-4000-8000-000000000007', 'RSE', 'kWh consumidos', 'kWh del periodo', 'MENSUAL', 'DESCENDENTE', 'ADMIN', 'Administrativo'),
  ('c3000000-0000-4000-8000-000000000024', 'T8', 'RESIDUOS APROVECHADOS', 'b2000000-0000-4000-8000-000000000007', 'RSE', 'Porcentaje aprovechado', '(Aprovechados / Generados) * 100', 'TRIMESTRAL', 'ASCENDENTE', 'ADMIN', 'SIG'),
  ('c3000000-0000-4000-8000-000000000025', 'T9', 'AUDITORIAS INTERNAS', 'b2000000-0000-4000-8000-000000000003', 'SIG', 'Auditorías ejecutadas vs plan', '(Ejecutadas / Plan) * 100', 'SEMESTRAL', 'ASCENDENTE', 'ADMIN', 'SIG'),
  ('c3000000-0000-4000-8000-000000000026', 'T10', 'CIERRE NO CONFORMIDADES', 'b2000000-0000-4000-8000-000000000003', 'CALIDAD', 'NC cerradas a tiempo', '(Cerradas a tiempo / Total) * 100', 'MENSUAL', 'ASCENDENTE', 'ADMIN', 'SIG'),
  ('c3000000-0000-4000-8000-000000000027', 'T11', 'ENTREGA INFORMES SIG', 'b2000000-0000-4000-8000-000000000003', 'SIG', 'Informes entregados a tiempo', '(A tiempo / Programados) * 100', 'MENSUAL', 'ASCENDENTE', 'ADMIN', 'SIG'),
  ('c3000000-0000-4000-8000-000000000028', 'T12', 'CUMPLIMIENTO LEGAL SST', 'b2000000-0000-4000-8000-000000000005', 'SST', 'Requisitos legales SST', '(Cumplidos / Aplicables) * 100', 'TRIMESTRAL', 'ASCENDENTE', 'SST', 'SST')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO sig_resultados (indicador_id, anio, periodo, meta_snapshot, valor_resultado, observaciones, color_semaforo, seguimiento, capturado_por)
SELECT i.id, 2026, x.periodo, x.meta, x.resultado, 'Dato de arranque MVP', x.color, 'ABIERTO', 'seed'
FROM sig_indicadores i
JOIN (VALUES
  ('H1', '01', 8::numeric, 6.5::numeric, 'AZUL'),
  ('H1', '02', 8, 9.2, 'AMARILLO'),
  ('H1', '03', 8, 11, 'ROJO'),
  ('S1', '01', 2, 1.2, 'AZUL'),
  ('S1', '02', 2, 2, 'VERDE'),
  ('S1', '03', 2, 2.4, 'ROJO'),
  ('C1', 'T1', 90, 92, 'VERDE'),
  ('O1', '01', 98, 99, 'VERDE'),
  ('O1', '02', 98, 96, 'AMARILLO'),
  ('E4', '01', 100, 101, 'VERDE')
) AS x(codigo, periodo, meta, resultado, color) ON x.codigo = i.codigo
ON CONFLICT (indicador_id, anio, periodo) DO NOTHING;
