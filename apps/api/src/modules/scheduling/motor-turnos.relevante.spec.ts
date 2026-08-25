import { MotorTurnosService } from './motor-turnos.service';
import { PersonalRole } from './entities/monthly-schedule.entity';

describe('MotorTurnosService relevante gap-fill', () => {
  const motor = new MotorTurnosService();

  const personal: PersonalRole[] = [
    { rol: 'titular_a', associateId: 'a', turnoId: 'AM', displayName: 'Titular A' },
    { rol: 'titular_b', associateId: 'b', turnoId: 'PM', displayName: 'Titular B' },
    { rol: 'relevante', associateId: 'r', turnoId: 'AM', displayName: 'Relevante' },
  ];

  it('does not schedule relevante D/N on the same day a titular already covers that shift', () => {
    const rows = motor.generate(personal, 15, {
      titular_a: 0,
      titular_b: 6,
    });

    for (let day = 1; day <= 15; day++) {
      const cells = rows.filter((x) => x.day === day);
      const titularCodes = cells
        .filter((c) => c.role === 'titular_a' || c.role === 'titular_b')
        .map((c) => c.codigo);
      const rel = cells.find((c) => c.role === 'relevante');
      expect(rel).toBeDefined();
      if (rel!.codigo === 'D' || rel!.codigo === 'N' || rel!.codigo === 'D8' || rel!.codigo === 'N8') {
        expect(titularCodes).not.toContain(rel!.codigo);
        // Tampoco chocar franja: D8 vs D, N8 vs N
        if (motor.isDayCode(rel!.codigo)) {
          expect(titularCodes.some((c) => motor.isDayCode(c))).toBe(false);
        }
        if (motor.isNightCode(rel!.codigo)) {
          expect(titularCodes.some((c) => motor.isNightCode(c))).toBe(false);
        }
      }
    }
  });

  it('fills only the uncovered D/N gaps left by titulares (12x3 classic offsets)', () => {
    const rows = motor.generate(personal, 15, {
      titular_a: 0,
      titular_b: 6,
    });
    const rel = rows
      .filter((r) => r.role === 'relevante')
      .sort((a, b) => a.day - b.day)
      .map((r) => r.codigo);

    // Con A@0 y B@6: huecos D en días 7-9 y N en 13-15; el resto libre en este puesto
    expect(rel).toEqual([
      'NR', 'NR', 'NR', 'NR', 'NR', 'NR',
      'D', 'D', 'D',
      'NR', 'NR', 'NR',
      'N', 'N', 'N',
    ]);
  });
});
