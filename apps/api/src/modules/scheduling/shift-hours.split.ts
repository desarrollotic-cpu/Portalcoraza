import { SHIFT_HOURS } from './monthly-alerts.compute';

/**
 * Reparto legal de las horas de un turno, derivado de `SHIFT_HOURS`.
 *
 * Antes la liquidación tenía la aritmética a mano y solo conocía D, N, D8 y N8:
 * cualquier otro código (N10 — que está en la barra de acciones rápidas del
 * cuadro —, D9, N9, D12, N12, 24H) caía en el `else` y se contaba como novedad
 * con 0 horas, aunque el panel de alertas sí lo contaba como hora trabajada.
 *
 * Franja nocturna: 21:00–06:00 (Ley 2101 de 2021).
 * Jornada ordinaria del turno: las primeras 8 horas; el resto es extra.
 */
export interface ShiftHoursSplit {
  /** Horas ordinarias (máximo 8 por turno). */
  ord: number;
  /** Horas extra en franja diurna. */
  extD: number;
  /** Horas ordinarias que caen en franja nocturna y llevan recargo. */
  recN: number;
  /** Horas extra en franja nocturna. */
  extN: number;
  /** Horas de domingo o festivo (absorben el turno completo). */
  dom: number;
}

const NOCHE_DESDE = 21;
const NOCHE_HASTA = 6;
const JORNADA_ORDINARIA = 8;

function esNocturna(hora: number): boolean {
  return hora >= NOCHE_DESDE || hora < NOCHE_HASTA;
}

/** `null` si el código no es un turno trabajado (descanso o novedad). */
export function splitShiftHours(
  codigo: string | null | undefined,
  isFestivo: boolean,
): ShiftHoursSplit | null {
  const horario = SHIFT_HOURS[(codigo ?? '').toUpperCase()];
  if (!horario) return null;

  const { start, hours } = horario;
  const ordinarias = Math.min(hours, JORNADA_ORDINARIA);

  let recN = 0;
  let extD = 0;
  let extN = 0;

  for (let i = 0; i < hours; i++) {
    const nocturna = esNocturna((start + i) % 24);
    const esExtra = i >= ordinarias;

    if (!esExtra) {
      if (nocturna) recN += 1;
    } else if (nocturna) {
      extN += 1;
    } else {
      extD += 1;
    }
  }

  // En domingo o festivo el turno completo se liquida en esa bolsa; el recargo
  // nocturno de las horas ordinarias se sigue reportando aparte.
  if (isFestivo) {
    return { ord: 0, extD: 0, recN, extN: 0, dom: hours };
  }

  return { ord: ordinarias, extD, recN, extN, dom: 0 };
}

/**
 * Horas realmente trabajadas que entran al total liquidable.
 * `recN` queda fuera a propósito: son horas que ya están contadas en `ord`,
 * se reportan aparte solo porque llevan recargo.
 */
export function horasLiquidables(s: ShiftHoursSplit): number {
  return s.ord + s.extD + s.extN + s.dom;
}

/** Descansos y novedades: no llevan horas. `R` es el código antiguo de `DR`. */
export const NON_WORK_CODES = ['DR', 'NR', 'R', 'VAC', 'LC', 'IN', 'SP', 'AC'] as const;

/**
 * Códigos que una celda puede tener. Hace el papel del `CHECK` que la columna
 * `schedule_assignments.codigo` no tiene: se valida en la aplicación para no
 * rechazar filas que ya estén grabadas con códigos históricos.
 */
export const SCHEDULE_CODES: ReadonlySet<string> = new Set([
  ...Object.keys(SHIFT_HOURS),
  ...NON_WORK_CODES,
]);

export function isKnownScheduleCode(codigo: string | null | undefined): boolean {
  if (codigo === null || codigo === undefined || codigo === '') return true; // celda vacía
  return SCHEDULE_CODES.has(codigo.toUpperCase());
}
