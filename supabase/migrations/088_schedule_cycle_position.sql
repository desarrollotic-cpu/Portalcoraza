-- Posición real del ciclo del motor en cada celda del cuadro.
--
-- Antes de esta columna la continuidad entre meses se adivinaba con
-- `inferPosition`, que devuelve el PRIMER índice del ciclo cuyo código coincide.
-- Como el ciclo 12x3 tiene 6 posiciones con código `D` y 6 con `N`, 11 de las 15
-- posiciones posibles arrancaban el mes siguiente en el lugar equivocado: hasta
-- 11 días seguidos del mismo turno a caballo del cambio de mes, cuando el ciclo
-- no debe pasar de 6.
--
-- NULL = celda grabada antes de esta migración, o editada a mano sin fase
-- conocida. En ese caso se sigue usando la inferencia por código como respaldo.
ALTER TABLE schedule_assignments
  ADD COLUMN IF NOT EXISTS cycle_position INTEGER;

COMMENT ON COLUMN schedule_assignments.cycle_position IS
  'Fase del ciclo del motor en esa celda (0..totalDays-1). -1 = cubierta por un relevante (sin ciclo propio). NULL = desconocida.';
