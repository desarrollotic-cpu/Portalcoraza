import {
  computeMonthlyAlerts,
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
});
