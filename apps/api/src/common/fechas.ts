/**
 * Comprueba que un texto YYYY-MM-DD corresponde a un día que existe.
 *
 * Hace falta porque validar solo la forma con una expresión regular deja pasar
 * un 2026-02-31, y JavaScript no avisa: `new Date('2026-02-31')` no da Invalid
 * Date, desborda silenciosamente al 3 de marzo. El resultado es un informe de
 * otro día, o un error 500 cuando el valor llega a Postgres.
 */
export function esDiaValido(ymd: string | null | undefined): boolean {
  const raw = String(ymd ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;

  const [anio, mes, dia] = raw.split('-').map(Number);
  if (mes < 1 || mes > 12) return false;

  // Día 0 del mes siguiente = último día de este mes (bisiestos incluidos).
  const diasDelMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return dia >= 1 && dia <= diasDelMes;
}
