import { guardMetrics, hoursBetween, workShift } from './schedule-metrics';

describe('schedule-metrics', () => {
  it('N10 cuenta como noche de 10h, no deja el resumen en 0', () => {
    const m = guardMetrics([
      { codigo: 'DR' },
      { codigo: 'N10', inicio: '20:00', fin: '06:00' },
      { codigo: 'NR' },
    ]);
    expect(m).toEqual({ dias: 1, turnosD: 0, turnosN: 1, totalHoras: 10 });
  });

  it('D y N 12h; DR no suma día trabajado', () => {
    const m = guardMetrics([{ codigo: 'D' }, { codigo: 'N' }, { codigo: 'DR' }, { codigo: 'VAC' }]);
    expect(m).toEqual({ dias: 2, turnosD: 1, turnosN: 1, totalHoras: 24 });
  });

  it('D8/N8 y D12', () => {
    const m = guardMetrics([{ codigo: 'D8' }, { codigo: 'N8' }, { codigo: 'D12' }]);
    expect(m).toEqual({ dias: 3, turnosD: 2, turnosN: 1, totalHoras: 28 });
  });

  it('hoursBetween cruza medianoche', () => {
    expect(hoursBetween('20:00', '06:00')).toBe(10);
    expect(hoursBetween('06:00', '18:00')).toBe(12);
  });

  it('DR no es turno de día aunque empiece por D', () => {
    expect(workShift('DR')).toBeNull();
  });
});
