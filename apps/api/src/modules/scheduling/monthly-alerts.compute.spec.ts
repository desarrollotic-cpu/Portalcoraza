import {
  computeMonthlyAlerts,
  groupHuecosByPost,
  isActionableAlert,
  monthsForAlertsScope,
} from './monthly-alerts.compute';

describe('monthsForAlertsScope', () => {
  it('día 19 auto sobre mes actual → solo ese mes', () => {
    expect(
      monthsForAlertsScope({
        scope: 'auto',
        year: 2026,
        month: 8,
        todayYear: 2026,
        todayMonth: 8,
        todayDay: 19,
      }),
    ).toEqual([{ year: 2026, month: 8 }]);
  });

  it('día 20 auto sobre mes actual → incluye mes siguiente', () => {
    expect(
      monthsForAlertsScope({
        scope: 'auto',
        year: 2026,
        month: 8,
        todayYear: 2026,
        todayMonth: 8,
        todayDay: 20,
      }),
    ).toEqual([
      { year: 2026, month: 8 },
      { year: 2026, month: 9 },
    ]);
  });
});

describe('computeMonthlyAlerts', () => {
  const base = { month: '2026-08', daysInMonth: 31 };

  it('hueco cuando falta D (sin day-code activo)', () => {
    const alerts = computeMonthlyAlerts({
      ...base,
      cells: [
        {
          postId: 'p1',
          postName: 'Puesto 1',
          day: 1,
          role: 'vigilante_1',
          associateId: 'a1',
          associateName: 'Ana',
          associateStatus: 'ACTIVO',
          codigo: 'N',
        },
      ],
    });
    expect(
      alerts.some((a) => a.type === 'hueco_cobertura' && a.day === 1 && a.shift === 'D'),
    ).toBe(true);
  });

  it('asociado_inactivo + no cuenta cobertura', () => {
    const alerts = computeMonthlyAlerts({
      ...base,
      cells: [
        {
          postId: 'p1',
          postName: 'Puesto 1',
          day: 2,
          role: 'vigilante_1',
          associateId: 'a1',
          associateName: 'Ana',
          associateStatus: 'VACACIONES',
          codigo: 'D',
        },
        {
          postId: 'p1',
          postName: 'Puesto 1',
          day: 2,
          role: 'vigilante_2',
          associateId: 'a2',
          associateName: 'Bob',
          associateStatus: 'ACTIVO',
          codigo: 'N',
        },
      ],
    });
    expect(alerts.some((a) => a.type === 'asociado_inactivo')).toBe(true);
    expect(
      alerts.some((a) => a.type === 'hueco_cobertura' && a.day === 2 && a.shift === 'D'),
    ).toBe(true);
  });

  it('conflicto mismo día y misma franja en dos puestos', () => {
    const alerts = computeMonthlyAlerts({
      ...base,
      cells: [
        {
          postId: 'p1',
          postName: 'Amisi',
          day: 3,
          role: 'vigilante_1',
          associateId: 'a1',
          associateName: 'Ana',
          associateStatus: 'ACTIVO',
          codigo: 'D',
        },
        {
          postId: 'p2',
          postName: 'Otro',
          day: 3,
          role: 'vigilante_1',
          associateId: 'a1',
          associateName: 'Ana',
          associateStatus: 'ACTIVO',
          codigo: 'D',
        },
      ],
    });
    const c = alerts.find((a) => a.type === 'conflicto_mismo_turno');
    expect(c?.message).toMatch(/Otro|Amisi/);
    expect(c?.otherPostName).toBeTruthy();
  });

  it('D en un puesto y N en otro el mismo día NO es conflicto', () => {
    const alerts = computeMonthlyAlerts({
      ...base,
      cells: [
        {
          postId: 'p1',
          postName: 'Amisi',
          day: 3,
          role: 'vigilante_1',
          associateId: 'a1',
          associateName: 'Ana',
          associateStatus: 'ACTIVO',
          codigo: 'D',
        },
        {
          postId: 'p2',
          postName: 'Otro',
          day: 3,
          role: 'relevante',
          associateId: 'a1',
          associateName: 'Ana',
          associateStatus: 'ACTIVO',
          codigo: 'N',
        },
      ],
    });
    expect(alerts.filter((a) => a.type === 'conflicto_mismo_turno')).toHaveLength(0);
  });

  it('carga_sobre_24 solo con D/N; D8 no suma', () => {
    const cells = [];
    for (let day = 1; day <= 24; day++) {
      cells.push({
        postId: 'p1',
        postName: 'P1',
        day,
        role: 'v1',
        associateId: 'a1',
        associateName: 'Ana',
        associateStatus: 'ACTIVO' as const,
        codigo: 'D',
      });
    }
    cells.push({
      postId: 'p2',
      postName: 'P2',
      day: 25,
      role: 'v1',
      associateId: 'a1',
      associateName: 'Ana',
      associateStatus: 'ACTIVO' as const,
      codigo: 'D',
    });
    cells.push({
      postId: 'p2',
      postName: 'P2',
      day: 26,
      role: 'v1',
      associateId: 'a1',
      associateName: 'Ana',
      associateStatus: 'ACTIVO' as const,
      codigo: 'D8',
    });
    const alerts = computeMonthlyAlerts({ ...base, cells });
    const carga = alerts.find((a) => a.type === 'carga_sobre_24' && a.associateId === 'a1');
    expect(carga).toBeTruthy();
    expect(carga?.severity).toBe('warning');
    expect(carga?.message).toMatch(/25/);
  });

  it('D9 cubre diurno (no hueco D ese día)', () => {
    const alerts = computeMonthlyAlerts({
      ...base,
      daysInMonth: 1,
      cells: [
        {
          postId: 'p1',
          postName: 'Amisi',
          day: 1,
          role: 'vigilante_1',
          associateId: 'a1',
          associateName: 'Ana',
          associateStatus: 'ACTIVO',
          codigo: 'D9',
        },
        {
          postId: 'p1',
          postName: 'Amisi',
          day: 1,
          role: 'vigilante_2',
          associateId: 'a2',
          associateName: 'Bob',
          associateStatus: 'ACTIVO',
          codigo: 'N9',
        },
      ],
    });
    expect(alerts.filter((a) => a.type === 'hueco_cobertura')).toHaveLength(0);
  });

  it('incapacidad en celda: alerta nominada + hueco a cubrir', () => {
    const alerts = computeMonthlyAlerts({
      ...base,
      daysInMonth: 1,
      cells: [
        {
          postId: 'p1',
          postName: 'Amisi',
          day: 1,
          role: 'titular_a',
          associateId: 'a1',
          associateName: 'Ana Perez',
          associateStatus: 'ACTIVO',
          codigo: 'IN',
          jornada: 'incapacidad',
          documentNumber: '123',
        },
      ],
    });
    const inact = alerts.find((a) => a.type === 'asociado_inactivo');
    expect(inact).toBeTruthy();
    expect(inact?.reason).toMatch(/incapacidad/i);
    expect(inact?.documentNumber).toBe('123');
    expect(inact?.suggestedAction).toBeTruthy();
    expect(inact?.message).toMatch(/Ana Perez/);
    expect(alerts.some((a) => a.type === 'hueco_cobertura' && a.shift === 'D')).toBe(true);
    expect(alerts.some((a) => a.type === 'hueco_cobertura' && a.shift === 'N')).toBe(true);
  });

  it('conflicto incluye cédula, los dos puestos y qué hacer', () => {
    const alerts = computeMonthlyAlerts({
      ...base,
      daysInMonth: 3,
      cells: [
        {
          postId: 'p1',
          postName: 'Amisi',
          day: 3,
          role: 'vigilante_1',
          associateId: 'a1',
          associateName: 'Ana Perez',
          associateStatus: 'ACTIVO',
          codigo: 'D',
          documentNumber: '1090',
        },
        {
          postId: 'p2',
          postName: 'Otro',
          day: 3,
          role: 'vigilante_1',
          associateId: 'a1',
          associateName: 'Ana Perez',
          associateStatus: 'ACTIVO',
          codigo: 'D',
          documentNumber: '1090',
        },
      ],
    });
    const c = alerts.find((a) => a.type === 'conflicto_mismo_turno' && a.postId === 'p1');
    expect(c?.documentNumber).toBe('1090');
    expect(c?.otherPostName).toBe('Otro');
    expect(c?.suggestedAction).toMatch(/un solo puesto/i);
    expect(c?.message).toMatch(/1090/);
    expect(c?.message).toMatch(/Amisi/);
    expect(c?.message).toMatch(/Otro/);
  });

  it('hueco trae acción sugerida', () => {
    const alerts = computeMonthlyAlerts({
      ...base,
      daysInMonth: 1,
      cells: [],
      posts: [{ postId: 'p1', postName: 'Amisi' }],
    });
    const h = alerts.find((a) => a.type === 'hueco_cobertura' && a.shift === 'D');
    expect(h?.suggestedAction).toMatch(/asignar/i);
    expect(h?.message).toMatch(/Amisi/);
  });

  it('incluye huecos de todos los puestos del catálogo aunque no tengan celdas', () => {
    const alerts = computeMonthlyAlerts({
      month: '2026-09',
      daysInMonth: 1,
      cells: [],
      posts: [
        { postId: 'a', postName: 'Amisi (549)' },
        { postId: 'b', postName: 'Otro (589)' },
      ],
    });
    const huecos = alerts.filter((a) => a.type === 'hueco_cobertura');
    expect(huecos.filter((a) => a.postId === 'a')).toHaveLength(2);
    expect(huecos.filter((a) => a.postId === 'b')).toHaveLength(2);
  });

  it('puesto D8 (solo diurno 8h) no pide noche', () => {
    const alerts = computeMonthlyAlerts({
      ...base,
      daysInMonth: 1,
      cells: [
        {
          postId: 'p1',
          postName: 'Portería 8h',
          day: 1,
          role: 'titular_a',
          associateId: 'a1',
          associateName: 'Ana',
          associateStatus: 'ACTIVO',
          codigo: 'D8',
        },
      ],
    });
    const huecos = alerts.filter((a) => a.type === 'hueco_cobertura');
    expect(huecos.some((a) => a.shift === 'N')).toBe(false);
    expect(huecos.some((a) => a.shift === 'D')).toBe(false);
  });

  it('puesto N8 (solo nocturno 8h) no pide día', () => {
    const alerts = computeMonthlyAlerts({
      ...base,
      daysInMonth: 1,
      cells: [
        {
          postId: 'p1',
          postName: 'Ronda 8h',
          day: 1,
          role: 'titular_a',
          associateId: 'a1',
          associateName: 'Ana',
          associateStatus: 'ACTIVO',
          codigo: 'N8',
        },
      ],
    });
    const huecos = alerts.filter((a) => a.type === 'hueco_cobertura');
    expect(huecos.some((a) => a.shift === 'D')).toBe(false);
    expect(huecos.some((a) => a.shift === 'N')).toBe(false);
  });

  it('D 12h sin N sigue pidiendo noche (24h)', () => {
    const alerts = computeMonthlyAlerts({
      ...base,
      daysInMonth: 1,
      cells: [
        {
          postId: 'p1',
          postName: 'Amisi',
          day: 1,
          role: 'titular_a',
          associateId: 'a1',
          associateName: 'Ana',
          associateStatus: 'ACTIVO',
          codigo: 'D',
        },
      ],
    });
    expect(
      alerts.some((a) => a.type === 'hueco_cobertura' && a.shift === 'N' && a.day === 1),
    ).toBe(true);
  });

  it('puesto sin cuadro: una sola alerta, no D y N por cada día', () => {
    const alerts = computeMonthlyAlerts({
      month: '2026-09',
      daysInMonth: 10,
      cells: [],
      posts: [{ postId: 'p9', postName: 'Navarra (732)', scheduled: false }],
    });
    const huecos = alerts.filter((a) => a.type === 'hueco_cobertura' && a.postId === 'p9');
    expect(huecos).toHaveLength(1);
    expect(huecos[0].shift).toBeUndefined();
    expect(huecos[0].day).toBeUndefined();
  });
});

describe('isActionableAlert', () => {
  const today = { year: 2026, month: 9, day: 4 };

  it('oculta huecos de días ya pasados del mes actual', () => {
    expect(
      isActionableAlert(
        {
          id: '1',
          type: 'hueco_cobertura',
          severity: 'error',
          month: '2026-09',
          day: 3,
          postId: 'p1',
          postName: 'Amisi',
          shift: 'D',
          message: 'x',
        },
        today,
      ),
    ).toBe(false);
  });

  it('deja el día de hoy y meses futuros', () => {
    expect(
      isActionableAlert(
        {
          id: '2',
          type: 'hueco_cobertura',
          severity: 'error',
          month: '2026-09',
          day: 4,
          postId: 'p1',
          postName: 'Amisi',
          shift: 'D',
          message: 'x',
        },
        today,
      ),
    ).toBe(true);
    expect(
      isActionableAlert(
        {
          id: '3',
          type: 'hueco_cobertura',
          severity: 'error',
          month: '2026-10',
          day: 1,
          postId: 'p1',
          postName: 'Amisi',
          shift: 'N',
          message: 'x',
        },
        today,
      ),
    ).toBe(true);
  });
});

describe('groupHuecosByPost', () => {
  it('agrupa por puesto y lista días D/N', () => {
    const groups = groupHuecosByPost([
      {
        id: 'a',
        type: 'hueco_cobertura',
        severity: 'error',
        month: '2026-09',
        day: 4,
        postId: 'p1',
        postName: 'Amisi',
        shift: 'D',
        message: 'x',
        suggestedAction: 'Asignar D',
      },
      {
        id: 'b',
        type: 'hueco_cobertura',
        severity: 'error',
        month: '2026-09',
        day: 5,
        postId: 'p1',
        postName: 'Amisi',
        shift: 'D',
        message: 'x',
      },
      {
        id: 'c',
        type: 'hueco_cobertura',
        severity: 'error',
        month: '2026-09',
        day: 4,
        postId: 'p1',
        postName: 'Amisi',
        shift: 'N',
        message: 'x',
      },
      {
        id: 'd',
        type: 'conflicto_mismo_turno',
        severity: 'error',
        month: '2026-09',
        day: 4,
        postId: 'p1',
        postName: 'Amisi',
        message: 'y',
      },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].postName).toBe('Amisi');
    expect(groups[0].daysD).toEqual([4, 5]);
    expect(groups[0].daysN).toEqual([4]);
    expect(groups[0].count).toBe(3);
    expect(groups[0].firstDay).toBe(4);
  });

  it('sin cuadro no inventa turnos D/N en el agrupado', () => {
    const groups = groupHuecosByPost([
      {
        id: 'h',
        type: 'hueco_cobertura',
        severity: 'error',
        month: '2026-09',
        postId: 'p9',
        postName: 'Navarra (732)',
        message: 'x',
        reason: 'sin_malla',
        suggestedAction: 'Abrir el cuadro',
      },
    ]);
    expect(groups[0].daysD).toEqual([]);
    expect(groups[0].daysN).toEqual([]);
    expect(groups[0].count).toBe(1);
    expect(groups[0].suggestedAction).toMatch(/abrir el cuadro/i);
  });

  it('marca sin_malla cuando el hueco no tiene cuadro', () => {
    const groups = groupHuecosByPost([
      {
        id: 'h',
        type: 'hueco_cobertura',
        severity: 'error',
        month: '2026-09',
        day: 4,
        postId: 'p9',
        postName: 'Navarra (732)',
        shift: 'D',
        message: 'x',
        reason: 'sin_malla',
      },
    ]);
    expect(groups[0].kind).toBe('sin_malla');
  });
});
