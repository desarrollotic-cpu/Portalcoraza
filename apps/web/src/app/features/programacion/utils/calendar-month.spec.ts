import { daysInCalendarMonth } from './calendar-month';

describe('daysInCalendarMonth', () => {
  it('muestra 31 en ene/mar/may/jul/ago/oct/dic', () => {
    for (const m of [1, 3, 5, 7, 8, 10, 12]) {
      expect(daysInCalendarMonth(2026, m)).toBe(31);
    }
  });

  it('muestra 30 en abr/jun/sep/nov', () => {
    for (const m of [4, 6, 9, 11]) {
      expect(daysInCalendarMonth(2026, m)).toBe(30);
    }
  });

  it('febrero 28 o 29 según bisiesto', () => {
    expect(daysInCalendarMonth(2026, 2)).toBe(28);
    expect(daysInCalendarMonth(2024, 2)).toBe(29);
  });
});
