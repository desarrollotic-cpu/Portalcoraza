import { prorrogaElapsedDays, prorrogaReached180 } from './prorroga-180';

describe('prórroga 180 días', () => {
  const row = (over: Partial<{ isExtension: boolean; startDate: string; endDate: string }> = {}) => ({
    isExtension: true,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    ...over,
  });

  it('el 28 jun 2026 van 179 días y aún no marca', () => {
    const today = new Date(2026, 5, 28);
    expect(prorrogaElapsedDays('2026-01-01', '2026-12-31', today)).toBe(179);
    expect(prorrogaReached180(row(), today)).toBe(false);
  });

  it('el 29 jun 2026 cumple 180 y queda marcada', () => {
    const today = new Date(2026, 5, 29);
    expect(prorrogaElapsedDays('2026-01-01', '2026-12-31', today)).toBe(180);
    expect(prorrogaReached180(row(), today)).toBe(true);
  });

  it('si ya terminó y el periodo pasó de 180, sigue marcada', () => {
    expect(prorrogaReached180(row({ endDate: '2026-07-15' }), new Date(2026, 9, 5))).toBe(true);
  });

  it('una prórroga corta no se marca aunque hoy sea después', () => {
    expect(
      prorrogaReached180(row({ endDate: '2026-03-01' }), new Date(2026, 9, 5)),
    ).toBe(false);
  });

  it('sin la casilla de prórroga no marca, aunque el rango sea largo', () => {
    expect(
      prorrogaReached180(row({ isExtension: false }), new Date(2026, 9, 5)),
    ).toBe(false);
  });
});
