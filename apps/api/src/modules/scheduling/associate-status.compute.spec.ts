import { StatusCellInput, computeAssociatesStatus } from './associate-status.compute';

const assoc = (id: string) => ({ id, name: id.toUpperCase(), documentNumber: null, cargo: 'VIGILANTE' });

const cell = (
  associateId: string,
  day: number,
  codigo: string,
  postId = 'p1',
  role = 'titular_a',
): StatusCellInput => ({ associateId, postId, postName: postId.toUpperCase(), day, role, codigo });

const run = (cells: StatusCellInput[], ids = ['a1'], lastShift = new Map<string, string>()) =>
  computeAssociatesStatus({
    year: 2026,
    month: 9, // 30 días
    associates: ids.map(assoc),
    cells,
    lastShift,
    cutoff: '2026-09-28',
    posts: { activos: 2, conCuadro: 2, rolesRequeridos: 6 },
  });

/** Ciclo 12x3: 6D → 6N → 3 descanso. */
function cycle(associateId: string, offset: number, postId = 'p1', role = 'titular_a') {
  const out: StatusCellInput[] = [];
  for (let day = 1; day <= 30; day++) {
    const pos = (day - 1 + offset) % 15;
    if (pos < 6) out.push(cell(associateId, day, 'D', postId, role));
    else if (pos < 12) out.push(cell(associateId, day, 'N', postId, role));
  }
  return out;
}

describe('computeAssociatesStatus', () => {
  it('titular 12x3 en mes de 30 días: 288 h en rango', () => {
    const r = run(cycle('a1', 0)).rows[0];
    expect(r.turnos).toBe(24);
    expect(r.horas).toBe(288);
    expect(r.estado).toBe('en_rango');
    expect(r.rol).toBe('titular');
  });

  it('relevante de un solo puesto (12 turnos) queda bajo el mínimo', () => {
    const cells: StatusCellInput[] = [];
    for (let day = 1; day <= 12; day++) cells.push(cell('a1', day * 2, 'D', 'p1', 'relevante'));
    const res = run(cells);
    const r = res.rows[0];
    expect(r.horas).toBe(144);
    expect(r.estado).toBe('bajo_minimo');
    expect(r.diferencia).toBe(144 - 210);
    expect(res.relevantes).toMatchObject({ total: 1, unSoloPuesto: 1, bajoMinimo: 1 });
    expect(res.kpis.horasFaltantes).toBe(66);
  });

  it('relevante que cubre 2 puestos suma horas de ambos', () => {
    const cells: StatusCellInput[] = [];
    for (let day = 1; day <= 9; day++) cells.push(cell('a1', day, 'D', 'p1', 'relevante'));
    for (let day = 11; day <= 19; day++) cells.push(cell('a1', day, 'N', 'p2', 'relevante'));
    const r = run(cells).rows[0];
    expect(r.horas).toBe(216);
    expect(r.puestos).toEqual(['P1', 'P2']);
    expect(r.estado).toBe('en_rango');
  });

  it('vacaciones bajan el mínimo en proporción', () => {
    const cells: StatusCellInput[] = [];
    for (let day = 1; day <= 15; day++) cells.push(cell('a1', day, 'VAC'));
    for (let day = 16; day <= 24; day++) cells.push(cell('a1', day, 'D'));
    const r = run(cells).rows[0];
    expect(r.diasNovedad).toBe(15);
    expect(r.minimo).toBe(105);
    expect(r.horas).toBe(108);
    expect(r.estado).toBe('en_rango');
  });

  it('D8 y N10 suman sus horas reales', () => {
    const r = run([cell('a1', 1, 'D8'), cell('a1', 3, 'N10')]).rows[0];
    expect(r.horas).toBe(18);
  });

  it('sobre el máximo', () => {
    const cells: StatusCellInput[] = [];
    for (let day = 1; day <= 25; day++) cells.push(cell('a1', day, 'D'));
    expect(run(cells).rows[0].estado).toBe('sobre_maximo');
  });

  it('activo sin turnos = sin programar; solo novedad = con novedad', () => {
    const res = run([cell('a2', 1, 'IN')], ['a1', 'a2']);
    const byId = new Map(res.rows.map((r) => [r.associateId, r]));
    expect(byId.get('a1')?.estado).toBe('sin_programar');
    expect(byId.get('a2')?.estado).toBe('con_novedad');
    expect(res.rows[0].associateId).toBe('a1');
  });

  it('días sin turno y KPI sin uso', () => {
    const res = run([], ['a1', 'a2', 'a3'], new Map([
      ['a1', '2026-09-25'],
      ['a2', '2026-08-01'],
    ]));
    const byId = new Map(res.rows.map((r) => [r.associateId, r]));
    expect(byId.get('a1')?.diasSinTurno).toBe(3);
    expect(byId.get('a2')?.diasSinTurno).toBe(58);
    expect(byId.get('a3')?.diasSinTurno).toBeNull();
    expect(res.kpis.sinUso).toBe(2);
  });

  describe('sugerencias de huecos', () => {
    const gap = (day: number, shift: 'D' | 'N', postId = 'p9') => ({
      postId,
      postName: postId.toUpperCase(),
      day,
      shift,
    });
    const withGaps = (cells: StatusCellInput[], gaps: ReturnType<typeof gap>[], ids = ['a1']) =>
      computeAssociatesStatus({
        year: 2026,
        month: 9,
        associates: ids.map(assoc),
        cells,
        lastShift: new Map(),
        cutoff: '2026-09-28',
        posts: { activos: 1, conCuadro: 1, rolesRequeridos: 3 },
        gaps,
      });

    it('no sugiere un hueco pegado a un turno propio (sin descanso)', () => {
      // Tiene D el día 5 (06–18); el hueco N del día 5 (18–06) queda pegado.
      const res = withGaps([cell('a1', 5, 'D')], [gap(5, 'N'), gap(7, 'N')]);
      expect(res.rows[0].sugerencias).toEqual([gap(7, 'N')]);
    });

    it('no sugiere días con novedad', () => {
      const res = withGaps([cell('a1', 1, 'D'), cell('a1', 3, 'VAC')], [gap(3, 'D'), gap(4, 'D')]);
      expect(res.rows[0].sugerencias.map((s) => s.day)).toEqual([4]);
    });

    it('para cuando llega al mínimo y cada hueco va a una sola persona', () => {
      const cells: StatusCellInput[] = [];
      for (let day = 1; day <= 16; day++) cells.push(cell('a1', day, 'D8')); // 128 h
      const gaps = [gap(20, 'D'), gap(22, 'D'), gap(24, 'D'), gap(26, 'D'), gap(28, 'D'), gap(30, 'D'), gap(29, 'N'), gap(27, 'N')];
      const res = withGaps(cells, gaps, ['a1', 'a2']);
      const byId = new Map(res.rows.map((r) => [r.associateId, r]));
      // a2 (sin programar, más faltante) elige primero; a1 completa con lo que queda.
      const a1 = byId.get('a1')!;
      const a2 = byId.get('a2')!;
      expect(a2.sugerencias.length).toBeGreaterThan(0);
      const all = [...a1.sugerencias, ...a2.sugerencias].map((s) => `${s.day}${s.shift}`);
      expect(new Set(all).size).toBe(all.length);
      expect(res.kpis.huecosCubribles).toBe(all.length);
      expect(res.kpis.huecosAbiertos).toBe(8);
    });

    it('no sugiere si pasaría el máximo', () => {
      const cells: StatusCellInput[] = [];
      for (let day = 1; day <= 17; day++) cells.push(cell('a1', day, 'D')); // 204 h, bajo 210
      const res = computeAssociatesStatus({
        year: 2026,
        month: 9,
        associates: [assoc('a1')],
        cells,
        lastShift: new Map(),
        cutoff: '2026-09-28',
        posts: { activos: 1, conCuadro: 1, rolesRequeridos: 3 },
        gaps: [gap(25, 'D')],
        rules: { maxHorasMes: 210 },
      });
      expect(res.rows[0].sugerencias).toEqual([]);
    });
  });

  it('capacidad: vigilantes activos contra roles requeridos', () => {
    const res = run([], ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8']);
    expect(res.capacidad).toMatchObject({ rolesRequeridos: 6, vigilantesActivos: 8, diferencia: 2 });
  });
});
