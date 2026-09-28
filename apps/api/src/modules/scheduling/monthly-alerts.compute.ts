export type AlertType =
  | 'hueco_cobertura'
  | 'asociado_inactivo'
  | 'conflicto_mismo_turno'
  | 'descanso_insuficiente'
  /** Id histórico: hoy significa "horas del mes sobre el máximo" (todos los códigos). */
  | 'carga_sobre_24'
  /** Solo al guardar: cambios en días ya trabajados. */
  | 'edicion_dia_pasado'
  /** Programado en días con ausencia registrada en RRHH (incapacidad, licencia…). */
  | 'ausencia_rrhh';

/** Ausencia de RRHH recortada al mes (días 1..N). */
export interface AbsenceInput {
  associateId: string;
  fromDay: number;
  toDay: number;
  /** Ej. "incapacidad médica del 2026-09-10 al 2026-09-14". */
  label: string;
}

/**
 * Reglas del cuadro. Un solo lugar para cambiarlas (luego: `scheduling_settings` por tenant).
 * - min 210 h = jornada ordinaria legal mensual con 42 h/semana (Ley 2101, jul-2026).
 * - max 288 h = 24 turnos de 12 h (tope que ya usaba el portal).
 */
export interface SchedulingRules {
  minHorasMes: number;
  maxHorasMes: number;
  descansoMinHoras: number;
  /** Días con novedad (VAC/IN/LC…) bajan el mínimo en proporción. */
  novedadesReducenMinimo: boolean;
  /** Días sin turno para considerar a un vigilante "sin uso". */
  diasSinTurnoAlerta: number;
}

export const DEFAULT_SCHEDULING_RULES: SchedulingRules = {
  minHorasMes: 210,
  maxHorasMes: 288,
  descansoMinHoras: 8,
  novedadesReducenMinimo: true,
  diasSinTurnoAlerta: 15,
};

/**
 * Horario real por código: hora de inicio y duración. Fuente única para cruces,
 * descansos y horas del mes. D9/N9 no tienen horario en la UI: se asume 06–15 / 21–06.
 */
export const SHIFT_HOURS: Readonly<Record<string, { start: number; hours: number }>> = {
  D: { start: 6, hours: 12 },
  D12: { start: 6, hours: 12 },
  N: { start: 18, hours: 12 },
  N12: { start: 18, hours: 12 },
  D8: { start: 6, hours: 8 },
  N8: { start: 22, hours: 8 },
  N10: { start: 20, hours: 10 },
  D9: { start: 6, hours: 9 },
  N9: { start: 21, hours: 9 },
  '24': { start: 6, hours: 24 },
  '24H': { start: 6, hours: 24 },
};

/** Misma persona en dos turnos que se cruzan o sin descanso entre ellos. */
export function isDoubleBooking(type: AlertType): boolean {
  return type === 'conflicto_mismo_turno' || type === 'descanso_insuficiente';
}

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

/** Códigos de la UI (LC/SP/AC) + legado (LIC/SUS/ACC). */
export const NOVEDAD_CODIGOS = new Set(['IN', 'VAC', 'LC', 'SP', 'AC', 'LIC', 'SUS', 'ACC']);

const DOW = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function isDayCode(codigo: string | null | undefined): boolean {
  const c = (codigo ?? '').toUpperCase();
  return c === 'D' || c === 'D8' || c === 'D9' || c === 'D12';
}

export function isNightCode(codigo: string | null | undefined): boolean {
  const c = (codigo ?? '').toUpperCase();
  return c === 'N' || c === 'N8' || c === 'N9' || c === 'N10' || c === 'N12';
}

function fringeOf(codigo: string | null | undefined): 'D' | 'N' | null {
  if (isDayCode(codigo)) return 'D';
  if (isNightCode(codigo)) return 'N';
  return null;
}

export function isNovedad(cell: Pick<AlertCellInput, 'codigo' | 'jornada'>): boolean {
  if (cell.jornada && NOVEDAD_JORNADAS.has(cell.jornada)) return true;
  const c = (cell.codigo ?? '').toUpperCase();
  return NOVEDAD_CODIGOS.has(c);
}

function novedadLabel(cell: AlertCellInput): string {
  if (cell.jornada && NOVEDAD_JORNADAS.has(cell.jornada)) return cell.jornada;
  const c = (cell.codigo ?? '').toUpperCase();
  if (c === 'IN') return 'incapacidad';
  if (c === 'VAC') return 'vacaciones';
  if (c === 'LC' || c === 'LIC') return 'licencia';
  if (c === 'SP' || c === 'SUS') return 'suspensión';
  if (c === 'AC' || c === 'ACC') return 'accidente';
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
    else if (code === 'N8' || code === 'N10') night8 = true;
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
  rules?: Partial<SchedulingRules>;
  /** Ausencias registradas en RRHH (Ausentismo) que tocan el mes. */
  absences?: AbsenceInput[];
}): ScheduleAlertItem[] {
  const { month, daysInMonth, cells } = args;
  const rules = { ...DEFAULT_SCHEDULING_RULES, ...args.rules };
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

  // Ausentismo RRHH: una alerta por persona, puesto y ausencia, con los días afectados.
  if (args.absences?.length) {
    const absByAssociate = new Map<string, AbsenceInput[]>();
    for (const ab of args.absences) {
      absByAssociate.set(ab.associateId, [...(absByAssociate.get(ab.associateId) ?? []), ab]);
    }
    const hits = new Map<string, { ab: AbsenceInput; cell: AlertCellInput; days: number[] }>();
    for (const c of cells) {
      if (!c.associateId || isNovedad(c) || !SHIFT_HOURS[(c.codigo ?? '').toUpperCase()]) continue;
      for (const ab of absByAssociate.get(c.associateId) ?? []) {
        if (c.day < ab.fromDay || c.day > ab.toDay) continue;
        const key = `${c.associateId}|${c.postId}|${ab.fromDay}|${ab.toDay}`;
        const cur = hits.get(key) ?? { ab, cell: c, days: [] };
        if (!cur.days.includes(c.day)) cur.days.push(c.day);
        hits.set(key, cur);
      }
    }
    for (const { ab, cell, days } of hits.values()) {
      days.sort((a, b) => a - b);
      const last = days[days.length - 1];
      alerts.push({
        id: `ausencia_rrhh:${month}:${cell.associateId}:${cell.postId}:${ab.fromDay}-${ab.toDay}`,
        type: 'ausencia_rrhh',
        severity: 'error',
        month,
        // Último día afectado: la alerta sigue visible mientras quede alguno por delante.
        day: last,
        postId: cell.postId,
        postName: cell.postName,
        associateId: cell.associateId!,
        associateName: cell.associateName ?? undefined,
        documentNumber: cell.documentNumber ?? undefined,
        role: cell.role,
        reason: ab.label,
        suggestedAction: `Reasigne esos turnos a otro vigilante y marque la novedad (IN, VAC, LC…) en el cuadro de ${cell.postName}.`,
        message: `RRHH tiene registrada ${ab.label}, pero ${personLabel(cell)} está programado en «${cell.postName}» los días ${days.join(', ')}. Esos turnos no se van a cumplir.`,
      });
    }
  }

  // Turnos por persona en horario real (cruzan medianoche): cruces, descansos y horas.
  type Shift = { cell: AlertCellInput; start: number; end: number };
  const shiftsByAssociate = new Map<string, Shift[]>();
  for (const c of cells) {
    if (!c.associateId || isNovedad(c)) continue;
    const h = SHIFT_HOURS[(c.codigo ?? '').toUpperCase()];
    if (!h) continue;
    const start = (c.day - 1) * 24 + h.start;
    const list = shiftsByAssociate.get(c.associateId) ?? [];
    list.push({ cell: c, start, end: start + h.hours });
    shiftsByAssociate.set(c.associateId, list);
  }

  for (const [associateId, list] of shiftsByAssociate) {
    list.sort((x, y) => x.start - y.start || x.end - y.end);
    const overlaps = new Map<Shift, Shift[]>();
    let latest: Shift | null = null;
    for (let i = 0; i < list.length; i++) {
      const cur = list[i];
      for (let j = i + 1; j < list.length && list[j].start < cur.end; j++) {
        overlaps.set(cur, [...(overlaps.get(cur) ?? []), list[j]]);
        overlaps.set(list[j], [...(overlaps.get(list[j]) ?? []), cur]);
      }
      if (latest && cur.start >= latest.end) {
        const gap = cur.start - latest.end;
        if (gap < rules.descansoMinHoras) alerts.push(restAlert(month, latest, cur, gap, rules));
      }
      if (!latest || cur.end > latest.end) latest = cur;
    }
    for (const [s, others] of overlaps) alerts.push(conflictAlert(month, s, others));

    const hours = list.reduce((sum, s) => sum + (s.end - s.start), 0);
    if (hours <= rules.maxHorasMes) continue;
    const sample = list.find((s) => s.cell.associateName)?.cell ?? list[0].cell;
    alerts.push({
      id: `carga_sobre_24:${month}:${associateId}`,
      type: 'carga_sobre_24',
      severity: 'error',
      month,
      postId: sample.postId,
      postName: sample.postName,
      associateId,
      associateName: sample.associateName ?? undefined,
      documentNumber: sample.documentNumber ?? undefined,
      reason: `${hours} h programadas; máximo ${rules.maxHorasMes} h`,
      suggestedAction: `Quite ${hours - rules.maxHorasMes} h: pase turnos a un vigilante que esté bajo el mínimo o a un relevante.`,
      message: `${personLabel(sample)}: ${hours} h programadas en el mes, sobre el máximo de ${rules.maxHorasMes} h (sobran ${hours - rules.maxHorasMes} h).`,
    });
  }

  return alerts;
}

function shiftSpan(codigo: string | null): string {
  const c = (codigo ?? '').toUpperCase();
  const h = SHIFT_HOURS[c];
  if (!h) return c;
  const hh = (n: number) => `${String(n % 24).padStart(2, '0')}:00`;
  return `${c} (${hh(h.start)}–${hh(h.start + h.hours)})`;
}

function conflictAlert(
  month: string,
  s: { cell: AlertCellInput },
  others: Array<{ cell: AlertCellInput }>,
): ScheduleAlertItem {
  const a = s.cell;
  const b = others.find((o) => o.cell.postId !== a.postId)?.cell ?? others[0].cell;
  const samePost = others.every((o) => o.cell.postId === a.postId);
  const otherNames = [...new Set(others.map((o) => o.cell.postName))].join(', ');
  const where = samePost
    ? `dos veces en «${a.postName}» (roles ${[a.role, ...others.map((o) => o.cell.role)].join(', ')})`
    : `a la vez en «${a.postName}» y en «${otherNames}»`;
  return {
    id: `conflicto_mismo_turno:${month}:${a.associateId}:${a.day}:${(a.codigo ?? '').toUpperCase()}:${a.postId}:${a.role}`,
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
    shift: fringeOf(a.codigo) ?? undefined,
    otherPostId: b.postId,
    otherPostName: b.postName,
    reason: 'turnos que se cruzan en horario',
    suggestedAction:
      'Déjelo en un solo puesto en ese horario; cubra el otro con otro vigilante o un relevo.',
    message: `${personLabel(a)} está el ${weekdayLabel(month, a.day)} en ${shiftSpan(a.codigo)} ${where}. Una persona no puede cubrir dos turnos al mismo tiempo.`,
  };
}

function restAlert(
  month: string,
  prev: { cell: AlertCellInput; start: number },
  cur: { cell: AlertCellInput; end: number },
  gap: number,
  rules: SchedulingRules,
): ScheduleAlertItem {
  const p = prev.cell;
  const c = cur.cell;
  const from = `«${p.postName}» (${shiftSpan(p.codigo)}, ${weekdayLabel(month, p.day)})`;
  const to = `«${c.postName}» (${shiftSpan(c.codigo)}, ${weekdayLabel(month, c.day)})`;
  return {
    id: `descanso_insuficiente:${month}:${c.associateId}:${c.day}:${c.postId}:${c.role}`,
    type: 'descanso_insuficiente',
    severity: 'error',
    month,
    day: c.day,
    postId: c.postId,
    postName: c.postName,
    associateId: c.associateId!,
    associateName: c.associateName ?? undefined,
    documentNumber: c.documentNumber ?? undefined,
    role: c.role,
    shift: fringeOf(c.codigo) ?? undefined,
    otherPostId: p.postId,
    otherPostName: p.postName,
    reason: gap === 0 ? 'turnos seguidos sin descanso' : `solo ${gap} h de descanso`,
    suggestedAction: `Cambie uno de los dos turnos: entre turnos deben quedar al menos ${rules.descansoMinHoras} h de descanso.`,
    message:
      gap === 0
        ? `${personLabel(c)} sale de ${from} y entra directo a ${to}: ${cur.end - prev.start} h seguidas sin descanso.`
        : `${personLabel(c)} sale de ${from} y entra a ${to} con solo ${gap} h de descanso (mínimo ${rules.descansoMinHoras} h).`,
  };
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
