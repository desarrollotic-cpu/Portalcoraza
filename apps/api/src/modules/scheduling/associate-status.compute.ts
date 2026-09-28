import {
  DEFAULT_SCHEDULING_RULES,
  SHIFT_HOURS,
  SchedulingRules,
  isNovedad,
} from './monthly-alerts.compute';

/** Estado de Vigilantes: horas del mes por asociado (todos sus puestos) contra las reglas. */

export type AssociateLoadStatus =
  | 'bajo_minimo'
  | 'en_rango'
  | 'sobre_maximo'
  | 'sin_programar'
  | 'con_novedad';

export interface StatusAssociateInput {
  id: string;
  name: string;
  documentNumber: string | null;
  cargo: string | null;
}

export interface StatusCellInput {
  associateId: string;
  postId: string;
  postName: string;
  day: number;
  role: string;
  codigo: string | null;
  jornada?: string | null;
}

export interface AssociateLoadRow {
  associateId: string;
  name: string;
  documentNumber: string | null;
  cargo: string | null;
  puestos: string[];
  rol: 'titular' | 'relevante' | 'mixto' | null;
  turnos: number;
  horas: number;
  diasNovedad: number;
  minimo: number;
  maximo: number;
  /** horas − mínimo (negativo = faltan horas). */
  diferencia: number;
  /** % del mínimo cumplido (100 si el mínimo es 0). */
  cumplimiento: number;
  estado: AssociateLoadStatus;
  /** Último turno trabajado (YYYY-MM-DD) hasta la fecha de corte, en cualquier mes. */
  ultimoTurno: string | null;
  diasSinTurno: number | null;
  /** Huecos del mes que podría cubrir (sin cruces, con descanso, sin pasar el máximo). */
  sugerencias: ShiftSuggestion[];
}

/** Turno sin cubrir de un puesto (día abierto). */
export interface GapInput {
  postId: string;
  postName: string;
  day: number;
  shift: 'D' | 'N';
}

export type ShiftSuggestion = GapInput;

export interface AssociatesStatusResult {
  year: number;
  month: number;
  rules: SchedulingRules;
  kpis: {
    vigilantesActivos: number;
    programados: number;
    sinProgramar: number;
    bajoMinimo: number;
    enRango: number;
    sobreMaximo: number;
    conNovedad: number;
    sinUso: number;
    horasProgramadas: number;
    horasFaltantes: number;
    /** Turnos sin cubrir en días abiertos del mes (puestos con cuadro). */
    huecosAbiertos: number;
    /** De esos huecos, cuántos se pueden cubrir con personal bajo el mínimo. */
    huecosCubribles: number;
  };
  capacidad: {
    puestosActivos: number;
    puestosConCuadro: number;
    rolesRequeridos: number;
    vigilantesActivos: number;
    /** vigilantes activos − roles requeridos (positivo = sobran). */
    diferencia: number;
  };
  relevantes: {
    total: number;
    unSoloPuesto: number;
    horasPromedio: number;
    bajoMinimo: number;
    /** Relevantes de un solo puesto bajo el mínimo que se liberarían agrupándolos de a 2 puestos. */
    liberablesEstimado: number;
  };
  rows: AssociateLoadRow[];
}

const isRelevante = (role: string) => /^relev/i.test(role.trim());

function daysBetween(fromIso: string, toIso: string): number {
  const ms = Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000));
}

const GAP_HOURS = { D: { start: 6, hours: 12 }, N: { start: 18, hours: 12 } } as const;

/**
 * Reparte huecos entre quienes están bajo el mínimo o sin programar (más faltante primero).
 * Cada hueco se sugiere a una sola persona; se respetan cruces, descanso, máximo y novedades.
 * Prioriza puestos donde la persona ya trabaja. Devuelve cuántos huecos quedaron sugeridos.
 */
function assignGaps(
  rows: AssociateLoadRow[],
  cellsByAssociate: Map<string, StatusCellInput[]>,
  gaps: GapInput[],
  rules: SchedulingRules,
): number {
  if (!gaps.length) return 0;
  const taken = new Set<GapInput>();
  const sortedGaps = [...gaps].sort((a, b) => a.day - b.day || (a.shift < b.shift ? -1 : 1));
  const candidates = rows
    .filter((r) => r.estado === 'bajo_minimo' || r.estado === 'sin_programar')
    .sort((a, b) => a.diferencia - b.diferencia);

  for (const row of candidates) {
    const cells = cellsByAssociate.get(row.associateId) ?? [];
    const busy: Array<{ start: number; end: number }> = [];
    const novedadDays = new Set<number>();
    for (const c of cells) {
      if (isNovedad(c)) {
        novedadDays.add(c.day);
        continue;
      }
      const h = SHIFT_HOURS[(c.codigo ?? '').toUpperCase()];
      if (h) busy.push({ start: (c.day - 1) * 24 + h.start, end: (c.day - 1) * 24 + h.start + h.hours });
    }
    const ownPosts = new Set(row.puestos);
    const ordered = [
      ...sortedGaps.filter((g) => ownPosts.has(g.postName)),
      ...sortedGaps.filter((g) => !ownPosts.has(g.postName)),
    ];
    let horas = row.horas;
    for (const g of ordered) {
      if (horas >= row.minimo) break;
      if (taken.has(g) || novedadDays.has(g.day)) continue;
      const h = GAP_HOURS[g.shift];
      if (horas + h.hours > rules.maxHorasMes) continue;
      const start = (g.day - 1) * 24 + h.start;
      const end = start + h.hours;
      const fits = busy.every(
        (b) => end + rules.descansoMinHoras <= b.start || b.end + rules.descansoMinHoras <= start,
      );
      if (!fits) continue;
      taken.add(g);
      busy.push({ start, end });
      horas += h.hours;
      row.sugerencias.push(g);
    }
    row.sugerencias.sort((a, b) => a.day - b.day);
  }
  return taken.size;
}

export function computeAssociatesStatus(args: {
  year: number;
  month: number;
  associates: StatusAssociateInput[];
  cells: StatusCellInput[];
  /** associateId → último día trabajado (YYYY-MM-DD) hasta `cutoff`. */
  lastShift: Map<string, string>;
  /** Fecha de corte (YYYY-MM-DD): hoy, o el último día del mes si ya pasó. */
  cutoff: string;
  posts: { activos: number; conCuadro: number; rolesRequeridos: number };
  /** Huecos de cobertura en días abiertos, para sugerir quién los cubre. */
  gaps?: GapInput[];
  rules?: Partial<SchedulingRules>;
}): AssociatesStatusResult {
  const rules = { ...DEFAULT_SCHEDULING_RULES, ...args.rules };
  const daysInMonth = new Date(args.year, args.month, 0).getDate();

  const byAssociate = new Map<string, StatusCellInput[]>();
  for (const c of args.cells) {
    const list = byAssociate.get(c.associateId) ?? [];
    list.push(c);
    byAssociate.set(c.associateId, list);
  }

  const rows: AssociateLoadRow[] = args.associates.map((a) => {
    const cells = byAssociate.get(a.id) ?? [];
    const puestos = new Set<string>();
    const novedadDays = new Set<number>();
    const roles = new Set<'titular' | 'relevante'>();
    let horas = 0;
    let turnos = 0;
    for (const c of cells) {
      if (isNovedad(c)) {
        novedadDays.add(c.day);
        continue;
      }
      const h = SHIFT_HOURS[(c.codigo ?? '').toUpperCase()];
      if (!h) continue;
      horas += h.hours;
      turnos += 1;
      puestos.add(c.postName);
      roles.add(isRelevante(c.role) ? 'relevante' : 'titular');
    }
    const diasNovedad = Math.min(novedadDays.size, daysInMonth);
    const minimo = rules.novedadesReducenMinimo
      ? Math.round((rules.minHorasMes * (daysInMonth - diasNovedad)) / daysInMonth)
      : rules.minHorasMes;

    let estado: AssociateLoadStatus;
    if (turnos === 0) estado = diasNovedad > 0 ? 'con_novedad' : 'sin_programar';
    else if (horas > rules.maxHorasMes) estado = 'sobre_maximo';
    else if (horas < minimo) estado = 'bajo_minimo';
    else estado = 'en_rango';

    const ultimoTurno = args.lastShift.get(a.id) ?? null;
    return {
      associateId: a.id,
      name: a.name,
      documentNumber: a.documentNumber,
      cargo: a.cargo,
      puestos: [...puestos].sort(),
      rol: roles.size === 0 ? null : roles.size === 2 ? 'mixto' : [...roles][0],
      turnos,
      horas,
      diasNovedad,
      minimo,
      maximo: rules.maxHorasMes,
      diferencia: horas - minimo,
      cumplimiento: minimo > 0 ? Math.round((horas / minimo) * 100) : 100,
      estado,
      ultimoTurno,
      diasSinTurno: ultimoTurno ? daysBetween(ultimoTurno, args.cutoff) : null,
      sugerencias: [],
    };
  });

  const gaps = args.gaps ?? [];
  const huecosCubribles = assignGaps(rows, byAssociate, gaps, rules);

  // Peor cumplimiento primero: sin programar, luego bajo mínimo por faltante, luego sobre máximo.
  const order: Record<AssociateLoadStatus, number> = {
    sin_programar: 0,
    bajo_minimo: 1,
    sobre_maximo: 2,
    con_novedad: 3,
    en_rango: 4,
  };
  rows.sort(
    (x, y) =>
      order[x.estado] - order[y.estado] ||
      (x.estado === 'sobre_maximo' ? y.horas - x.horas : x.diferencia - y.diferencia) ||
      x.name.localeCompare(y.name),
  );

  const count = (e: AssociateLoadStatus) => rows.filter((r) => r.estado === e).length;
  const relevantes = rows.filter((r) => r.rol === 'relevante');
  const relevUnPuestoBajo = relevantes.filter(
    (r) => r.puestos.length === 1 && r.estado === 'bajo_minimo',
  ).length;

  return {
    year: args.year,
    month: args.month,
    rules,
    kpis: {
      vigilantesActivos: rows.length,
      programados: rows.filter((r) => r.turnos > 0).length,
      sinProgramar: count('sin_programar'),
      bajoMinimo: count('bajo_minimo'),
      enRango: count('en_rango'),
      sobreMaximo: count('sobre_maximo'),
      conNovedad: count('con_novedad'),
      sinUso: rows.filter(
        (r) =>
          r.estado !== 'con_novedad' &&
          (r.diasSinTurno === null || r.diasSinTurno > rules.diasSinTurnoAlerta),
      ).length,
      horasProgramadas: rows.reduce((s, r) => s + r.horas, 0),
      horasFaltantes: rows
        .filter((r) => r.estado === 'bajo_minimo')
        .reduce((s, r) => s + (r.minimo - r.horas), 0),
      huecosAbiertos: gaps.length,
      huecosCubribles,
    },
    capacidad: {
      puestosActivos: args.posts.activos,
      puestosConCuadro: args.posts.conCuadro,
      rolesRequeridos: args.posts.rolesRequeridos,
      vigilantesActivos: rows.length,
      diferencia: rows.length - args.posts.rolesRequeridos,
    },
    relevantes: {
      total: relevantes.length,
      unSoloPuesto: relevantes.filter((r) => r.puestos.length === 1).length,
      horasPromedio: relevantes.length
        ? Math.round(relevantes.reduce((s, r) => s + r.horas, 0) / relevantes.length)
        : 0,
      bajoMinimo: relevantes.filter((r) => r.estado === 'bajo_minimo').length,
      liberablesEstimado: Math.floor(relevUnPuestoBajo / 2),
    },
    rows,
  };
}
