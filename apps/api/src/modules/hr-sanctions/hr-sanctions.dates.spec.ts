import { addDays, endDateOf, hoyBogota } from './hr-sanctions.dates';

describe('fechas de sanciones', () => {
  it('5 días desde el 9-oct terminan el 13-oct (el 14 ya vuelve a trabajar)', () => {
    expect(endDateOf('2026-10-09', 5)).toBe('2026-10-13');
    expect(addDays(endDateOf('2026-10-09', 5), 1)).toBe('2026-10-14');
  });

  it('cruza fin de mes y año', () => {
    expect(endDateOf('2026-10-29', 5)).toBe('2026-11-02');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('un llamado de atención (0 días) dura un solo día', () => {
    expect(endDateOf('2026-10-20', 0)).toBe('2026-10-20');
  });

  it('hoy en Colombia: a las 02:00 UTC todavía es el día anterior', () => {
    expect(hoyBogota(new Date('2026-10-21T02:00:00Z'))).toBe('2026-10-20');
    expect(hoyBogota(new Date('2026-10-21T06:00:00Z'))).toBe('2026-10-21');
  });
});
