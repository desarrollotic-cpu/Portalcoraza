import { BadRequestException } from '@nestjs/common';
import { MonthlySchedulingService } from './monthly-scheduling.service';
import { MotorTurnosService } from './motor-turnos.service';

type Row = { day: number; role: string; codigo: string | null; associateId: string | null };

function setup(opts: { locked: number; assignments?: Row[] }) {
  const service = Object.create(MonthlySchedulingService.prototype) as MonthlySchedulingService;

  const update = jest.fn().mockResolvedValue(undefined);
  (service as unknown as { schedulesRepo: { update: jest.Mock } }).schedulesRepo = { update };

  jest.spyOn(service as never, 'getById' as never).mockResolvedValue({
    id: 'sched-1',
    tenantId: 'tenant-1',
    postId: 'post-1',
    year: 2026,
    month: 8,
    personal: [{ rol: 'titular_a', associateId: null, turnoId: 'AM' }],
    assignments: opts.assignments ?? [],
  } as never);
  // Fecha fija: el test no depende del día en que se corra.
  jest.spyOn(service as never, 'lockedUntilDay' as never).mockReturnValue(opts.locked as never);
  jest.spyOn(service as never, 'resolveStartPositions' as never).mockResolvedValue({
    titular_a: 0,
    titular_b: 0,
    relevante: 0,
  } as never);

  const generate = jest.fn().mockReturnValue(
    [1, 2, 3].flatMap((day) => [
      { day, role: 'titular_a', associateId: null, turno: 'AM', jornada: 'normal', codigo: 'D', inicio: null, fin: null },
      { day, role: 'titular_b', associateId: null, turno: 'PM', jornada: 'normal', codigo: 'N', inicio: null, fin: null },
    ]),
  );
  (service as unknown as { motor: Partial<MotorTurnosService> }).motor = {
    generate,
    validateBoard: jest.fn().mockReturnValue([]),
  };

  const saved: Row[] = [];
  // Las filas de rol (`monthly_schedule_roles`, migración 093) se guardan por el
  // mismo manager que las celdas; se separan por la forma de la fila.
  const savedRoles: Array<{ rol: string; orden: number }> = [];
  (service as unknown as { dataSource: { transaction: jest.Mock } }).dataSource = {
    transaction: jest.fn(async (fn: (m: unknown) => Promise<void>) => {
      await fn({
        delete: jest.fn(),
        create: jest.fn((_e: unknown, row: unknown) => row),
        save: jest.fn(async (rows: unknown) => {
          for (const row of Array.isArray(rows) ? rows : [rows]) {
            if (row && typeof row === 'object' && 'rol' in row) {
              savedRoles.push(row as { rol: string; orden: number });
            } else {
              saved.push(row as Row);
            }
          }
        }),
        update: jest.fn(),
      });
    }),
  };
  (service as unknown as { auditService: { log: jest.Mock } }).auditService = { log: jest.fn() };
  (service as unknown as { reportCache: Map<string, unknown> }).reportCache = new Map();

  return { service, update, generate, saved, savedRoles };
}

describe('MonthlySchedulingService.generateWithMotor', () => {
  it('graba dto.personal antes de generar, para no perder los roles que agrego la UI', async () => {
    const { service, generate, savedRoles } = setup({ locked: 0 });
    const personal = [
      { rol: 'titular_a', associateId: null, turnoId: 'AM', displayName: 'Titular A' },
      { rol: 'titular_b', associateId: null, turnoId: 'PM', displayName: 'Titular B' },
      { rol: 'relevante', associateId: null, turnoId: 'AM', displayName: 'Relevante' },
    ];

    await service.generateWithMotor('sched-1', { tipoCiclo: '12x3', personal }, 'user-1');

    // Antes se grababa en el JSONB `monthly_schedules.personal`; desde la
    // migración 093 son filas de `monthly_schedule_roles`, con su orden.
    expect(savedRoles.map((r) => r.rol)).toEqual(['titular_a', 'titular_b', 'relevante']);
    expect(savedRoles.map((r) => r.orden)).toEqual([0, 1, 2]);
    expect(generate).toHaveBeenCalledWith(personal, 31, expect.anything(), '12x3');
  });

  it('no regenera un mes que ya pasó', async () => {
    const { service } = setup({ locked: 31 });
    await expect(service.generateWithMotor('sched-1', { tipoCiclo: '12x3' }, 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('conserva los días ya trabajados y regenera solo los abiertos', async () => {
    const { service, saved } = setup({
      locked: 1,
      assignments: [
        { day: 1, role: 'titular_a', codigo: 'IN', associateId: 'a1' },
        { day: 2, role: 'titular_a', codigo: 'N', associateId: 'a1' },
      ],
    });

    await service.generateWithMotor('sched-1', { tipoCiclo: '12x3' }, 'user-1');

    const day1 = saved.filter((r) => r.day === 1);
    expect(day1).toEqual([expect.objectContaining({ role: 'titular_a', codigo: 'IN' })]);
    expect(saved.find((r) => r.day === 2 && r.role === 'titular_a')?.codigo).toBe('D');
  });

  it('con roles filtrados no borra las celdas de los demás roles', async () => {
    const { service, saved } = setup({
      locked: 0,
      assignments: [{ day: 2, role: 'relevante', codigo: 'D', associateId: 'r1' }],
    });

    await service.generateWithMotor('sched-1', { tipoCiclo: '12x3', roles: ['titular_a'] }, 'user-1');

    expect(saved).toContainEqual(expect.objectContaining({ day: 2, role: 'relevante', associateId: 'r1' }));
  });
});
