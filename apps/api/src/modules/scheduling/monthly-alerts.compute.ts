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
  jornada?: string | null;
  documentNumber?: string | null;
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
  documentNumber?: string;
  role?: string;
  shift?: 'D' | 'N';
  otherPostId?: string;
  otherPostName?: string;
  reason?: string;
  suggestedAction?: string;
  message: string;
}

const NOVEDAD_JORNADAS = new Set([
  'incapacidad',
  'licencia',
  'vacacion',
  'suspension',
  'accidente',
]);

const NOVEDAD_CODIGOS = new Set(['IN', 'VAC', 'LIC', 'SUS', 'ACC']);

const DOW = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function isDayCode(codigo: string | null | undefined): boolean {
  const c = (codigo ?? '').toUpperCase();
  return c === 'D' || c === 'D8' || c === 'D9' || c === 'D12';
}

export function isNightCode(codigo: string | null | undefined): boolean {
  const c = (codigo ?? '').toUpperCase();
  return c === 'N' || c === 'N8' || c === 'N9' || c === 'N12';
}

/** Solo 12h: cuenta para tope >24. */
export function isTwelveHourCode(codigo: string | null | undefined): boolean {
  const c = (codigo ?? '').toUpperCase();
  return c === 'D' || c === 'N' || c === 'D12' || c === 'N12';
}

function fringeOf(codigo: string | null | undefined): 'D' | 'N' | null {
  if (isDayCode(codigo)) return 'D';
  if (isNightCode(codigo)) return 'N';
  return null;
}

function isNovedad(cell: AlertCellInput): boolean {
  if (cell.jornada && NOVEDAD_JORNADAS.has(cell.jornada)) return true;
  const c = (cell.codigo ?? '').toUpperCase();
  return NOVEDAD_CODIGOS.has(c);
}

function novedadLabel(cell: AlertCellInput): string {
  if (cell.jornada && NOVEDAD_JORNADAS.has(cell.jornada)) return cell.jornada;
  const c = (cell.codigo ?? '').toUpperCase();
  if (c === 'IN') return 'incapacidad';
  if (c === 'VAC') return 'vacaciones';
  if (c === 'LIC') return 'licencia';
  if (c === 'SUS') return 'suspensión';
  if (c === 'ACC') return 'accidente';
  return 'novedad';
}

function statusReason(status: AssociateStatusCode): string {
  if (status === 'VACACIONES') return 'vacaciones';
  if (status === 'SUSPENDIDO') return 'suspendido';
  if (status === 'RETIRADO') return 'retirado';
  if (status === 'INACTIVO') return 'inactivo';
  return status.toLowerCase();
}

function weekdayLabel(month: string, day: number): string {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return `día ${day}`;
  return `${DOW[new Date(y, m - 1, day).getDay()]} ${day}`;
}

function personLabel(cell: Pick<AlertCellInput, 'associateName' | 'documentNumber'>): string {
  const name = cell.associateName?.trim() || 'Asociado';
  return cell.documentNumber ? `${name} (CC ${cell.documentNumber})` : name;
}

function shiftWord(shift: 'D' | 'N'): string {
  return shift === 'D' ? 'diurno (D)' : 'nocturno (N)';
}

function isActiveCoverage(cell: AlertCellInput): boolean {
  if (!cell.associateId || isNovedad(cell)) return false;
  if (cell.associateStatus && cell.associateStatus !== 'ACTIVO') return false;
  return fringeOf(cell.codigo) !== null;
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

export type AlertPostInput = {
  postId: string;
  postName: string;
  /** false = activo sin cuadro este mes: una alerta, no D/N por día */
  scheduled?: boolean;
};

/** D8 sin noche → solo día. N8 sin día → solo noche. D/N 12h o desconocido → las dos. */
export function inferRequiredShifts(cells: AlertCellInput[]): { d: boolean; n: boolean } {
  let day8 = false;
  let night8 = false;
  let day12 = false;
  let night12 = false;
  for (const c of cells) {
    const code = (c.codigo ?? '').toUpperCase();
    if (code === 'D8') day8 = true;
    else if (code === 'N8') night8 = true;
    else if (code === 'D' || code === 'D9' || code === 'D12') day12 = true;
    else if (code === 'N' || code === 'N9' || code === 'N12') night12 = true;
  }
  if (day8 && !night8 && !day12 && !night12) return { d: true, n: false };
  if (night8 && !day8 && !day12 && !night12) return { d: false, n: true };
  return { d: true, n: true };
}

export function computeMonthlyAlerts(args: {
  month: string;
  daysInMonth: number;
  cells: AlertCellInput[];
  /** Puestos del mes (cuadros). Si se omite, se infieren solo de `cells`. */
  posts?: AlertPostInput[];
}): ScheduleAlertItem[] {
  const { month, daysInMonth, cells } = args;
  const alerts: ScheduleAlertItem[] = [];

  const postNames = new Map<string, string>();
  const postScheduled = new Map<string, boolean>();
  for (const p of args.posts ?? []) {
    postNames.set(p.postId, p.postName);
    if (p.scheduled !== undefined) postScheduled.set(p.postId, p.scheduled);
  }
  for (const c of cells) {
    if (!postNames.has(c.postId)) postNames.set(c.postId, c.postName);
  }
  const postIds = [...postNames.keys()];

  const cellsByPost = new Map<string, AlertCellInput[]>();
  for (const c of cells) {
    const list = cellsByPost.get(c.postId) ?? [];
    list.push(c);
    cellsByPost.set(c.postId, list);
  }

  const coverage = new Map<string, { d: boolean; n: boolean }>();
  for (const c of cells) {
    if (!isActiveCoverage(c)) continue;
    const fringe = fringeOf(c.codigo);
    if (!fringe) continue;
    const key = `${c.postId}|${c.day}`;
    const cur = coverage.get(key) ?? { d: false, n: false };
    if (fringe === 'D') cur.d = true;
    else cur.n = true;
    coverage.set(key, cur);
  }

  for (const postId of postIds) {
    const postName = postNames.get(postId) ?? postId;
    const postCells = cellsByPost.get(postId) ?? [];
    if (postScheduled.get(postId) === false && postCells.length === 0) {
      alerts.push({
        id: `hueco_cobertura:${month}:${postId}:sin_malla`,
        type: 'hueco_cobertura',
        severity: 'error',
        month,
        postId,
        postName,
        suggestedAction: `Abrir el cuadro de ${postName} y armar la programación del mes.`,
        message: `${postName} no tiene programación este mes.`,
      });
      continue;
    }
    const need = inferRequiredShifts(postCells);
    for (let day = 1; day <= daysInMonth; day++) {
      const cov = coverage.get(`${postId}|${day}`);
      const when = weekdayLabel(month, day);
      if (need.d && !cov?.d) {
        alerts.push({
          id: `hueco_cobertura:${month}:${postId}:${day}:D`,
          type: 'hueco_cobertura',
          severity: 'error',
          month,
          day,
          postId,
          postName,
          shift: 'D',
          suggestedAction: `Asignar un vigilante en turno diurno (D) en ${postName} el ${when}.`,
          message: `${postName} · ${when} · falta cobertura diurna (D). El puesto no tiene vigilante de día.`,
        });
      }
      if (need.n && !cov?.n) {
        alerts.push({
          id: `hueco_cobertura:${month}:${postId}:${day}:N`,
          type: 'hueco_cobertura',
          severity: 'error',
          month,
          day,
          postId,
          postName,
          shift: 'N',
          suggestedAction: `Asignar un vigilante en turno nocturno (N) en ${postName} el ${when}.`,
          message: `${postName} · ${when} · falta cobertura nocturna (N). El puesto no tiene vigilante de noche.`,
        });
      }
    }
  }

  for (const c of cells) {
    if (!c.associateId) continue;
    const novedad = isNovedad(c);
    const inactiveStatus = Boolean(c.associateStatus && c.associateStatus !== 'ACTIVO');
    const shift = fringeOf(c.codigo);
    if (!novedad && !inactiveStatus) continue;
    if (!novedad && !shift) continue;
    const reason = novedad ? novedadLabel(c) : statusReason(c.associateStatus!);
    const when = weekdayLabel(month, c.day);
    const who = personLabel(c);
    const shiftBit = shift ? ` · turno ${shiftWord(shift)}` : '';
    alerts.push({
      id: `asociado_inactivo:${month}:${c.postId}:${c.day}:${c.associateId}:${shift ?? 'NOV'}`,
      type: 'asociado_inactivo',
      severity: 'error',
      month,
      day: c.day,
      postId: c.postId,
      postName: c.postName,
      associateId: c.associateId,
      associateName: c.associateName ?? undefined,
      documentNumber: c.documentNumber ?? undefined,
      role: c.role,
      shift: shift ?? undefined,
      reason,
      suggestedAction: `Reasigne el ${when} en ${c.postName} (relevo u otro titular) para no dejar el puesto descubierto.`,
      message: `${who} quedó por ${reason} en ${c.postName} el ${when}${shiftBit}. Esa celda no cubre el puesto.`,
    });
  }

  type Key = string;
  const byFringe = new Map<Key, AlertCellInput[]>();
  for (const c of cells) {
    if (!c.associateId || isNovedad(c)) continue;
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
      const others = posts.filter((_, j) => j !== i);
      const b = others[0];
      const fringe = fringeOf(a.codigo)!;
      const otherNames = others.map((p) => p.postName).join(', ');
      const when = weekdayLabel(month, a.day);
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
        documentNumber: a.documentNumber ?? undefined,
        role: a.role,
        shift: fringe,
        otherPostId: b.postId,
        otherPostName: b.postName,
        reason: 'mismo día y mismo horario en dos puestos',
        suggestedAction:
          'Déjelo en un solo puesto ese día y horario; cubra el otro con otro vigilante o un relevo.',
        message: `${personLabel(a)} está el ${when} en turno ${shiftWord(fringe)} a la vez en «${a.postName}» y en «${otherNames}». Una persona no puede cubrir dos puestos al mismo tiempo.`,
      });
    }
  }

  const counts = new Map<
    string,
    { name: string | null; documentNumber: string | null; n: number; sample?: AlertCellInput }
  >();
  for (const c of cells) {
    if (!c.associateId || !isTwelveHourCode(c.codigo)) continue;
    const cur = counts.get(c.associateId) ?? {
      name: c.associateName,
      documentNumber: c.documentNumber ?? null,
      n: 0,
    };
    cur.n += 1;
    if (c.associateName) cur.name = c.associateName;
    if (c.documentNumber) cur.documentNumber = c.documentNumber;
    if (!cur.sample) cur.sample = c;
    counts.set(c.associateId, cur);
  }
  for (const [associateId, { name, documentNumber, n, sample }] of counts) {
    if (n <= 24) continue;
    alerts.push({
      id: `carga_sobre_24:${month}:${associateId}`,
      type: 'carga_sobre_24',
      severity: 'warning',
      month,
      postId: sample?.postId ?? '',
      postName: sample?.postName ?? '',
      associateId,
      associateName: name ?? undefined,
      documentNumber: documentNumber ?? undefined,
      suggestedAction: 'Revise recargos y redistribuya turnos de 12 h con otro vigilante.',
      message: `${personLabel({ associateName: name, documentNumber })}: ${n} turnos D/N (12 h) en el mes (tope orientativo 24).`,
    });
  }

  return alerts;
}

export function isActionableAlert(
  a: ScheduleAlertItem,
  today: { year: number; month: number; day: number },
): boolean {
  if (!a.day) return true;
  const [y, m] = a.month.split('-').map(Number);
  if (y !== today.year || m !== today.month) return true;
  return a.day >= today.day;
}

export interface HuecoGroup {
  postId: string;
  postName: string;
  month: string;
  daysD: number[];
  daysN: number[];
  count: number;
  firstDay: number;
  suggestedAction: string;
  /** sin_malla = puesto activo sin cuadro este mes */
  kind?: 'sin_malla' | 'sin_cobertura';
}

export function groupHuecosByPost(alerts: ScheduleAlertItem[]): HuecoGroup[] {
  const map = new Map<string, HuecoGroup>();
  for (const a of alerts) {
    if (a.type !== 'hueco_cobertura') continue;
    const key = `${a.month}|${a.postId}`;
    const kind: HuecoGroup['kind'] =
      a.reason === 'sin_malla' ? 'sin_malla' : 'sin_cobertura';
    const cur = map.get(key) ?? {
      postId: a.postId,
      postName: a.postName,
      month: a.month,
      daysD: [] as number[],
      daysN: [] as number[],
      count: 0,
      firstDay: a.day ?? 1,
      suggestedAction: a.suggestedAction ?? `Cubrir ${a.postName}.`,
      kind,
    };
    cur.count += 1;
    if (a.day) {
      if (a.shift === 'D' && !cur.daysD.includes(a.day)) cur.daysD.push(a.day);
      if (a.shift === 'N' && !cur.daysN.includes(a.day)) cur.daysN.push(a.day);
      if (a.day < cur.firstDay) cur.firstDay = a.day;
    }
    map.set(key, cur);
  }
  const groups = [...map.values()];
  for (const g of groups) {
    g.daysD.sort((x, y) => x - y);
    g.daysN.sort((x, y) => x - y);
    if (g.kind === 'sin_malla' && !g.daysD.length && !g.daysN.length) {
      g.suggestedAction = `Abrir el cuadro de ${g.postName} y armar la programación del mes.`;
    } else {
      g.suggestedAction = `Asignar cobertura en ${g.postName}: ${g.daysD.length} turno(s) diurno(s) y ${g.daysN.length} nocturno(s) sin cubrir.`;
    }
  }
  return groups.sort((a, b) => b.count - a.count || a.postName.localeCompare(b.postName));
}
