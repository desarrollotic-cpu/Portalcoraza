import { PostWorkFront } from '../entities/post-work-front.entity';

export interface WorkFrontsSummary {
  total: number;
  h24: number;
  h12: number;
  other: number;
  /** Ej. "2 × 24h + 1 × 12h" o "Horario variable". */
  label: string;
}

/** Resume frentes activos: totales y etiqueta legible para listados. */
export function summarizeWorkFronts(
  fronts: Pick<PostWorkFront, 'hours' | 'active'>[] | undefined | null,
): WorkFrontsSummary {
  const active = (fronts ?? []).filter((f) => f.active !== false);
  const h24 = active.filter((f) => f.hours === 24).length;
  const h12 = active.filter((f) => f.hours === 12).length;
  const other = active.length - h24 - h12;

  const parts: string[] = [];
  const byHours = new Map<number | 'var', number>();
  for (const f of active) {
    const key: number | 'var' = f.hours == null ? 'var' : f.hours;
    byHours.set(key, (byHours.get(key) ?? 0) + 1);
  }
  const ordered = [...byHours.entries()].sort((a, b) => {
    if (a[0] === 'var') return 1;
    if (b[0] === 'var') return -1;
    if (a[0] === 24) return -1;
    if (b[0] === 24) return 1;
    if (a[0] === 12) return -1;
    if (b[0] === 12) return 1;
    return Number(b[0]) - Number(a[0]);
  });
  for (const [hours, count] of ordered) {
    if (hours === 'var') {
      parts.push(count === 1 ? 'Horario variable' : `${count} × variable`);
    } else {
      parts.push(`${count} × ${hours}h`);
    }
  }

  return {
    total: active.length,
    h24,
    h12,
    other,
    label: parts.length ? parts.join(' + ') : '—',
  };
}
