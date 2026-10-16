import { MotorTurnosService, TipoCiclo } from './motor-turnos.service';
import { PersonalRole } from './entities/monthly-schedule.entity';

const roles = (n: number): PersonalRole[] =>
  Array.from({ length: n }, (_, i) => ({
    rol: `titular_${i}`,
    associateId: null,
    turnoId: 'AM',
    displayName: `Titular ${i}`,
  }));

/** Racha máxima del mismo código consecutivo en la secuencia de un rol. */
function rachaMaxima(codigos: Array<string | null>): number {
  let max = 0;
  let cur = 0;
  let prev: string | null = null;
  for (const c of codigos) {
    const trabaja = c === 'D' || c === 'N';
    if (trabaja && c === prev) cur += 1;
    else if (trabaja) {
      cur = 1;
      prev = c;
    } else {
      cur = 0;
      prev = null;
    }
    if (cur > max) max = cur;
  }
  return max;
}

describe('MotorTurnosService — continuidad entre meses', () => {
  const motor = new MotorTurnosService();

  it('encadena el mes siguiente desde la fase guardada, sin pasar de 6 días seguidos', () => {
    const personal = roles(3);
    const enero = motor.generate(personal, 31, undefined, '12x3');

    // Lo que ahora se persiste (migración 088) y consume resolveStartPositions.
    const fin = motor.endPositionsByRole(enero, 31, '12x3');
    const febrero = motor.generate(personal, 28, fin, '12x3');

    for (const role of personal) {
      const secuencia = [
        ...enero.filter((a) => a.role === role.rol).sort((a, b) => a.day - b.day),
        ...febrero.filter((a) => a.role === role.rol).sort((a, b) => a.day - b.day),
      ].map((a) => a.codigo);

      expect(rachaMaxima(secuencia)).toBeLessThanOrEqual(6);
    }
  });

  it('la fase del día 1 del mes siguiente es la del último día + 1', () => {
    const personal = roles(3);
    const enero = motor.generate(personal, 31, undefined, '12x3');
    const fin = motor.endPositionsByRole(enero, 31, '12x3');

    for (const role of personal) {
      const ultimo = enero.find((a) => a.role === role.rol && a.day === 31)!;
      expect(fin[role.rol]).toBe(motor.normalizePosition(ultimo.cyclePosition + 1, '12x3'));
    }

    const febrero = motor.generate(personal, 28, fin, '12x3');
    for (const role of personal) {
      const dia1 = febrero.find((a) => a.role === role.rol && a.day === 1)!;
      expect(dia1.cyclePosition).toBe(fin[role.rol]);
    }
  });

  it('13x2 respeta la longitud de 30 fases al encadenar (antes normalizaba mod 15)', () => {
    const personal = roles(2);
    const enero = motor.generate(personal, 31, undefined, '13x2');
    const fin = motor.endPositionsByRole(enero, 31, '13x2');

    for (const role of personal) {
      const ultimo = enero.find((a) => a.role === role.rol && a.day === 31)!;
      expect(fin[role.rol]).toBe((ultimo.cyclePosition + 1) % 30);
    }
    // Alguna fase debe caer por encima de 15: es lo que el mod 15 destruía.
    expect(Object.values(fin).some((p) => p >= 15)).toBe(true);
  });
});

describe('MotorTurnosService — desfases por defecto sin colisión', () => {
  const motor = new MotorTurnosService();

  const casos: Array<{ ciclo: TipoCiclo; len: number; roles: number }> = [
    { ciclo: '12x3', len: 15, roles: 3 },
    { ciclo: '10x5', len: 15, roles: 3 },
    { ciclo: '2x2', len: 6, roles: 3 },
    { ciclo: '13x2', len: 30, roles: 2 },
    { ciclo: '13x2', len: 30, roles: 3 },
  ];

  for (const { ciclo, len, roles: n } of casos) {
    it(`${ciclo} con ${n} roles asigna fases distintas`, () => {
      const offsets = Array.from({ length: n }, (_, i) =>
        motor.getDefaultOffset(i, ciclo, len, n),
      );
      expect(new Set(offsets).size).toBe(n);
    });
  }

  it('12x3 con 3 roles conserva los desfases probados 0 / 6 / 12', () => {
    expect([0, 1, 2].map((i) => motor.getDefaultOffset(i, '12x3', 15, 3))).toEqual([0, 6, 12]);
  });

  it('13x2 con 3 roles cubre día y noche todos los días', () => {
    const personal = roles(3);
    const mes = motor.generate(personal, 30, undefined, '13x2');
    for (let day = 1; day <= 30; day++) {
      const celdas = mes.filter((a) => a.day === day);
      expect(celdas.some((c) => motor.isDayCode(c.codigo))).toBe(true);
      expect(celdas.some((c) => motor.isNightCode(c.codigo))).toBe(true);
    }
  });
});

describe('MotorTurnosService — el tipo de rol lo fija la clave, no el rótulo', () => {
  const motor = new MotorTurnosService();

  it('clasifica por la clave que crea cada botón', () => {
    expect(motor.isRondaRole('ronda')).toBe(true);
    expect(motor.isRondaRole('ronda_2')).toBe(true);
    expect(motor.isRelevanteRole('relevante')).toBe(true);
    expect(motor.isRelevanteRole('relevante_2')).toBe(true);

    // «+ Titular» y los roles por defecto son titulares.
    for (const rol of ['titular_a', 'titular_b', 'turno_1762300000000']) {
      expect(motor.isRondaRole(rol)).toBe(false);
      expect(motor.isRelevanteRole(rol)).toBe(false);
    }
  });

  it('renombrar un rol ya no cambia su tipo', () => {
    // Antes «Apoyo portería» o «Relevante de ronda» en el rótulo convertían el
    // rol en relevante o en ronda. El rótulo ya no se mira.
    const titular: PersonalRole = {
      rol: 'titular_a',
      associateId: null,
      turnoId: 'AM',
      displayName: 'Apoyo portería',
    };
    expect(motor.isRelevanteRole(titular.rol)).toBe(false);
    expect(motor.isRondaRole(titular.rol)).toBe(false);

    // Y sigue recibiendo ciclo propio: trabaja, no queda todo el mes en NR.
    const mes = motor.generate([titular], 15, { titular_a: 0 }, '12x3');
    expect(mes.filter((a) => a.codigo === 'D' || a.codigo === 'N').length).toBe(12);
  });

  it('un segundo relevante solo tapa huecos, sin ciclo propio', () => {
    const personal: PersonalRole[] = [
      { rol: 'titular_a', associateId: null, turnoId: 'AM', displayName: 'Titular A' },
      { rol: 'titular_b', associateId: null, turnoId: 'PM', displayName: 'Titular B' },
      { rol: 'relevante', associateId: null, turnoId: 'AM', displayName: 'Relevante' },
      { rol: 'relevante_2', associateId: null, turnoId: 'AM', displayName: 'Relevante 2' },
    ];
    const mes = motor.generate(personal, 15, { titular_a: 0, titular_b: 6 }, '12x3');

    for (const rol of ['relevante', 'relevante_2']) {
      const celdas = mes.filter((a) => a.role === rol);
      expect(celdas).toHaveLength(15);
      // Sin ciclo propio: la fase es -1 en todas.
      expect(celdas.every((c) => c.cyclePosition === -1)).toBe(true);
    }

    // Cobertura completa los 15 días.
    for (let day = 1; day <= 15; day++) {
      const celdas = mes.filter((a) => a.day === day);
      expect(celdas.some((c) => motor.isDayCode(c.codigo))).toBe(true);
      expect(celdas.some((c) => motor.isNightCode(c.codigo))).toBe(true);
    }
  });
});
