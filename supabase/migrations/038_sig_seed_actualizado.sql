-- 038_sig_seed_actualizado.sql
-- Actualiza el catálogo SIG eliminando SST (T1-T23) y PESV.
-- Conserva grupos: E (SARLAFT), H (RRHH), S (SIG+Ambiental),
--                  C (Clientes), P (Procesos), I (Informática), O (Operación)

-- 1. Inactivar indicadores SST y PESV existentes (subsistema SST, PESV, RSE que son viales)
UPDATE sig_indicadores
SET activo = FALSE
WHERE subsistema IN ('SST', 'PESV', 'RSE')
  OR codigo IN ('T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12');

-- 2. Añadir los indicadores del Excel que aún no existan
-- Grupo E — SARLAFT / Estratégico
INSERT INTO sig_indicadores (codigo, nombre, objetivo_id, subsistema, proposito, formula, frecuencia, sentido, area, responsable)
SELECT 'E-SARLAFT', 'CONTROLES SARLAFT',
  (SELECT id FROM sig_objetivos WHERE objetivo_texto ILIKE '%BASC%' LIMIT 1),
  'BASC',
  'Verificación controles SARLAFT ejecutados vs programados',
  '(Controles ejecutados / Controles programados) * 100',
  'TRIMESTRAL', 'ASCENDENTE', 'ADMIN', 'Administrativo'
WHERE NOT EXISTS (SELECT 1 FROM sig_indicadores WHERE codigo = 'E-SARLAFT');

-- Grupo H — Humano / RRHH (ya existen H1-H4 en el seed base, solo aseguramos)
UPDATE sig_indicadores SET activo = TRUE WHERE codigo IN ('H1','H2','H3','H4') AND activo = FALSE;

-- Grupo S — SIG + Ambiental (renombramos para que no se confundan con SST)
INSERT INTO sig_indicadores (codigo, nombre, objetivo_id, subsistema, proposito, formula, frecuencia, sentido, area, responsable)
SELECT 'SIG-S3', 'EFICACIA DE LAS ACCIONES (SIG)',
  (SELECT id FROM sig_objetivos WHERE objetivo_texto ILIKE '%eficacia%' LIMIT 1),
  'SIG', 'Acciones correctivas eficaces sobre cerradas',
  '(Acciones eficaces / Acciones cerradas) * 100',
  'TRIMESTRAL', 'ASCENDENTE', 'ADMIN', 'SIG'
WHERE NOT EXISTS (SELECT 1 FROM sig_indicadores WHERE codigo = 'SIG-S3');

INSERT INTO sig_indicadores (codigo, nombre, objetivo_id, subsistema, proposito, formula, frecuencia, sentido, area, responsable)
SELECT 'SIG-S4', 'ACTIVIDADES CULTURA AMBIENTAL',
  (SELECT id FROM sig_objetivos WHERE objetivo_texto ILIKE '%eficacia%' LIMIT 1),
  'SIG', 'Actividades de cultura ambiental efectivas realizadas',
  '(Actividades realizadas / Actividades programadas) * 100',
  'TRIMESTRAL', 'ASCENDENTE', 'ADMIN', 'SIG'
WHERE NOT EXISTS (SELECT 1 FROM sig_indicadores WHERE codigo = 'SIG-S4');

INSERT INTO sig_indicadores (codigo, nombre, objetivo_id, subsistema, proposito, formula, frecuencia, sentido, area, responsable)
SELECT 'SIG-S5', 'CONTROLES AMBIENTALES',
  (SELECT id FROM sig_objetivos WHERE objetivo_texto ILIKE '%eficacia%' LIMIT 1),
  'SIG', 'Controles ambientales implementados',
  '(Controles implementados / Controles requeridos) * 100',
  'TRIMESTRAL', 'ASCENDENTE', 'ADMIN', 'SIG'
WHERE NOT EXISTS (SELECT 1 FROM sig_indicadores WHERE codigo = 'SIG-S5');

-- Grupos C, P ya existen (C1-C4, P1-P3), asegurar activos
UPDATE sig_indicadores SET activo = TRUE WHERE codigo IN ('C1','C2','C3','C4','P1','P2','P3') AND activo = FALSE;

-- Grupo I — Seguridad Informática (renombramos los I existentes)
UPDATE sig_indicadores SET nombre = 'CUMPLIMIENTO POLÍTICA SEGURIDAD INFORMÁTICA', responsable = 'TI'
WHERE codigo = 'I1';
UPDATE sig_indicadores SET nombre = 'COBERTURA PROGRAMA CIBERSEGURIDAD', responsable = 'TI'
WHERE codigo = 'I2';
UPDATE sig_indicadores SET nombre = 'EFICACIA PROGRAMA CIBERSEGURIDAD', responsable = 'TI'
WHERE codigo = 'I3';
UPDATE sig_indicadores SET nombre = 'CONTROLES DE SEGURIDAD INFORMÁTICA', responsable = 'TI'
WHERE codigo = 'I4';
UPDATE sig_indicadores SET activo = TRUE WHERE codigo IN ('I1','I2','I3','I4') AND activo = FALSE;

-- Grupo O — Operación (alineamos con el Excel)
UPDATE sig_indicadores SET nombre = 'DÍAS EN ATENCIÓN DE Q&R'          WHERE codigo = 'O1';
UPDATE sig_indicadores SET nombre = 'Q&R POR INCUMPLIMIENTO OPERACIÓN'  WHERE codigo = 'O2';
UPDATE sig_indicadores SET nombre = 'SUPERVISIÓN EFECTIVA'              WHERE codigo = 'O3';
UPDATE sig_indicadores SET nombre = 'SINIESTRALIDAD'                    WHERE codigo = 'O4';
UPDATE sig_indicadores SET activo = TRUE WHERE codigo IN ('O1','O2','O3','O4') AND activo = FALSE;
