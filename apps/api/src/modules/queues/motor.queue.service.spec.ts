import { motorDedupeKey } from './motor.constants';

describe('motorDedupeKey', () => {
  it('incluye tenant año mes ciclo', () => {
    expect(
      motorDedupeKey('11111111-1111-1111-1111-111111111111', 2026, 8, '12x3'),
    ).toBe('motor_11111111-1111-1111-1111-111111111111_2026_8_12x3');
  });
});
