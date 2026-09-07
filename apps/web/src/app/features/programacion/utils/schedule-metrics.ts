/** Códigos que no son turno trabajado (descanso / novedad). */
const REST = new Set(['DR', 'NR', 'VAC', 'VC', 'LC', 'IN', 'SP', 'AC', 'R']);

export type GuardMetrics = {
  dias: number;
  turnosD: number;
  turnosN: number;
  totalHoras: number;
};

export function hoursBetween(inicio: string | null | undefined, fin: string | null | undefined): number | null {
  if (!inicio || !fin) return null;
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fin.split(':').map(Number);
  if ([h1, m1, h2, m2].some((n) => Number.isNaN(n))) return null;
  let mins = h2 * 60 + m2 - (h1 * 60 + m1);
  if (mins <= 0) mins += 24 * 60;
  return mins / 60;
}

function defaultHours(codigo: string): number {
  if (codigo === 'D8' || codigo === 'N8') return 8;
  if (codigo === 'D9' || codigo === 'N9') return 9;
  if (codigo === 'D10' || codigo === 'N10') return 10;
  return 12;
}

/** Día trabajado: D/N (8/9/10/12). No cuenta DR/NR/VAC. */
export function workShift(
  codigo: string | null | undefined,
  inicio?: string | null,
  fin?: string | null,
): { fringe: 'D' | 'N'; hours: number } | null {
  const c = (codigo ?? '').trim().toUpperCase();
  if (!c || REST.has(c)) return null;
  const fringe: 'D' | 'N' | null = c.startsWith('D') ? 'D' : c.startsWith('N') ? 'N' : null;
  if (!fringe) return null;
  const fromClock = hoursBetween(inicio, fin);
  return { fringe, hours: fromClock ?? defaultHours(c) };
}

export function guardMetrics(
  cells: Array<{ codigo: string | null; inicio?: string | null; fin?: string | null }>,
): GuardMetrics {
  let dias = 0;
  let turnosD = 0;
  let turnosN = 0;
  let totalHoras = 0;
  for (const cell of cells) {
    const w = workShift(cell.codigo, cell.inicio, cell.fin);
    if (!w) continue;
    dias += 1;
    if (w.fringe === 'D') turnosD += 1;
    else turnosN += 1;
    totalHoras += w.hours;
  }
  return { dias, turnosD, turnosN, totalHoras };
}
