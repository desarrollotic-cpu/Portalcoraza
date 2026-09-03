/** Días del mes civil (1–12). Independiente de zona horaria ISO. */
export function daysInCalendarMonth(year: number, month: number): number {
  if (!year || month < 1 || month > 12) return 0;
  return new Date(year, month, 0).getDate();
}
