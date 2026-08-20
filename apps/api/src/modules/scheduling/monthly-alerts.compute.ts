export type AlertType =
  | 'hueco_cobertura'
  | 'asociado_inactivo'
  | 'conflicto_mismo_turno'
  | 'carga_sobre_24';

export type AlertSeverity = 'error' | 'warning';

export type AssociateStatusCode =
  | 'ACTIVO'
  | 'INACTIVO'
  | 'SUSPENDIDO'
  | 'VACACIONES'
  | 'RETIRADO';

export interface AlertCellInput {
  postId: string;
  postName: string;
  day: number;
  role: string;
  associateId: string | null;
  associateName: string | null;
  associateStatus: AssociateStatusCode | null;
  codigo: string | null;
}

export interface ScheduleAlertItem {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  month: string;
  day?: number;
  postId: string;
  postName: string;
  associateId?: string;
  associateName?: string;
  shift?: 'D' | 'N';
  otherPostId?: string;
  otherPostName?: string;
  message: string;
}

export function isDayCode(codigo: string | null | undefined): boolean {
  return codigo === 'D' || codigo === 'D8';
}

export function isNightCode(codigo: string | null | undefined): boolean {
  return codigo === 'N' || codigo === 'N8';
}

/** Solo 12h: cuenta para tope >24. */
export function isTwelveHourCode(codigo: string | null | undefined): boolean {
  return codigo === 'D' || codigo === 'N';
}

function fringeOf(codigo: string | null | undefined): 'D' | 'N' | null {
  if (isDayCode(codigo)) return 'D';
  if (isNightCode(codigo)) return 'N';
  return null;
}

function isActiveCoverage(cell: AlertCellInput): boolean {
  return cell.associateStatus === 'ACTIVO' && fringeOf(cell.codigo) !== null;
}

/**
 * Meses a consultar según scope y fecha "hoy" (Bogotá ya convertida a y/m/d).
 */
export function monthsForAlertsScope(opts: {
  scope: 'current' | 'next' | 'auto';
  year: number;
  month: number;
  todayYear: number;
  todayMonth: number;
  todayDay: number;
}): Array<{ year: number; month: number }> {
  const { scope, year, month, todayYear, todayMonth, todayDay } = opts;
  if (scope === 'current') return [{ year, month }];
  if (scope === 'next') {
    const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
    return [next];
  }
  const list = [{ year, month }];
  const isCurrentMonth = year === todayYear && month === todayMonth;
  if (isCurrentMonth && todayDay >= 20) {
    list.push(month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 });
  }
  return list;
}

export function computeMonthlyAlerts(args: {
  month: string;
  daysInMonth: number;
  cells: AlertCellInput[];
}): ScheduleAlertItem[] {
  const { month, daysInMonth, cells } = args;
  const alerts: ScheduleAlertItem[] = [];

  const postNames = new Map<string, string>();
  for (const c of cells) {
    if (!postNames.has(c.postId)) postNames.set(c.postId, c.postName);
  }
  const postIds = [...postNames.keys()];

  // 1) Huecos: puestos con al menos una celda en el mes → cubrir todos los días
  for (const postId of postIds) {
    const postName = postNames.get(postId) ?? postId;
    for (let day = 1; day <= daysInMonth; day++) {
      const dayCells = cells.filter((c) => c.postId === postId && c.day === day);
      const hasActiveDay = dayCells.some((c) => isActiveCoverage(c) && fringeOf(c.codigo) === 'D');
      const hasActiveNight = dayCells.some((c) => isActiveCoverage(c) && fringeOf(c.codigo) === 'N');

      if (!hasActiveDay) {
        alerts.push({
          id: `hueco_cobertura:${month}:${postId}:${day}:D`,
          type: 'hueco_cobertura',
          severity: 'error',
          month,
          day,
          postId,
          postName,
          shift: 'D',
          message: `${postName} · día ${day} · falta cobertura diurna (D)`,
        });
      }
      if (!hasActiveNight) {
        alerts.push({
          id: `hueco_cobertura:${month}:${postId}:${day}:N`,
          type: 'hueco_cobertura',
          severity: 'error',
          month,
          day,
          postId,
          postName,
          shift: 'N',
          message: `${postName} · día ${day} · falta cobertura nocturna (N)`,
        });
      }
    }
  }

  // 2) Inactivos programados
  for (const c of cells) {
    if (!c.associateId || !fringeOf(c.codigo)) continue;
    if (!c.associateStatus || c.associateStatus === 'ACTIVO') continue;
    const shift = fringeOf(c.codigo)!;
    alerts.push({
      id: `asociado_inactivo:${month}:${c.postId}:${c.day}:${c.associateId}:${shift}`,
      type: 'asociado_inactivo',
      severity: 'error',
      month,
      day: c.day,
      postId: c.postId,
      postName: c.postName,
      associateId: c.associateId,
      associateName: c.associateName ?? undefined,
      shift,
      message: `${c.associateName ?? 'Asociado'} (${c.associateStatus}) programado en ${c.postName} · día ${c.day} · turno ${shift} — hay que cubrir el puesto`,
    });
  }

  // 3) Conflictos mismo día + misma franja en dos puestos
  type Key = string;
  const byFringe = new Map<Key, AlertCellInput[]>();
  for (const c of cells) {
    if (!c.associateId) continue;
    const fringe = fringeOf(c.codigo);
    if (!fringe) continue;
    const key = `${c.associateId}|${c.day}|${fringe}`;
    const list = byFringe.get(key) ?? [];
    list.push(c);
    byFringe.set(key, list);
  }
  for (const [, list] of byFringe) {
    const uniquePosts = new Map<string, AlertCellInput>();
    for (const c of list) {
      if (!uniquePosts.has(c.postId)) uniquePosts.set(c.postId, c);
    }
    if (uniquePosts.size < 2) continue;
    const posts = [...uniquePosts.values()];
    for (let i = 0; i < posts.length; i++) {
      const a = posts[i];
      const b = posts[i === 0 ? 1 : 0];
      const fringe = fringeOf(a.codigo)!;
      alerts.push({
        id: `conflicto_mismo_turno:${month}:${a.associateId}:${a.day}:${fringe}:${a.postId}`,
        type: 'conflicto_mismo_turno',
        severity: 'error',
        month,
        day: a.day,
        postId: a.postId,
        postName: a.postName,
        associateId: a.associateId!,
        associateName: a.associateName ?? undefined,
        shift: fringe,
        otherPostId: b.postId,
        otherPostName: b.postName,
        message: `${a.associateName ?? 'Asociado'} está programado el mismo día ${a.day} y turno ${fringe} en ${a.postName} y en ${b.postName}`,
      });
    }
  }

  // 4) Carga >24 (solo D/N)
  const counts = new Map<string, { name: string | null; n: number }>();
  for (const c of cells) {
    if (!c.associateId || !isTwelveHourCode(c.codigo)) continue;
    const cur = counts.get(c.associateId) ?? { name: c.associateName, n: 0 };
    cur.n += 1;
    if (c.associateName) cur.name = c.associateName;
    counts.set(c.associateId, cur);
  }
  for (const [associateId, { name, n }] of counts) {
    if (n <= 24) continue;
    // postId del primer cell del associate para anclar el ítem
    const sample = cells.find((c) => c.associateId === associateId && isTwelveHourCode(c.codigo));
    alerts.push({
      id: `carga_sobre_24:${month}:${associateId}`,
      type: 'carga_sobre_24',
      severity: 'warning',
      month,
      postId: sample?.postId ?? '',
      postName: sample?.postName ?? '',
      associateId,
      associateName: name ?? undefined,
      message: `${name ?? 'Asociado'}: ${n} turnos D/N (12 h) en el mes (tope orientativo 24)`,
    });
  }

  return alerts;
}
