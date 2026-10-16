/** Meses del mismo año posteriores a `fromMonth` (1–12). */
export function remainingMonthsOfYear(fromMonth: number): number[] {
  if (fromMonth < 1 || fromMonth > 11) return [];
  return Array.from({ length: 12 - fromMonth }, (_, i) => fromMonth + 1 + i);
}

// `mapCopiedDay` se retiró al pasar «Aplicar a los siguientes meses» de copiar el
// patrón del mes a encadenar el motor: reciclar los días reiniciaba el ciclo.
