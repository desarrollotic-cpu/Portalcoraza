/** Meses del mismo año posteriores a `fromMonth` (1–12). */
export function remainingMonthsOfYear(fromMonth: number): number[] {
  if (fromMonth < 1 || fromMonth > 11) return [];
  return Array.from({ length: 12 - fromMonth }, (_, i) => fromMonth + 1 + i);
}

/**
 * ponytail: si el mes destino tiene más días, se recicla el patrón del mes origen.
 * Upgrade: continuidad de ciclo motor mes a mes.
 */
export function mapCopiedDay(destDay: number, sourceDays: number): number {
  if (sourceDays < 1) return destDay;
  return ((destDay - 1) % sourceDays) + 1;
}
