import { MonthlySchedulingService } from './monthly-scheduling.service';
import { MotorTurnosService } from './motor-turnos.service';

describe('MonthlySchedulingService.generateWithMotor', () => {
  it('persists dto.personal before generating so UI-added roles are not dropped', async () => {
    const service = Object.create(
      MonthlySchedulingService.prototype,
    ) as MonthlySchedulingService;

    const update = jest.fn().mockResolvedValue(undefined);
    (service as unknown as { schedulesRepo: { update: jest.Mock } }).schedulesRepo = {
      update,
    };

    jest.spyOn(service as never, 'getById' as never).mockResolvedValue({
      id: 'sched-1',
      postId: 'post-1',
      year: 2026,
      month: 8,
      personal: [{ rol: 'titular_a', associateId: null, turnoId: 'AM' }],
      assignments: [],
    } as never);

    jest.spyOn(service as never, 'resolveStartPositions' as never).mockResolvedValue({
      titular_a: 0,
      titular_b: 0,
      relevante: 0,
    } as never);

    const generate = jest.fn().mockReturnValue([
      { day: 1, role: 'titular_a', associateId: null, turno: 'AM', jornada: 'normal', codigo: 'D', inicio: null, fin: null },
      { day: 1, role: 'titular_b', associateId: null, turno: 'PM', jornada: 'normal', codigo: 'N', inicio: null, fin: null },
      { day: 1, role: 'relevante', associateId: null, turno: 'AM', jornada: 'normal', codigo: 'D', inicio: null, fin: null },
    ]);
    (service as unknown as { motor: Partial<MotorTurnosService> }).motor = {
      generate,
      validateBoard: jest.fn().mockReturnValue([]),
    };

    (service as unknown as { dataSource: { transaction: jest.Mock } }).dataSource = {
      transaction: jest.fn(async (fn: (m: unknown) => Promise<void>) => {
        await fn({
          delete: jest.fn(),
          create: jest.fn((_e: unknown, row: unknown) => row),
          save: jest.fn(),
          update: jest.fn(),
        });
      }),
    };

    (service as unknown as { auditService: { log: jest.Mock } }).auditService = {
      log: jest.fn(),
    };

    (service as unknown as { reportCache: Map<string, unknown> }).reportCache = new Map();

    const personal = [
      { rol: 'titular_a', associateId: null, turnoId: 'AM', displayName: 'Titular A' },
      { rol: 'titular_b', associateId: null, turnoId: 'PM', displayName: 'Titular B' },
      { rol: 'relevante', associateId: null, turnoId: 'AM', displayName: 'Relevante' },
    ];

    await service.generateWithMotor('sched-1', { tipoCiclo: '12x3', personal }, 'user-1');

    expect(update).toHaveBeenCalledWith(
      'sched-1',
      expect.objectContaining({ personal, updatedBy: 'user-1' }),
    );
    expect(generate).toHaveBeenCalledWith(
      personal,
      31,
      expect.anything(),
      '12x3',
    );
  });
});
