/** Fecha suelta de recepción: YYYY-MM-DD o DD/MM/YYYY (también - y .). */
export function parseLooseDate(raw: string | null | undefined): Date | null {
  const t = String(raw ?? '').trim();
  if (!t) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (m) return validDate(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(t);
  if (m) return validDate(+m[3], +m[2], +m[1]);
  return null;
}

/** Tiempo de contrato/otrosí a partir de inicio y fin. Vacío si no se puede calcular. */
export function formatContractTerm(
  startRaw: string | null | undefined,
  endRaw: string | null | undefined,
): string {
  const start = parseLooseDate(startRaw);
  const end = parseLooseDate(endRaw);
  if (!start || !end || end < start) return '';

  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  if (start.getDate() === 1 && isLastDayOfMonth(end)) {
    months += 1;
  } else if (end.getDate() < start.getDate()) {
    months -= 1;
  }

  if (months <= 0) {
    const days = inclusiveDays(start, end);
    return days === 1 ? '1 DÍA' : `${days} DÍAS`;
  }

  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years && !rem) {
    if (years === 1) return '12 MESES';
    if (years === 2) return '24 MESES';
    if (years === 3) return '36 MESES';
    return `${years} AÑOS`;
  }
  const parts: string[] = [];
  if (years) parts.push(years === 1 ? '1 AÑO' : `${years} AÑOS`);
  if (rem) parts.push(rem === 1 ? '1 MES' : `${rem} MESES`);
  return parts.join(' ');
}

function validDate(y: number, m: number, d: number): Date | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return null;
  }
  return dt;
}

function isLastDayOfMonth(d: Date): boolean {
  return d.getDate() === new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function inclusiveDays(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}
