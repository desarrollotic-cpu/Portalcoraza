/** Umbral de prórroga en ausentismo: al día 180 la ficha queda marcada. */
export const PRORROGA_DAY_LIMIT = 180;

function parseYmd(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Días corridos de la prórroga, desde el inicio hasta hoy o hasta el fin, lo que llegue primero. */
export function prorrogaElapsedDays(startDate: string, endDate: string, today = new Date()): number {
  const start = parseYmd(startDate);
  const end = parseYmd(endDate);
  if (!start || !end || end < start) return 0;
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const until = todayStart < end ? todayStart : end;
  if (until < start) return 0;
  return Math.round((until.getTime() - start.getTime()) / 86400000) + 1;
}

export function prorrogaReached180(
  row: { isExtension?: boolean; startDate: string; endDate: string },
  today = new Date(),
): boolean {
  if (!row.isExtension) return false;
  return prorrogaElapsedDays(row.startDate, row.endDate, today) >= PRORROGA_DAY_LIMIT;
}
